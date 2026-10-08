import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Breadcrumbs,
  createCore,
  defineRoutableModel,
  defineSiteConfig,
  type RoutableModel,
  RecordView,
} from '@/core';
import { type FakeSiteContent, fakeSiteContentClient } from '../support/fake-site-content';

type FakeRecord = { id: string; slug: Partial<Record<string, string>>; title: Partial<Record<string, string>> };

/**
 * A Routable model a Site could add, answering from memory. Its records have
 * a Path only through the Routing rule naming `apiKey`.
 */
function fakeModel(apiKey: string, records: FakeRecord[]): RoutableModel {
  return defineRoutableModel({
    apiKey,
    async findBySlug(_contentClient, { locale, slug }) {
      const record = records.find((candidate) => candidate.slug[locale] === slug);
      return record ? { id: record.id, title: record.title[locale] ?? '' } : null;
    },
    title: (record) => record.title,
    render: (record) => (
      <article>
        <h1>{record.title}</h1>
        <p>{apiKey}</p>
      </article>
    ),
  });
}

const articles = fakeModel('article', [
  { id: 'a1', slug: { it: 'primo', en: 'first' }, title: { it: 'Primo articolo', en: 'First article' } },
  { id: 'a2', slug: { it: 'solo-italiano' }, title: { it: 'Solo italiano' } },
]);
const events = fakeModel('event', [
  { id: 'e1', slug: { it: 'concerto', en: 'concert' }, title: { it: 'Concerto', en: 'Concert' } },
  { id: 'e2', slug: { it: 'primo', en: 'first' }, title: { it: 'Primo evento', en: 'First event' } },
]);

const site: FakeSiteContent = {
  locales: ['it', 'en'],
  homePageId: 'home',
  pages: [
    { id: 'home', slug: { it: 'home', en: 'home' }, title: { it: 'Benvenuti', en: 'Welcome' } },
    { id: 'magazine', slug: { it: 'rivista', en: 'magazine' }, title: { it: 'Rivista', en: 'Magazine' } },
    {
      id: 'news',
      parentId: 'magazine',
      slug: { it: 'notizie', en: 'news' },
      title: { it: 'Notizie', en: 'News' },
    },
    { id: 'agenda', slug: { it: 'agenda' }, title: { it: 'Agenda' } },
  ],
  routingRules: [
    { model: 'article', mainPageId: 'news', prefix: { it: 'articolo', en: 'article' } },
    { model: 'event', mainPageId: 'agenda', prefix: { it: 'eventi/evento', en: 'events/event' } },
  ],
};

function coreFor(content: FakeSiteContent, routableModels: RoutableModel[] = [articles, events]) {
  return createCore(defineSiteConfig({ routableModels }), { contentClient: fakeSiteContentClient(content) });
}

async function visit(path: string, content: FakeSiteContent = site, routableModels?: RoutableModel[]) {
  const core = coreFor(content, routableModels);
  const [locale = '', ...segments] = path.split('/').filter(Boolean);
  const resolution = await core.resolvePath({ locale, segments });
  if (resolution.kind !== 'record') return resolution;
  return { kind: 'record', html: renderToStaticMarkup(<RecordView record={resolution.record} />) };
}

const recordOf = (title: string, model: string) => ({
  kind: 'record',
  html: `<article><h1>${title}</h1><p>${model}</p></article>`,
});

describe('a record of a Routable model', () => {
  it('is served at its Routing rule’s localized prefix plus its slug', async () => {
    expect(await visit('/it/articolo/primo')).toEqual(recordOf('Primo articolo', 'article'));
    expect(await visit('/en/article/first')).toEqual(recordOf('First article', 'article'));
  });

  it('is served under a prefix of several segments', async () => {
    expect(await visit('/it/eventi/evento/concerto')).toEqual(recordOf('Concerto', 'event'));
  });

  it('is served at its Main page’s Path when the prefix is empty', async () => {
    const emptyPrefix: FakeSiteContent = {
      ...site,
      routingRules: [{ model: 'article', mainPageId: 'news', prefix: { it: '' } }],
    };

    expect(await visit('/it/rivista/notizie/primo', emptyPrefix)).toEqual(recordOf('Primo articolo', 'article'));
    // No English prefix at all: the same fallback.
    expect(await visit('/en/magazine/news/first', emptyPrefix)).toEqual(recordOf('First article', 'article'));
    expect(await visit('/it/articolo/primo', emptyPrefix)).toEqual({ kind: 'not-found' });
  });

  it('is served at the locale root’s level when the empty prefix falls back to the Home page', async () => {
    const underHome: FakeSiteContent = {
      ...site,
      routingRules: [{ model: 'article', mainPageId: 'home', prefix: {} }],
    };

    expect(await visit('/it/primo', underHome)).toEqual(recordOf('Primo articolo', 'article'));
    expect(await visit('/it/home/primo', underHome)).toEqual({ kind: 'not-found' });
  });

  it('gets its title as document title', async () => {
    const core = coreFor(site);
    const resolution = await core.resolvePath({ locale: 'it', segments: ['articolo', 'primo'] });

    expect(core.metadataFor(resolution)).toEqual({ title: 'Primo articolo' });
  });

  it('is not found in a locale it has no translation for', async () => {
    expect(await visit('/it/articolo/solo-italiano')).toMatchObject({ kind: 'record' });
    expect(await visit('/en/article/solo-italiano')).toEqual({ kind: 'not-found' });
  });

  it('is not found when the empty prefix falls back to a Main page missing that translation', async () => {
    const underItalianOnlyPage: FakeSiteContent = {
      ...site,
      routingRules: [{ model: 'event', mainPageId: 'agenda', prefix: {} }],
    };

    expect(await visit('/it/agenda/concerto', underItalianOnlyPage)).toEqual(recordOf('Concerto', 'event'));
    expect(await visit('/en/agenda/concert', underItalianOnlyPage)).toEqual({ kind: 'not-found' });
  });

  it('is not found at a Path that only starts like its own', async () => {
    expect(await visit('/it/articolo')).toEqual({ kind: 'not-found' });
    expect(await visit('/it/articolo/primo/altro')).toEqual({ kind: 'not-found' });
    expect(await visit('/it/article/primo')).toEqual({ kind: 'not-found' });
  });

  it('has no Path when its model has no Routing rule or is not in the Site config', async () => {
    const withoutEventRule: FakeSiteContent = { ...site, routingRules: site.routingRules?.slice(0, 1) };

    expect(await visit('/it/eventi/evento/concerto', withoutEventRule)).toEqual({ kind: 'not-found' });
    expect(await visit('/it/eventi/evento/concerto', site, [articles])).toEqual({ kind: 'not-found' });
  });
});

describe('a Path claimed by several records', () => {
  const samePrefix: FakeSiteContent = {
    ...site,
    routingRules: [
      { model: 'article', mainPageId: 'news', prefix: { it: 'contenuti', en: 'content' } },
      { model: 'event', mainPageId: 'agenda', prefix: { it: 'contenuti', en: 'content' } },
    ],
  };

  it('serves the record of the first model in the Site config order', async () => {
    expect(await visit('/it/contenuti/primo', samePrefix, [articles, events])).toEqual(
      recordOf('Primo articolo', 'article'),
    );
    expect(await visit('/it/contenuti/primo', samePrefix, [events, articles])).toEqual(
      recordOf('Primo evento', 'event'),
    );
  });

  it('serves a later model’s record when the first model has none at that Path', async () => {
    expect(await visit('/it/contenuti/concerto', samePrefix, [articles, events])).toEqual(
      recordOf('Concerto', 'event'),
    );
  });

  it('serves a Page before any other model', async () => {
    const underHome: FakeSiteContent = {
      ...site,
      routingRules: [{ model: 'article', mainPageId: 'home', prefix: {} }],
      pages: [...site.pages, { id: 'first-page', slug: { it: 'primo' }, title: { it: 'Pagina primo' } }],
    };

    expect(await visit('/it/primo', underHome)).toEqual({ kind: 'record', html: '<article><h1>Pagina primo</h1></article>' });
  });
});

describe('breadcrumbs', () => {
  async function breadcrumbsOf(path: string, content: FakeSiteContent = site) {
    const core = coreFor(content);
    const [locale = '', ...segments] = path.split('/').filter(Boolean);
    const resolution = await core.resolvePath({ locale, segments });
    return resolution.kind === 'record' ? resolution.breadcrumbs : resolution;
  }

  it('place a Page under the Home page and its ancestors', async () => {
    expect(await breadcrumbsOf('/it/rivista/notizie')).toEqual([
      { title: 'Benvenuti', path: '/it' },
      { title: 'Rivista', path: '/it/rivista' },
      { title: 'Notizie', path: '/it/rivista/notizie' },
    ]);
  });

  it('place a record under the Home page and its Main page’s chain, whatever its Path', async () => {
    expect(await breadcrumbsOf('/en/article/first')).toEqual([
      { title: 'Welcome', path: '/en' },
      { title: 'Magazine', path: '/en/magazine' },
      { title: 'News', path: '/en/magazine/news' },
      { title: 'First article', path: '/en/article/first' },
    ]);
  });

  it('skip a Main page missing the translation', async () => {
    const italianOnlyMainPage: FakeSiteContent = {
      ...site,
      routingRules: [{ model: 'event', mainPageId: 'agenda', prefix: { en: 'event' } }],
    };

    expect(await breadcrumbsOf('/en/event/concert', italianOnlyMainPage)).toEqual([
      { title: 'Welcome', path: '/en' },
      { title: 'Concert', path: '/en/event/concert' },
    ]);
  });

  it('are empty on the Home page', async () => {
    expect(await breadcrumbsOf('/it')).toEqual([]);
  });

  it('start from the record when the Site has no Home page', async () => {
    expect(await breadcrumbsOf('/it/rivista', { ...site, homePageId: undefined })).toEqual([
      { title: 'Rivista', path: '/it/rivista' },
    ]);
  });
});

describe('the breadcrumbs navigation', () => {
  it('links every step but the current page, outside Site search', () => {
    const items = [
      { title: 'Benvenuti', path: '/it' },
      { title: 'Notizie', path: '/it/notizie' },
      { title: 'Primo articolo', path: '/it/articolo/primo' },
    ];

    expect(renderToStaticMarkup(<Breadcrumbs items={items} label="Percorso di navigazione" />)).toBe(
      '<nav aria-label="Percorso di navigazione" data-datocms-noindex=""><ol>' +
        '<li><a href="/it">Benvenuti</a></li>' +
        '<li><a href="/it/notizie">Notizie</a></li>' +
        '<li><span aria-current="page">Primo articolo</span></li>' +
        '</ol></nav>',
    );
  });

  it('renders nothing without steps', () => {
    expect(renderToStaticMarkup(<Breadcrumbs items={[]} label="Breadcrumb" />)).toBe('');
  });
});
