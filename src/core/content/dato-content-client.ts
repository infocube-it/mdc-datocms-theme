import 'server-only';
import { executeQuery } from '@datocms/cda-client';
import { draftMode } from 'next/headers';
import type { ContentClient } from './content-client';

export type DatoContentClientOptions = {
  /** Whether the current request is in draft mode. Defaults to Next.js draft mode. */
  draftMode?: () => Promise<boolean>;
  /** Sends the query. Replaced in tests. */
  execute?: typeof executeQuery;
};

/**
 * Content client backed by the DatoCMS Content Delivery API, reading the
 * project's primary environment. It reads published content, or the latest
 * drafts, never cached, in draft mode.
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
        includeDrafts,
        fetchFn: includeDrafts
          ? (input, init) => fetch(input, { ...init, cache: 'no-store' })
          : undefined,
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
