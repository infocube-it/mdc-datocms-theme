import type { ContentClient } from '../content/content-client';
import { graphql, type ResultOf } from '../content/graphql';

const SiteLocalesQuery = graphql(`
  query SiteLocales {
    _site {
      locales
    }
  }
`);

export type SiteLocale = ResultOf<typeof SiteLocalesQuery>['_site']['locales'][number];

/** The Site's locales as set in DatoCMS; the first is the default. */
export async function loadSiteLocales(contentClient: ContentClient): Promise<SiteLocale[]> {
  const { _site } = await contentClient.query(SiteLocalesQuery, {});
  return _site.locales;
}
