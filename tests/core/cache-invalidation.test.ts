import { createHash, createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCore, defineSiteConfig } from '@/core';
import { createDatoContentClient, createMemoryIndexStore, createMemoryLogger } from '@/core/testing';
import { fakeSiteContentClient } from '../support/fake-site-content';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const query = { definitions: [] } as never;

describe('cached reads', () => {
  beforeEach(() => {
    vi.stubEnv('DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN', 'token');
  });

  async function optionsSent(env: string | undefined = undefined) {
    vi.stubEnv('DATOCMS_ENVIRONMENT', env ?? '');
    const execute = vi.fn().mockResolvedValue({});
    await createDatoContentClient({ draftMode: async () => false, execute }).query(query, {});
    return execute.mock.calls[0][1];
  }

  it('are cached forever under the global tag, until a webhook revalidates it', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await (await optionsSent()).fetchFn('https://graphql.example', { method: 'POST' });
    expect(fetch).toHaveBeenCalledWith('https://graphql.example', {
      method: 'POST',
      cache: 'force-cache',
      next: { tags: ['dato'] },
    });
  });

  describe('in granular mode', () => {
    beforeEach(() => {
      vi.stubEnv('DATOCMS_ENVIRONMENT', '');
    });

    async function granularFetch(cacheTags: string | null, indexStore = createMemoryIndexStore()) {
      const fetch = vi.fn().mockResolvedValue(
        new Response('{}', { headers: cacheTags === null ? {} : { 'x-cache-tags': cacheTags } }),
      );
      vi.stubGlobal('fetch', fetch);
      const execute = vi.fn().mockResolvedValue({});
      await createDatoContentClient({ draftMode: async () => false, execute, indexStore }).query(query, {});
      const options = execute.mock.calls[0][1];
      const send = (body: string) => options.fetchFn('https://graphql.example', { method: 'POST', body });
      return { options, fetch, send, indexStore };
    }

    it('tag each read with the global tag and the ID of its query and variables', async () => {
      const { options, fetch, send } = await granularFetch('t1');
      expect(options.returnCacheTags).toBe(true);
      await send('{"query":"{ a }","variables":{}}');
      await send('{"query":"{ a }","variables":{"x":1}}');
      const tags = fetch.mock.calls.map(([, init]) => init.next.tags);
      expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'force-cache' });
      // sha1 of the environment and the request body: the same read always gets the same ID.
      expect(tags[0]).toEqual(['dato', 'dato:q:3cc750bafc39fc946d6978c178e40852e09a22bc']);
      expect(tags[1][1]).toMatch(/^dato:q:[0-9a-f]{40}$/);
      expect(tags[1][1]).not.toBe(tags[0][1]);
    });

    it('give the same read in another DatoCMS environment another ID', async () => {
      vi.stubEnv('DATOCMS_ENVIRONMENT', 'develop');
      const { fetch, send } = await granularFetch('t1');
      await send('{"query":"{ a }","variables":{}}');
      expect(fetch.mock.calls[0][1].next.tags[1]).toMatch(/^dato:q:[0-9a-f]{40}$/);
      expect(fetch.mock.calls[0][1].next.tags[1]).not.toBe('dato:q:3cc750bafc39fc946d6978c178e40852e09a22bc');
    });

    it('record the cache tags DatoCMS returns in the index', async () => {
      const { send, indexStore } = await granularFetch('t1 t2');
      await send('{"query":"{ a }","variables":{}}');
      expect(indexStore.entries).toEqual([
        { cacheTag: 't1', queryId: '3cc750bafc39fc946d6978c178e40852e09a22bc' },
        { cacheTag: 't2', queryId: '3cc750bafc39fc946d6978c178e40852e09a22bc' },
      ]);
    });

    it('fail when the index cannot record them, so the page is not cached without them', async () => {
      const indexStore = createMemoryIndexStore();
      indexStore.insert = async () => {
        throw new Error('index down');
      };
      const { send } = await granularFetch('t1', indexStore);
      await expect(send('{}')).rejects.toThrow('index down');
    });
  });

  it('read the primary environment unless DATOCMS_ENVIRONMENT names another', async () => {
    expect((await optionsSent()).environment).toBeUndefined();
    expect((await optionsSent('develop')).environment).toBe('develop');
  });

  it('read the chosen environment in draft mode too', async () => {
    vi.stubEnv('DATOCMS_ENVIRONMENT', 'develop');
    const execute = vi.fn().mockResolvedValue({});
    await createDatoContentClient({ draftMode: async () => true, execute }).query(query, {});
    expect(execute.mock.calls[0][1]).toMatchObject({ includeDrafts: true, environment: 'develop' });
  });
});

describe('cache invalidation', () => {
  const contentClient = fakeSiteContentClient({ locales: ['it'], pages: [] });

  function setup(siteConfig = defineSiteConfig({})) {
    vi.stubEnv('CACHE_WEBHOOK_SECRET', 's3cret');
    const revalidateTag = vi.fn();
    const purgeCdn = vi.fn().mockResolvedValue(undefined);
    const afterResponse: (() => Promise<void>)[] = [];
    const logger = createMemoryLogger();
    const core = createCore(
      { ...siteConfig, logger },
      { contentClient, revalidateTag, purgeCdn, after: (task) => afterResponse.push(task) },
    );
    /**
     * Runs the work scheduled after the response to the end, calling
     * `checkAt` once `ms` have passed.
     */
    async function runAfterResponse(ms = 0, checkAt = () => {}) {
      vi.useFakeTimers();
      try {
        const done = Promise.all(afterResponse.splice(0).map((task) => task()));
        await vi.advanceTimersByTimeAsync(ms);
        checkAt();
        await vi.runAllTimersAsync();
        await done;
      } finally {
        vi.useRealTimers();
      }
    }
    return { core, revalidateTag, purgeCdn, runAfterResponse, logger };
  }

  const webhook = (headers: Record<string, string> = { authorization: 'Bearer s3cret' }, body = '{}') =>
    new Request('https://site.example/api/cache/datocms', { method: 'POST', headers, body });

  it('revalidates the global tag with stale-while-revalidate when DatoCMS reports changes', async () => {
    const { core, revalidateTag } = setup();
    const response = await core.handleCacheTagsWebhook(webhook());
    expect(response.status).toBe(200);
    expect(revalidateTag.mock.calls).toEqual([['dato', 'max']]);
  });

  it('rejects a request without the secret, and logs it', async () => {
    const { core, revalidateTag, logger } = setup();
    for (const headers of [{}, { authorization: 'Bearer wrong' }, { authorization: 's3cret' }] as Record<string, string>[]) {
      expect((await core.handleCacheTagsWebhook(webhook(headers))).status).toBe(401);
    }
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(logger.events).toHaveLength(3);
    expect(logger.events[0]).toMatchObject({ severity: 'warning' });
  });

  it('rejects everything when the Site has no secret', async () => {
    const { core, revalidateTag } = setup();
    vi.stubEnv('CACHE_WEBHOOK_SECRET', '');
    expect((await core.handleCacheTagsWebhook(webhook({ authorization: 'Bearer ' }))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('answers 500 and logs when revalidation fails, so DatoCMS retries', async () => {
    const { core, revalidateTag, logger } = setup();
    revalidateTag.mockImplementation(() => {
      throw new Error('boom');
    });
    expect((await core.handleCacheTagsWebhook(webhook())).status).toBe(500);
    expect(logger.events).toEqual([
      expect.objectContaining({ severity: 'error', context: { error: expect.objectContaining({ message: 'boom' }) } }),
    ]);
  });

  it('purges the CDN again a few seconds later, in case the first purge was rate-limited', async () => {
    const { core, purgeCdn, runAfterResponse } = setup();
    await core.handleCacheTagsWebhook(webhook());
    expect(purgeCdn).not.toHaveBeenCalled();
    await runAfterResponse(4_000, () => expect(purgeCdn).not.toHaveBeenCalled());
    expect(purgeCdn.mock.calls).toEqual([[['dato']]]);
  });

  it('retries a failed delayed purge once, then logs it', async () => {
    const { core, purgeCdn, runAfterResponse, logger } = setup();
    purgeCdn.mockRejectedValue(new Error('429'));
    await core.handleCacheTagsWebhook(webhook());
    await runAfterResponse();
    expect(purgeCdn).toHaveBeenCalledTimes(2);
    expect(logger.events).toEqual([expect.objectContaining({ severity: 'warning', message: 'Delayed CDN purge failed' })]);
  });

  describe('in granular mode', () => {
    const tagsWebhook = (tags: string[]) =>
      webhook(
        { authorization: 'Bearer s3cret' },
        JSON.stringify({ entity_type: 'cda_cache_tags', event_type: 'invalidate', entity: { attributes: { tags } } }),
      );

    async function granularSetup(entries = [
      { cacheTag: 't1', queryId: 'q1' },
      { cacheTag: 't2', queryId: 'q2' },
      { cacheTag: 't2', queryId: 'q3' },
    ]) {
      const indexStore = createMemoryIndexStore();
      await indexStore.insert(entries);
      return { indexStore, ...setup(defineSiteConfig({ invalidationMode: 'granular', indexStore })) };
    }

    it('revalidates only the queries that depend on the changed content', async () => {
      const { core, revalidateTag, purgeCdn, runAfterResponse } = await granularSetup();
      const response = await core.handleCacheTagsWebhook(tagsWebhook(['t2', 'unknown']));
      expect(response.status).toBe(200);
      expect(revalidateTag.mock.calls).toEqual([
        ['dato:q:q2', 'max'],
        ['dato:q:q3', 'max'],
      ]);
      await runAfterResponse();
      expect(purgeCdn.mock.calls).toEqual([[['dato:q:q2', 'dato:q:q3']]]);
    });

    it('revalidates nothing when no query depends on the changed content', async () => {
      const { core, revalidateTag, purgeCdn, runAfterResponse } = await granularSetup();
      expect((await core.handleCacheTagsWebhook(tagsWebhook(['unknown']))).status).toBe(200);
      await runAfterResponse();
      expect(revalidateTag).not.toHaveBeenCalled();
      expect(purgeCdn).not.toHaveBeenCalled();
    });

    it('falls back to the global tag, and logs it, when the index lookup fails', async () => {
      const { core, revalidateTag, indexStore, logger } = await granularSetup();
      indexStore.queryIdsFor = async () => {
        throw new Error('index down');
      };
      expect((await core.handleCacheTagsWebhook(tagsWebhook(['t1']))).status).toBe(200);
      expect(revalidateTag.mock.calls).toEqual([['dato', 'max']]);
      expect(logger.events).toEqual([
        expect.objectContaining({
          severity: 'warning',
          context: expect.objectContaining({ error: expect.objectContaining({ message: 'index down' }) }),
        }),
      ]);
    });

    it('falls back to the global tag, and logs it, when the request names no tags', async () => {
      const { core, revalidateTag, logger } = await granularSetup();
      expect((await core.handleCacheTagsWebhook(webhook(undefined, 'not json'))).status).toBe(200);
      expect(revalidateTag.mock.calls).toEqual([['dato', 'max']]);
      expect(logger.events).toEqual([
        expect.objectContaining({ severity: 'warning', message: expect.stringContaining('names no tags') }),
      ]);
    });

    it('falls back to the global tag, and logs it, when more than 200 queries match', async () => {
      const many = Array.from({ length: 201 }, (_, i) => ({ cacheTag: 'bulk', queryId: `q${i}` }));
      const { core, revalidateTag, logger } = await granularSetup(many);
      await core.handleCacheTagsWebhook(tagsWebhook(['bulk']));
      expect(revalidateTag.mock.calls).toEqual([['dato', 'max']]);
      expect(logger.events).toEqual([
        expect.objectContaining({ severity: 'info', context: expect.objectContaining({ matches: 201 }) }),
      ]);
    });

    it('revalidates up to 200 matching queries one by one', async () => {
      const many = Array.from({ length: 200 }, (_, i) => ({ cacheTag: 'bulk', queryId: `q${i}` }));
      const { core, revalidateTag } = await granularSetup(many);
      await core.handleCacheTagsWebhook(tagsWebhook(['bulk']));
      expect(revalidateTag).toHaveBeenCalledTimes(200);
      expect(revalidateTag).not.toHaveBeenCalledWith('dato', 'max');
    });

    it('wipes the index and revalidates everything on a full flush', async () => {
      const { core, revalidateTag, indexStore, purgeCdn, runAfterResponse } = await granularSetup();
      const response = await core.handleCacheFlush(webhook());
      expect(response.status).toBe(200);
      expect(indexStore.entries).toEqual([]);
      expect(revalidateTag.mock.calls).toEqual([['dato', 'max']]);
      await runAfterResponse();
      expect(purgeCdn.mock.calls).toEqual([[['dato']]]);
    });

    it('still revalidates everything, and logs it, when the index cannot be wiped', async () => {
      const { core, revalidateTag, indexStore, logger } = await granularSetup();
      indexStore.wipe = async () => {
        throw new Error('index down');
      };
      expect((await core.handleCacheFlush(webhook())).status).toBe(500);
      expect(revalidateTag.mock.calls).toEqual([['dato', 'max']]);
      expect(logger.events).toEqual([expect.objectContaining({ severity: 'error', message: 'Cache index wipe failed' })]);
    });
  });

  describe('full flush, for code deploys and rollbacks', () => {
    const flush = (headers: Record<string, string>, body = '{"state":"ready"}') =>
      new Request('https://site.example/api/cache/flush', { method: 'POST', headers, body });

    const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    function netlifySignature(body: string, secret = 's3cret', claims: object = {}) {
      const payload = {
        iss: 'netlify',
        sha256: createHash('sha256').update(body).digest('hex'),
        ...claims,
      };
      const signed = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
      return `${signed}.${createHmac('sha256', secret).update(signed).digest('base64url')}`;
    }

    it('accepts the bearer secret, for manual use', async () => {
      const { core, revalidateTag } = setup();
      const response = await core.handleCacheFlush(flush({ authorization: 'Bearer s3cret' }));
      expect(response.status).toBe(200);
      expect(revalidateTag.mock.calls).toEqual([['dato', 'max']]);
    });

    it('accepts a Netlify deploy notification signed with the secret', async () => {
      const { core, revalidateTag } = setup();
      const body = '{"state":"ready"}';
      const response = await core.handleCacheFlush(
        flush({ 'x-webhook-signature': netlifySignature(body) }, body),
      );
      expect(response.status).toBe(200);
      expect(revalidateTag.mock.calls).toEqual([['dato', 'max']]);
    });

    it('ignores deploy previews, which must not flush the Site they notify', async () => {
      const { core, revalidateTag, purgeCdn, runAfterResponse } = setup();
      const body = '{"state":"ready","context":"deploy-preview"}';
      const response = await core.handleCacheFlush(
        flush({ 'x-webhook-signature': netlifySignature(body) }, body),
      );
      expect(response.status).toBe(200);
      await runAfterResponse();
      expect(revalidateTag).not.toHaveBeenCalled();
      expect(purgeCdn).not.toHaveBeenCalled();
    });

    it('rejects a Netlify signature for another body, secret or issuer', async () => {
      const { core, revalidateTag } = setup();
      const body = '{"state":"ready"}';
      for (const signature of [
        netlifySignature('{"state":"other"}'),
        netlifySignature(body, 'other-secret'),
        netlifySignature(body, 's3cret', { iss: 'someone' }),
        'not-a-jws',
      ]) {
        expect((await core.handleCacheFlush(flush({ 'x-webhook-signature': signature }, body))).status).toBe(401);
      }
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });
});
