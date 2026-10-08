import 'server-only';
import { createHash } from 'node:crypto';
import { executeQuery } from '@datocms/cda-client';
import { draftMode } from 'next/headers';
import type { IndexStore } from '../cache/index-store';
import { GLOBAL_TAG, queryTag } from '../cache/invalidation';
import type { ContentClient } from './content-client';

export type DatoContentClientOptions = {
  /** Whether the current request is in draft mode. Defaults to Next.js draft mode. */
  draftMode?: () => Promise<boolean>;
  /** Sends the query. Replaced in tests. */
  execute?: typeof executeQuery;
  /**
   * In `granular` invalidation mode, where the DatoCMS cache tags of each
   * published read are recorded.
   */
  indexStore?: IndexStore;
};

/**
 * Content client backed by the DatoCMS Content Delivery API. It reads the
 * environment named by `DATOCMS_ENVIRONMENT`, or primary when unset, and
 * published content, cached under the global tag until a webhook revalidates
 * it, or the latest drafts, never cached, in draft mode. With an index store
 * (`granular` mode), each published read is also tagged with its query ID
 * and the cache tags DatoCMS returns are recorded against it.
 *
 * `excludeInvalid` narrows the generated types: fields with a Required
 * validation are non-null, so `schema.graphql` must be downloaded with the
 * same header.
 */
export function createDatoContentClient({
  draftMode: isDraftMode = isNextDraftMode,
  execute = executeQuery,
  indexStore,
}: DatoContentClientOptions = {}): ContentClient {
  const cachedFetch: typeof fetch = indexStore
    ? async (input, init) => {
        // The body holds the query and its variables: the same read always gets
        // the same ID. The environment keeps reads of different environments
        // apart, since a CDN purge reaches every deploy.
        const queryId = createHash('sha1')
          .update(`${process.env.DATOCMS_ENVIRONMENT || ''}\n${String(init?.body ?? '')}`)
          .digest('hex');
        const response = await fetch(input, {
          ...init,
          cache: 'force-cache',
          next: { tags: [GLOBAL_TAG, queryTag(queryId)] },
        });
        // Present on data cache hits too. A failed write fails the render, so
        // no page is cached without its entries in the index.
        const cacheTags = response.headers.get('x-cache-tags')?.split(' ').filter(Boolean) ?? [];
        await indexStore.insert(cacheTags.map((cacheTag) => ({ cacheTag, queryId })));
        return response;
      }
    : (input, init) => fetch(input, { ...init, cache: 'force-cache', next: { tags: [GLOBAL_TAG] } });

  return {
    async query(query, variables) {
      const includeDrafts = await isDraftMode().catch(() => false);
      return execute(query, {
        variables,
        excludeInvalid: true,
        token: requiredEnv('DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN'),
        // Written out in full so Next.js can inline it at build time: Netlify
        // keeps `netlify.toml` variables out of the runtime.
        environment: process.env.DATOCMS_ENVIRONMENT || undefined,
        includeDrafts,
        returnCacheTags: indexStore !== undefined && !includeDrafts,
        fetchFn: includeDrafts
          ? (input, init) => fetch(input, { ...init, cache: 'no-store' })
          : cachedFetch,
      });
    },
  };
}

/** Outside a request (e.g. at build time) there is no draft mode: it throws. */
async function isNextDraftMode() {
  return (await draftMode()).isEnabled;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
