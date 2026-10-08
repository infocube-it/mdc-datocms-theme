import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Logger } from '../logging/logger';
import type { IndexStore } from './index-store';

/** Carried by every cached CDA fetch: revalidating it revalidates the whole Site. */
export const GLOBAL_TAG = 'dato';

/** Carried by the cached fetches of one query (`granular` mode). */
export const queryTag = (queryId: string) => `dato:q:${queryId}`;

/**
 * Above this many matching queries a publish revalidates the global tag
 * instead: one tag is cheaper to purge than hundreds, and a bulk publish
 * touches most of the Site anyway.
 */
export const MAX_QUERY_TAGS = 200;

/** How long after an invalidation the CDN is purged again. */
const DELAYED_PURGE_MS = 5_000;

export type CacheInvalidationOptions = {
  logger: Logger;
  /** Marks a tag stale so the next visit regenerates it; Next.js's `revalidateTag`. */
  revalidateTag: (tag: string, profile: 'max') => void;
  /**
   * Purges tags from the CDN; Netlify's `purgeCache`. The Netlify runtime
   * already purges on `revalidateTag`, but silently drops rate-limited
   * purges: this repeats them.
   */
  purgeCdn: (tags: string[]) => Promise<void>;
  /** Runs work after the response is sent; Next.js's `after`. */
  after: (task: () => Promise<void>) => void;
  /** The query index, in `granular` invalidation mode. Without it, every publish revalidates the global tag. */
  indexStore?: IndexStore;
};

export type CacheInvalidation = {
  /** The webhook DatoCMS calls with `cda_cache_tags` after a publish. */
  handleCacheTagsWebhook(request: Request): Promise<Response>;
  /** Revalidates everything: called after a code deploy or a deploy rollback. */
  handleCacheFlush(request: Request): Promise<Response>;
};

const digest = (value: string) => createHash('sha256').update(value).digest();
const sameString = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/** A Site without a secret rejects every request. */
function hasBearerSecret(request: Request, secret: string): boolean {
  const match = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '');
  return match !== null && sameString(match[1], secret);
}

/**
 * Netlify signs its deploy notifications with a JWS (HS256, key = the secret
 * set on the notification) in `X-Webhook-Signature`. Its payload names Netlify
 * as issuer and carries the SHA-256 of the request body.
 */
function hasNetlifySignature(request: Request, body: string, secret: string): boolean {
  const parts = request.headers.get('x-webhook-signature')?.split('.');
  if (parts?.length !== 3) return false;
  const [header, payload, signature] = parts;
  try {
    const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return (
      JSON.parse(Buffer.from(header, 'base64url').toString()).alg === 'HS256' &&
      sameString(signature, expected) &&
      claims.iss === 'netlify' &&
      typeof claims.sha256 === 'string' &&
      sameString(claims.sha256, createHash('sha256').update(body).digest('hex'))
    );
  } catch {
    return false;
  }
}

export function createCacheInvalidation({
  logger,
  revalidateTag,
  purgeCdn,
  after,
  indexStore,
}: CacheInvalidationOptions): CacheInvalidation {
  const secret = () => process.env.CACHE_WEBHOOK_SECRET ?? '';

  /** The body when the request carries the secret, or `null` (logged) when it doesn't. */
  async function authorizedBody(request: Request, isAuthorized: (body: string) => boolean) {
    const body = await request.text();
    if (secret() && isAuthorized(body)) return body;
    logger.log({
      severity: 'warning',
      message: 'Cache invalidation request rejected',
      context: { path: new URL(request.url).pathname },
    });
    return null;
  }

  function revalidate(tags: string[]): Response {
    try {
      for (const tag of tags) revalidateTag(tag, 'max');
    } catch (error) {
      logger.log({ severity: 'error', message: 'Cache invalidation failed', context: { error } });
      return new Response('Revalidation failed', { status: 500 });
    }
    if (tags.length > 0) after(() => purgeLater(tags));
    return new Response('OK');
  }

  async function purgeLater(tags: string[]) {
    for (let attempt = 1; ; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, DELAYED_PURGE_MS));
      try {
        return await purgeCdn(tags);
      } catch (error) {
        if (attempt === 2) {
          logger.log({ severity: 'warning', message: 'Delayed CDN purge failed', context: { tags, error } });
          return;
        }
      }
    }
  }

  /** The tags to revalidate for a publish: those of the matching queries, or the global tag. */
  async function tagsFor(body: string): Promise<string[]> {
    if (!indexStore) return [GLOBAL_TAG];
    const cacheTags = cacheTagsIn(body);
    if (!cacheTags) {
      logger.log({ severity: 'warning', message: 'Cache tags webhook names no tags: revalidating everything' });
      return [GLOBAL_TAG];
    }
    let queryIds: string[];
    try {
      queryIds = await indexStore.queryIdsFor(cacheTags);
    } catch (error) {
      logger.log({
        severity: 'warning',
        message: 'Cache index lookup failed: revalidating everything',
        context: { error },
      });
      return [GLOBAL_TAG];
    }
    if (queryIds.length > MAX_QUERY_TAGS) {
      logger.log({
        severity: 'info',
        message: 'Too many queries to revalidate one by one: revalidating everything',
        context: { matches: queryIds.length },
      });
      return [GLOBAL_TAG];
    }
    return queryIds.map(queryTag);
  }

  return {
    async handleCacheTagsWebhook(request) {
      const body = await authorizedBody(request, () => hasBearerSecret(request, secret()));
      if (body === null) return new Response('Unauthorized', { status: 401 });
      return revalidate(await tagsFor(body));
    },
    async handleCacheFlush(request) {
      const body = await authorizedBody(
        request,
        (body) => hasBearerSecret(request, secret()) || hasNetlifySignature(request, body, secret()),
      );
      if (body === null) return new Response('Unauthorized', { status: 401 });
      // Netlify notifies every deploy, previews included, to the URL set on
      // the notification: a preview's content never reaches this Site.
      if (deployContextIn(body) === 'deploy-preview') return new Response('Ignored');
      // Wiped before revalidating: an entry recorded in between belongs to a
      // page the revalidation then marks stale, so none is lost.
      let wiped = true;
      try {
        await indexStore?.wipe();
      } catch (error) {
        wiped = false;
        logger.log({ severity: 'error', message: 'Cache index wipe failed', context: { error } });
      }
      const response = revalidate([GLOBAL_TAG]);
      return wiped ? response : new Response('Index wipe failed', { status: 500 });
    },
  };
}

/** The deploy context named in a Netlify deploy notification body, if any. */
function deployContextIn(body: string): unknown {
  try {
    return JSON.parse(body)?.context;
  } catch {
    return undefined;
  }
}

/** The DatoCMS cache tags in a `cda_cache_tags` webhook body, or `null` for any other body. */
function cacheTagsIn(body: string): string[] | null {
  try {
    const tags = JSON.parse(body)?.entity?.attributes?.tags;
    return Array.isArray(tags) && tags.every((tag) => typeof tag === 'string') ? tags : null;
  } catch {
    return null;
  }
}
