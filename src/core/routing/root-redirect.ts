import type { ContentClient } from '../content/content-client';
import { type Redirect, redirectToLocaleRoot } from './redirect';
import { loadSiteLocales } from './site-locales';

/**
 * Where the bare domain sends a Visitor: the root of the first Site locale
 * their browser accepts, else of the default locale.
 */
export async function rootRedirect(
  contentClient: ContentClient,
  acceptLanguage: string | null,
): Promise<Redirect> {
  const locales = await loadSiteLocales(contentClient);
  const locale = preferredLocale(browserLanguages(acceptLanguage), locales) ?? locales[0];
  return redirectToLocaleRoot(locale, { permanent: false });
}

/** The languages of an Accept-Language header, most preferred first. */
function browserLanguages(acceptLanguage: string | null): string[] {
  return (acceptLanguage ?? '')
    .split(',')
    .map((entry) => {
      const [tag = '', ...parameters] = entry.trim().split(';');
      const quality = parameters.map((parameter) => parameter.trim().match(/^q=([\d.]+)$/)?.[1]).find(Boolean);
      return { tag: tag.trim().toLowerCase(), quality: quality === undefined ? 1 : Number(quality) };
    })
    .filter(({ tag, quality }) => tag && tag !== '*' && quality > 0)
    .sort((a, b) => b.quality - a.quality)
    .map(({ tag }) => tag);
}

/** The first browser language the Site offers, exactly or by primary language. */
function preferredLocale<Locale extends string>(languages: string[], locales: Locale[]): Locale | undefined {
  const primaryLanguage = (tag: string) => tag.toLowerCase().split('-')[0];

  for (const language of languages) {
    const match =
      locales.find((locale) => locale.toLowerCase() === language) ??
      locales.find((locale) => primaryLanguage(locale) === primaryLanguage(language));
    if (match) return match;
  }
  return undefined;
}
