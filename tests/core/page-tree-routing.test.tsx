import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createCore, defineSiteConfig, RecordView } from '@/core';
import { type FakeSiteContent, fakeSiteContentClient } from '../support/fake-site-content';

const site: FakeSiteContent = {
  locales: ['it', 'en'],
  homePageId: 'home',
  pages: [
    { id: 'home', slug: { it: 'home', en: 'home' }, title: { it: 'Benvenuti', en: 'Welcome' } },
    { id: 'services', slug: { it: 'servizi', en: 'services' }, title: { it: 'Servizi', en: 'Services' } },
    {
      id: 'consulting',
      parentId: 'services',
      slug: { it: 'consulenza', en: 'consulting' },
      title: { it: 'Consulenza', en: 'Consulting' },
    },
    {
      id: 'strategy',
      parentId: 'consulting',
      slug: { it: 'strategia', en: 'strategy' },
      title: { it: 'Strategia', en: 'Strategy' },
    },
  ],
};

async function visit(path: string, content: FakeSiteContent = site) {
  const core = createCore(defineSiteConfig({}), { contentClient: fakeSiteContentClient(content) });
  const [locale = '', ...segments] = path.split('/').filter(Boolean);
  const resolution = await core.resolvePath({ locale, segments });
  if (resolution.kind !== 'record') return resolution;
  return { kind: 'record', html: renderToStaticMarkup(<RecordView record={resolution.record} />) };
}

describe('a Page in the Page tree', () => {
  it('is served at the Path built from its ancestors’ slugs in the requested locale', async () => {
    expect(await visit('/it/servizi')).toEqual({ kind: 'record', html: '<article><h1>Servizi</h1></article>' });
    expect(await visit('/it/servizi/consulenza/strategia')).toEqual({
      kind: 'record',
      html: '<article><h1>Strategia</h1></article>',
    });
    expect(await visit('/en/services/consulting')).toEqual({
      kind: 'record',
      html: '<article><h1>Consulting</h1></article>',
    });
  });

  it('is served at any depth, however many Pages the Site has', async () => {
    // 600 nested Pages, listed leaf first: ancestors come in later result batches.
    const depth = 600;
    const pages = Array.from({ length: depth }, (_, level) => ({
      id: `level-${level}`,
      parentId: level > 0 ? `level-${level - 1}` : undefined,
      slug: { it: `livello-${level}` },
      title: { it: `Livello ${level}` },
    })).reverse();
    const deepestPath = `/it/${Array.from({ length: depth }, (_, level) => `livello-${level}`).join('/')}`;

    expect(await visit(deepestPath, { locales: ['it'], pages })).toEqual({
      kind: 'record',
      html: `<article><h1>Livello ${depth - 1}</h1></article>`,
    });
  });

  it('is not found in a locale it has no translation for', async () => {
    const withItalianOnlyPage: FakeSiteContent = {
      ...site,
      pages: [
        ...site.pages,
        { id: 'training', parentId: 'services', slug: { it: 'formazione' }, title: { it: 'Formazione' } },
      ],
    };

    expect(await visit('/it/servizi/formazione', withItalianOnlyPage)).toMatchObject({ kind: 'record' });
    expect(await visit('/en/services/formazione', withItalianOnlyPage)).toEqual({ kind: 'not-found' });
    expect(await visit('/en/formazione', withItalianOnlyPage)).toEqual({ kind: 'not-found' });
  });

  it('is not found in a locale its ancestor has no translation for', async () => {
    const underItalianOnlyPage: FakeSiteContent = {
      ...site,
      pages: [
        { id: 'news', slug: { it: 'notizie' }, title: { it: 'Notizie' } },
        { id: 'archive', parentId: 'news', slug: { it: 'archivio', en: 'archive' }, title: { it: 'Archivio', en: 'Archive' } },
      ],
    };

    expect(await visit('/it/notizie/archivio', underItalianOnlyPage)).toMatchObject({ kind: 'record' });
    expect(await visit('/en/archive', underItalianOnlyPage)).toEqual({ kind: 'not-found' });
  });
});

describe('the Home page', () => {
  it('is served at the locale root', async () => {
    expect(await visit('/it')).toEqual({ kind: 'record', html: '<article><h1>Benvenuti</h1></article>' });
    expect(await visit('/en')).toEqual({ kind: 'record', html: '<article><h1>Welcome</h1></article>' });
  });

  it('gets its title as document title', async () => {
    const core = createCore(defineSiteConfig({}), { contentClient: fakeSiteContentClient(site) });
    const resolution = await core.resolvePath({ locale: 'it', segments: [] });

    expect(core.metadataFor(resolution)).toEqual({ title: 'Benvenuti' });
  });

  it('redirects permanently from its own Path to the locale root', async () => {
    expect(await visit('/it/home')).toEqual({ kind: 'redirect', destination: '/it', permanent: true });
    expect(await visit('/en/home')).toEqual({ kind: 'redirect', destination: '/en', permanent: true });
  });

  it('is not found at a locale root it has no translation for', async () => {
    const italianOnlyHome: FakeSiteContent = {
      ...site,
      pages: [{ id: 'home', slug: { it: 'home' }, title: { it: 'Benvenuti' } }],
    };

    expect(await visit('/en', italianOnlyHome)).toEqual({ kind: 'not-found' });
  });
});

describe('an unknown Path', () => {
  it('is not found', async () => {
    expect(await visit('/it/non-esiste')).toEqual({ kind: 'not-found' });
    expect(await visit('/it/consulenza')).toEqual({ kind: 'not-found' });
    expect(await visit('/it/servizi/consulenza/strategia/altro')).toEqual({ kind: 'not-found' });
    expect(await visit('/it/services')).toEqual({ kind: 'not-found' });
  });

  it('is not found in a locale the Site does not offer', async () => {
    expect(await visit('/fr')).toEqual({ kind: 'not-found' });
    expect(await visit('/fr/servizi')).toEqual({ kind: 'not-found' });
  });
});
