import type { ContentClient } from '../content/content-client';
import { graphql, type ResultOf } from '../content/graphql';
import { RecordMetadataFragment } from '../metadata';
import { PageTemplateFragment } from '../templates/page-template';
import { loadPageTree } from './page-tree';
import { pageTreePaths, pathFromSegments } from './path-builder';
import { type Redirect, redirectToLocaleRoot } from './redirect';
import { loadSiteLocales, type SiteLocale } from './site-locales';

const HomePageIdQuery = graphql(`
  query HomePageId {
    siteSetting {
      homePage {
        id
      }
    }
  }
`);

const PageByIdQuery = graphql(
  `
    query PageById($locale: SiteLocale!, $id: ItemId!) {
      page(locale: $locale, filter: { id: { eq: $id }, _locales: { allIn: [$locale] } }) {
        __typename
        id
        ...PageTemplateFragment
        ...RecordMetadataFragment
      }
    }
  `,
  [PageTemplateFragment, RecordMetadataFragment],
);

export type RoutableRecord = NonNullable<ResultOf<typeof PageByIdQuery>['page']>;

export type PathRequest = { locale: string; segments: string[] };

export type PathResolution = { kind: 'record'; record: RoutableRecord } | Redirect | { kind: 'not-found' };

const notFound: PathResolution = { kind: 'not-found' };

/** Turns a requested (locale, segments) pair into what the Site must answer. */
export async function resolvePath(
  contentClient: ContentClient,
  { locale, segments }: PathRequest,
): Promise<PathResolution> {
  const siteLocale = (await loadSiteLocales(contentClient)).find((candidate) => candidate === locale);
  if (!siteLocale) return notFound;

  const { siteSetting } = await contentClient.query(HomePageIdQuery, {});
  const homePageId = siteSetting?.homePage.id;

  if (segments.length === 0) {
    return homePageId ? resolvePage(contentClient, siteLocale, homePageId) : notFound;
  }

  const requestedPath = pathFromSegments(siteLocale, segments);
  const paths = pageTreePaths(siteLocale, await loadPageTree(contentClient, siteLocale));
  const pageId = [...paths].find(([, path]) => path === requestedPath)?.[0];
  if (!pageId) return notFound;

  if (pageId === homePageId) {
    return redirectToLocaleRoot(siteLocale, { permanent: true });
  }
  return resolvePage(contentClient, siteLocale, pageId);
}

async function resolvePage(
  contentClient: ContentClient,
  locale: SiteLocale,
  id: string,
): Promise<PathResolution> {
  const { page } = await contentClient.query(PageByIdQuery, { locale, id });
  return page ? { kind: 'record', record: page } : notFound;
}
