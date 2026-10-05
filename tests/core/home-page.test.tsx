import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createCore, defineSiteConfig, RecordView } from '@/core';
import { createFakeContentClient } from '@/core/testing';

const siteConfig = defineSiteConfig({});

const homePageTitles: Record<string, string> = { it: 'Benvenuti', en: 'Welcome' };

function fakeContentClient() {
  return createFakeContentClient({
    SiteLocales: () => ({ _site: { locales: ['it', 'en'] } }),
    HomePage: ({ locale }) => ({
      siteSetting: {
        homePage: { __typename: 'PageRecord', id: 'home', title: homePageTitles[locale as string] },
      },
    }),
  });
}

async function render(locale: string, segments: string[] = []) {
  const core = createCore(siteConfig, { contentClient: fakeContentClient() });
  const route = await core.resolvePath({ locale, segments });
  if (route.kind !== 'record') return route;
  return { kind: route.kind, html: renderToStaticMarkup(<RecordView record={route.record} />) };
}

describe('the locale root', () => {
  it('renders the Home page chosen in Site settings, in the requested locale', async () => {
    expect(await render('it')).toEqual({ kind: 'record', html: '<article><h1>Benvenuti</h1></article>' });
    expect(await render('en')).toEqual({ kind: 'record', html: '<article><h1>Welcome</h1></article>' });
  });

  it('gives the Home page its title as document title', async () => {
    const core = createCore(siteConfig, { contentClient: fakeContentClient() });
    const route = await core.resolvePath({ locale: 'it', segments: [] });

    expect(core.metadataFor(route)).toEqual({ title: 'Benvenuti' });
  });

  it('is not found for a locale the Site does not offer', async () => {
    expect(await render('fr')).toEqual({ kind: 'not-found' });
  });
});
