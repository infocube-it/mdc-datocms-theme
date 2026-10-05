import type { ContentClient } from '../content/content-client';
import { graphql, type ResultOf } from '../content/graphql';
import { RecordMetadataFragment } from '../metadata';
import { PageTemplateFragment } from '../templates/page-template';

const SiteLocalesQuery = graphql(`
  query SiteLocales {
    _site {
      locales
    }
  }
`);

const HomePageQuery = graphql(
  `
    query HomePage($locale: SiteLocale!) {
      siteSetting(locale: $locale) {
        homePage {
          __typename
          id
          ...PageTemplateFragment
          ...RecordMetadataFragment
        }
      }
    }
  `,
  [PageTemplateFragment, RecordMetadataFragment],
);

type SiteLocale = ResultOf<typeof SiteLocalesQuery>['_site']['locales'][number];

export type RoutableRecord = NonNullable<ResultOf<typeof HomePageQuery>['siteSetting']>['homePage'];

export type PathRequest = { locale: string; segments: string[] };

export type PathResolution = { kind: 'record'; record: RoutableRecord } | { kind: 'not-found' };

/** Turns a requested (locale, segments) pair into what the Site must answer. */
export async function resolvePath(
  contentClient: ContentClient,
  { locale, segments }: PathRequest,
): Promise<PathResolution> {
  if (segments.length > 0) return { kind: 'not-found' };

  const { _site } = await contentClient.query(SiteLocalesQuery, {});
  const siteLocale = _site.locales.find((candidate) => candidate === locale);
  if (!siteLocale) return { kind: 'not-found' };

  return resolveHomePage(contentClient, siteLocale);
}

async function resolveHomePage(
  contentClient: ContentClient,
  locale: SiteLocale,
): Promise<PathResolution> {
  const { siteSetting } = await contentClient.query(HomePageQuery, { locale });
  if (!siteSetting) return { kind: 'not-found' };

  return { kind: 'record', record: siteSetting.homePage };
}
