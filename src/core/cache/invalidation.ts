import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Logger } from '../logging/logger';

/** Carried by every cached CDA fetch: revalidating it revalidates the whole Site. */
export const GLOBAL_TAG = 'dato';

export type CacheInvalidationOptions = {
  logger: Logger;
  /** Marks a tag stale so the next visit regenerates it; Next.js's `revalidateTag`. */
  revalidateTag: (tag: string, profile: 'max') => void;
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

export function createCacheInvalidation({ logger, revalidateTag }: CacheInvalidationOptions): CacheInvalidation {
  const secret = () => process.env.CACHE_WEBHOOK_SECRET ?? '';

  async function revalidateEverything(request: Request, isAuthorized: (body: string) => boolean) {
    const body = await request.text();
    if (!secret() || !isAuthorized(body)) {
      logger.log({
        severity: 'warning',
        message: 'Cache invalidation request rejected',
        context: { path: new URL(request.url).pathname },
      });
      return new Response('Unauthorized', { status: 401 });
    }
    try {
      revalidateTag(GLOBAL_TAG, 'max');
    } catch (error) {
      logger.log({ severity: 'error', message: 'Cache invalidation failed', context: { error } });
      return new Response('Revalidation failed', { status: 500 });
    }
    return new Response('OK');
  }

  return {
    handleCacheTagsWebhook: (request) =>
      revalidateEverything(request, () => hasBearerSecret(request, secret())),
    handleCacheFlush: (request) =>
      revalidateEverything(
        request,
        (body) => hasBearerSecret(request, secret()) || hasNetlifySignature(request, body, secret()),
      ),
  };
}
