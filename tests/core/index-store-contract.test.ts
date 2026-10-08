import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { afterAll, describe, expect, it } from 'vitest';
import type { IndexStore } from '@/core';
import { createMemoryIndexStore } from '@/core/testing';
import { createTursoIndexStore } from '@/core';

/** The behaviour every index store adapter must have. */
function indexStoreContract(name: string, openStore: () => IndexStore) {
  describe(`${name} index store`, () => {
    it('finds the queries that depend on any of the given cache tags', async () => {
      const store = openStore();
      await store.insert([
        { cacheTag: 'a', queryId: 'q1' },
        { cacheTag: 'b', queryId: 'q1' },
        { cacheTag: 'b', queryId: 'q2' },
        { cacheTag: 'c', queryId: 'q3' },
      ]);
      expect((await store.queryIdsFor(['b', 'x'])).sort()).toEqual(['q1', 'q2']);
      expect((await store.queryIdsFor(['a', 'b'])).sort()).toEqual(['q1', 'q2']);
      expect(await store.queryIdsFor([])).toEqual([]);
    });

    it('ignores mappings it already has', async () => {
      const store = openStore();
      await store.insert([{ cacheTag: 'a', queryId: 'q1' }]);
      await store.insert([{ cacheTag: 'a', queryId: 'q1' }, { cacheTag: 'a', queryId: 'q2' }]);
      await store.insert([]);
      expect((await store.queryIdsFor(['a'])).sort()).toEqual(['q1', 'q2']);
    });

    it('handles hundreds of tags in one call, as DatoCMS sends them', async () => {
      const store = openStore();
      const tags = Array.from({ length: 1200 }, (_, i) => `t${i}`);
      await store.insert(tags.map((cacheTag, i) => ({ cacheTag, queryId: `q${i % 3}` })));
      expect((await store.queryIdsFor(tags)).sort()).toEqual(['q0', 'q1', 'q2']);
    });

    it('forgets everything when wiped', async () => {
      const store = openStore();
      await store.insert([{ cacheTag: 'a', queryId: 'q1' }]);
      await store.wipe();
      expect(await store.queryIdsFor(['a'])).toEqual([]);
    });
  });
}

indexStoreContract('in-memory', () => createMemoryIndexStore());

const directory = mkdtempSync(join(tmpdir(), 'index-store-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));
let databases = 0;
const libsqlFile = () => createClient({ url: `file:${join(directory, `${++databases}.db`)}` });

indexStoreContract('libSQL', () => createTursoIndexStore({ client: libsqlFile(), environment: 'primary' }));

describe('libSQL index store', () => {
  it('keeps a separate index for each DatoCMS environment', async () => {
    const client = libsqlFile();
    const primary = createTursoIndexStore({ client, environment: 'primary' });
    const develop = createTursoIndexStore({ client, environment: 'develop' });
    await primary.insert([{ cacheTag: 'a', queryId: 'q1' }]);
    await develop.insert([{ cacheTag: 'a', queryId: 'q2' }]);
    expect(await primary.queryIdsFor(['a'])).toEqual(['q1']);

    await develop.wipe();
    expect(await develop.queryIdsFor(['a'])).toEqual([]);
    expect(await primary.queryIdsFor(['a'])).toEqual(['q1']);
  });
});
