/** A DatoCMS cache tag found in the response to a query, keyed by the query's ID. */
export type IndexEntry = { cacheTag: string; queryId: string };

/**
 * The index store adapter: records which queries depend on which DatoCMS
 * cache tags, so a publish revalidates only those queries (`granular`
 * invalidation mode). Rows are only ever added; the index is wiped together
 * with a full revalidation. Each store holds the index of one DatoCMS
 * environment.
 */
export interface IndexStore {
  /** Records the entries. Entries already in the index are ignored. */
  insert(entries: IndexEntry[]): Promise<void>;
  /** The IDs of the queries that depend on any of the cache tags. */
  queryIdsFor(cacheTags: string[]): Promise<string[]>;
  /** Forgets every entry. */
  wipe(): Promise<void>;
}
