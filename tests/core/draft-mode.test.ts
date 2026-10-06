import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCore, defineSiteConfig } from '@/core';
import { createDatoContentClient } from '@/core/testing';
import { fakeSiteContentClient } from '../support/fake-site-content';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const query = { definitions: [] } as never;

describe('the DatoCMS content client', () => {
  beforeEach(() => {
    vi.stubEnv('DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN', 'token');
  });

  function optionsSentFor(isDraft: boolean) {
    const execute = vi.fn().mockResolvedValue({});
    const client = createDatoContentClient({ draftMode: async () => isDraft, execute });
    return client.query(query, {}).then(() => execute.mock.calls[0][1]);
  }

  it('reads published content outside draft mode', async () => {
    expect(await optionsSentFor(false)).toMatchObject({ includeDrafts: false });
  });

  it('reads drafts in draft mode, bypassing the cache', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    const options = await optionsSentFor(true);

    expect(options).toMatchObject({ includeDrafts: true });
    await options.fetchFn('https://graphql.example', {});
    expect(fetch).toHaveBeenCalledWith('https://graphql.example', { cache: 'no-store' });
  });

  it('reads published content when draft mode is unavailable, e.g. at build time', async () => {
    const execute = vi.fn().mockResolvedValue({});
    const outsideRequest = async () => {
      throw new Error('draftMode was called outside a request scope');
    };
    await createDatoContentClient({ draftMode: outsideRequest, execute }).query(query, {});
    expect(execute.mock.calls[0][1]).toMatchObject({ includeDrafts: false });
  });
});

const core = () =>
  createCore(defineSiteConfig({}), {
    contentClient: fakeSiteContentClient({ locales: ['it', 'en'], pages: [] }),
  });

describe('entering draft mode', () => {
  it('needs the secret', () => {
    vi.stubEnv('DRAFT_MODE_SECRET', 'open-sesame');
    expect(core().draftEnableTarget({ secret: 'open-sesame', path: '/it/servizi' })).toBe('/it/servizi');
    expect(core().draftEnableTarget({ secret: 'wrong', path: '/it/servizi' })).toBeNull();
    expect(core().draftEnableTarget({ secret: null, path: '/it/servizi' })).toBeNull();
  });

  it('is closed when the Site has no secret', () => {
    vi.stubEnv('DRAFT_MODE_SECRET', '');
    expect(core().draftEnableTarget({ secret: '', path: '/it' })).toBeNull();
    expect(core().draftEnableTarget({ secret: null, path: '/it' })).toBeNull();
  });

  it('only redirects to a path on the Site', () => {
    vi.stubEnv('DRAFT_MODE_SECRET', 'open-sesame');
    const target = (path: string | null) => core().draftEnableTarget({ secret: 'open-sesame', path });
    expect(target(null)).toBe('/');
    expect(target('https://evil.example')).toBe('/');
    expect(target('//evil.example')).toBe('/');
    expect(target('/\\evil.example')).toBe('/');
  });
});

describe('preview links', () => {
  const pages = [
    { id: 'home', slug: { it: 'home', en: 'home' }, title: {} },
    { id: 'services', slug: { it: 'servizi', en: 'services' }, title: {} },
    { id: 'consulting', parentId: 'services', slug: { it: 'consulenza', en: 'consulting' }, title: {} },
    { id: 'training', parentId: 'services', slug: { it: 'formazione' }, title: {} },
  ];
  const previewLinks = (itemId: string, itemTypeApiKey = 'page') =>
    createCore(defineSiteConfig({}), {
      contentClient: fakeSiteContentClient({ locales: ['it', 'en'], homePageId: 'home', pages }),
    }).previewLinks({ itemTypeApiKey, itemId, origin: 'https://site.example', secret: 's3cret' });

  const enableUrl = (path: string) =>
    `https://site.example/api/draft/enable?secret=s3cret&path=${encodeURIComponent(path)}`;

  it('has one link per locale the Page is translated into, built with the Path builder', async () => {
    expect(await previewLinks('consulting')).toEqual([
      { label: 'Draft (it)', url: enableUrl('/it/servizi/consulenza') },
      { label: 'Draft (en)', url: enableUrl('/en/services/consulting') },
    ]);
    expect(await previewLinks('training')).toEqual([
      { label: 'Draft (it)', url: enableUrl('/it/servizi/formazione') },
    ]);
  });

  it('points the Home page to the locale root', async () => {
    expect(await previewLinks('home')).toEqual([
      { label: 'Draft (it)', url: enableUrl('/it') },
      { label: 'Draft (en)', url: enableUrl('/en') },
    ]);
  });

  it('skips locales the Home page is not translated into', async () => {
    const contentClient = fakeSiteContentClient({
      locales: ['it', 'en'],
      homePageId: 'home',
      pages: [{ id: 'home', slug: { it: 'home' }, title: {} }],
    });
    const links = await createCore(defineSiteConfig({}), { contentClient }).previewLinks({
      itemTypeApiKey: 'page',
      itemId: 'home',
      origin: 'https://site.example',
      secret: 's3cret',
    });
    expect(links).toEqual([{ label: 'Draft (it)', url: enableUrl('/it') }]);
  });

  it('has none for models that are not Pages, or Pages that do not exist', async () => {
    expect(await previewLinks('consulting', 'article')).toEqual([]);
    expect(await previewLinks('missing')).toEqual([]);
  });
});
