import type { ContentClient } from '../content/content-client';
import { loadPageTree } from '../routing/page-tree';
import { localeRootPath, pageTreePaths } from '../routing/path-builder';
import { HomePageIdQuery } from '../routing/resolve-path';
import { loadSiteLocales } from '../routing/site-locales';

export type PreviewLinksRequest = {
  /** API key of the record's model, as sent by the Web Previews plugin. */
  itemTypeApiKey: string;
  itemId: string;
  /** The Site's origin, e.g. `https://example.com`. */
  origin: string;
  /** The draft mode secret, carried by each link. */
  secret: string;
};

export type PreviewLink = { label: string; url: string };

/**
 * The links the Web Previews plugin shows for a record: one per locale the
 * record is translated into, each entering draft mode and landing on the
 * record's Path.
 */
export async function previewLinks(
  contentClient: ContentClient,
  { itemTypeApiKey, itemId, origin, secret }: PreviewLinksRequest,
): Promise<PreviewLink[]> {
  if (itemTypeApiKey !== 'page') return [];

  const { siteSetting } = await contentClient.query(HomePageIdQuery, {});
  const homePageId = siteSetting?.homePage.id;

  const links: PreviewLink[] = [];
  for (const locale of await loadSiteLocales(contentClient)) {
    const paths = pageTreePaths(locale, await loadPageTree(contentClient, locale));
    const path = itemId === homePageId ? localeRootPath(locale) : paths.get(itemId);
    if (!path) continue;

    const url = new URL('/api/draft/enable', origin);
    url.searchParams.set('secret', secret);
    url.searchParams.set('path', path);
    links.push({ label: `Draft (${locale})`, url: url.toString() });
  }
  return links;
}
