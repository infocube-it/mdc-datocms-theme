import 'server-only';
import { executeQuery } from '@datocms/cda-client';
import { draftMode } from 'next/headers';
import { GLOBAL_TAG } from '../cache/invalidation';
import type { ContentClient } from './content-client';

export type DatoContentClientOptions = {
  /** Whether the current request is in draft mode. Defaults to Next.js draft mode. */
  draftMode?: () => Promise<boolean>;
  /** Sends the query. Replaced in tests. */
  execute?: typeof executeQuery;
};

/**
 * Content client backed by the DatoCMS Content Delivery API. It reads the
 * environment named by `DATOCMS_ENVIRONMENT`, or primary when unset, and
 * published content, cached under the global tag until a webhook revalidates
 * it, or the latest drafts, never cached, in draft mode.
 *
 * `excludeInvalid` narrows the generated types: fields with a Required
 * validation are non-null, so `schema.graphql` must be downloaded with the
 * same header.
 */
export function createDatoContentClient({
  draftMode: isDraftMode = isNextDraftMode,
  execute = executeQuery,
}: DatoContentClientOptions = {}): ContentClient {
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
        fetchFn: includeDrafts
          ? (input, init) => fetch(input, { ...init, cache: 'no-store' })
          : (input, init) =>
              fetch(input, { ...init, cache: 'force-cache', next: { tags: [GLOBAL_TAG] } }),
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
