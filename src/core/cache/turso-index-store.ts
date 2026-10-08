import type { Client, InValue } from '@libsql/client';
import { createClient } from '@libsql/client/web';
import type { IndexStore } from './index-store';

/** Rows per statement: well below SQLite's limit on bound parameters. */
const CHUNK = 400;

export type TursoIndexStoreOptions = {
  /** A libSQL client: Turso in production, a local file in tests. */
  client: Client;
  /** The DatoCMS environment whose index this store holds. */
  environment: string;
};

/**
 * Index store backed by Turso (libSQL). Every environment's index lives in
 * the same table, keyed by environment. The table is created on first use.
 */
export function createTursoIndexStore({ client, environment }: TursoIndexStoreOptions): IndexStore {
  let ready: Promise<unknown> | undefined;
  const table = () =>
    (ready ??= client
      .execute(
        `CREATE TABLE IF NOT EXISTS cache_tag_index (
          environment TEXT NOT NULL,
          cache_tag TEXT NOT NULL,
          query_id TEXT NOT NULL,
          PRIMARY KEY (environment, cache_tag, query_id)
        ) WITHOUT ROWID`,
      )
      .catch((error) => {
        ready = undefined;
        throw error;
      }));

  return {
    async insert(entries) {
      if (entries.length === 0) return;
      await table();
      await client.batch(
        chunks(entries).map((chunk) => ({
          sql: `INSERT OR IGNORE INTO cache_tag_index (environment, cache_tag, query_id) VALUES ${chunk
            .map(() => '(?, ?, ?)')
            .join(', ')}`,
          args: chunk.flatMap(({ cacheTag, queryId }) => [environment, cacheTag, queryId]),
        })),
        'write',
      );
    },
    async queryIdsFor(cacheTags) {
      if (cacheTags.length === 0) return [];
      await table();
      const results = await client.batch(
        chunks(cacheTags).map((chunk) => ({
          sql: `SELECT DISTINCT query_id FROM cache_tag_index WHERE environment = ? AND cache_tag IN (${chunk
            .map(() => '?')
            .join(', ')})`,
          args: [environment, ...chunk] as InValue[],
        })),
        'read',
      );
      return [...new Set(results.flatMap(({ rows }) => rows.map((row) => String(row.query_id))))];
    },
    async wipe() {
      await table();
      await client.execute({ sql: 'DELETE FROM cache_tag_index WHERE environment = ?', args: [environment] });
    },
  };
}

function chunks<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) =>
    items.slice(i * CHUNK, (i + 1) * CHUNK),
  );
}

/**
 * The Site's index store on Turso, from `TURSO_DATABASE_URL` and
 * `TURSO_AUTH_TOKEN`, holding the index of the environment named by
 * `DATOCMS_ENVIRONMENT` (primary when unset). The client is created on first
 * use, so a Site that never reaches the index needs no credentials.
 */
export function tursoIndexStoreFromEnv(): IndexStore {
  let store: IndexStore | undefined;
  const open = () =>
    (store ??= createTursoIndexStore({
      client: createClient({
        url: requiredEnv('TURSO_DATABASE_URL'),
        authToken: requiredEnv('TURSO_AUTH_TOKEN'),
        fetch: unpatchedFetch,
      }),
      environment: process.env.DATOCMS_ENVIRONMENT || 'primary',
    }));
  return {
    insert: (entries) => open().insert(entries),
    queryIdsFor: (cacheTags) => open().queryIdsFor(cacheTags),
    wipe: () => open().wipe(),
  };
}

/**
 * Next.js's `fetch` would cache the index's requests during `next build`,
 * replaying stale answers, and `cache: 'no-store'` would make every page
 * dynamic. Next keeps the original `fetch` on the patched one.
 */
const unpatchedFetch: typeof fetch = (input, init) =>
  ((globalThis.fetch as typeof fetch & { _nextOriginalFetch?: typeof fetch })._nextOriginalFetch ??
    globalThis.fetch)(input, init);

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
