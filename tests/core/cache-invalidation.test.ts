import { createHash, createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCore, defineSiteConfig } from '@/core';
import { createDatoContentClient, createMemoryLogger } from '@/core/testing';
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
    const logger = createMemoryLogger();
    const core = createCore({ ...siteConfig, logger }, { contentClient, revalidateTag });
    return { core, revalidateTag, logger };
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
