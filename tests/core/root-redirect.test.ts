import { describe, expect, it } from 'vitest';
import { createCore, defineSiteConfig } from '@/core';
import { fakeSiteContentClient } from '../support/fake-site-content';

async function rootRedirect(acceptLanguage: string | null, locales = ['it', 'en']) {
  const contentClient = fakeSiteContentClient({ locales, pages: [] });
  return createCore(defineSiteConfig({}), { contentClient }).rootRedirect(acceptLanguage);
}

const temporaryRedirectTo = (destination: string) => ({ kind: 'redirect', destination, permanent: false });

describe('the bare domain', () => {
  it('redirects temporarily to the browser’s preferred locale when the Site offers it', async () => {
    expect(await rootRedirect('en')).toEqual(temporaryRedirectTo('/en'));
    expect(await rootRedirect('en-GB,en;q=0.9,it;q=0.8')).toEqual(temporaryRedirectTo('/en'));
    expect(await rootRedirect('de-DE,de;q=0.9,it;q=0.5,en;q=0.4')).toEqual(temporaryRedirectTo('/it'));
    expect(await rootRedirect('it;q=0.3,en;q=0.7')).toEqual(temporaryRedirectTo('/en'));
  });

  it('matches a regional Site locale from the browser’s language', async () => {
    expect(await rootRedirect('en', ['it', 'en-US'])).toEqual(temporaryRedirectTo('/en-US'));
    expect(await rootRedirect('pt-PT,pt-BR', ['it', 'pt-BR'])).toEqual(temporaryRedirectTo('/pt-BR'));
  });

  it('redirects temporarily to the default locale otherwise', async () => {
    expect(await rootRedirect('de-DE,fr;q=0.8')).toEqual(temporaryRedirectTo('/it'));
    expect(await rootRedirect('en;q=0')).toEqual(temporaryRedirectTo('/it'));
    expect(await rootRedirect('*')).toEqual(temporaryRedirectTo('/it'));
    expect(await rootRedirect(null)).toEqual(temporaryRedirectTo('/it'));
  });
});
