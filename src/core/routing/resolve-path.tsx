import type { ContentClient } from '../content/content-client';
import { graphql, type ResultOf } from '../content/graphql';
import { RecordMetadataFragment, recordMetadata } from '../metadata';
import { PageTemplate, PageTemplateFragment } from '../templates/page-template';
import { loadPageTree } from './page-tree';
import { type Breadcrumb, type LocalePages, localePages, pathFromSegments } from './path-builder';
import { type Redirect, redirectToLocaleRoot } from './redirect';
import { type RoutableModel, type RoutableRecord, routableRecord } from './routable-model';
import { loadRoutingRules } from './routing-rules';
import { loadSiteLocales, type SiteLocale } from './site-locales';

export const HomePageIdQuery = graphql(`
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
        id
        title
        ...PageTemplateFragment
        ...RecordMetadataFragment
      }
    }
  `,
  [PageTemplateFragment, RecordMetadataFragment],
);

type PageData = NonNullable<ResultOf<typeof PageByIdQuery>['page']>;

const pageModel = {
  title: (page: PageData) => page.title,
  render: (page: PageData) => <PageTemplate data={page} />,
  metadata: (page: PageData) => recordMetadata(page),
};

export type PathRequest = { locale: string; segments: string[] };

export type PathResolution =
  | { kind: 'record'; record: RoutableRecord; breadcrumbs: Breadcrumb[] }
  | Redirect
  | { kind: 'not-found' };

const notFound: PathResolution = { kind: 'not-found' };

/**
 * Turns a requested (locale, segments) pair into what the Site must answer:
 * a Page first, then a record of the Routable models in `routableModels`
 * order, so the first model wins when records of several claim one Path.
 */
export async function resolvePath(
  contentClient: ContentClient,
  routableModels: readonly RoutableModel[],
  { locale, segments }: PathRequest,
): Promise<PathResolution> {
  const siteLocale = (await loadSiteLocales(contentClient)).find((candidate) => candidate === locale);
  if (!siteLocale) return notFound;

  const { siteSetting } = await contentClient.query(HomePageIdQuery, {});
  const homePageId = siteSetting?.homePage.id;
  const pages = localePages(siteLocale, await loadPageTree(contentClient, siteLocale), homePageId);

  if (segments.length === 0) {
    return homePageId ? resolvePage(contentClient, siteLocale, pages, homePageId) : notFound;
  }

  const requestedPath = pathFromSegments(siteLocale, segments);
  const pageId = pages.pageAt(requestedPath);
  if (pageId && pageId === homePageId) return redirectToLocaleRoot(siteLocale, { permanent: true });
  if (pageId) return resolvePage(contentClient, siteLocale, pages, pageId);

  return resolveRecord(contentClient, routableModels, siteLocale, pages, requestedPath);
}

async function resolvePage(
  contentClient: ContentClient,
  locale: SiteLocale,
  pages: LocalePages,
  id: string,
): Promise<PathResolution> {
  const { page } = await contentClient.query(PageByIdQuery, { locale, id });
  if (!page) return notFound;
  return { kind: 'record', record: routableRecord(pageModel, page), breadcrumbs: pages.breadcrumbsOf(id) };
}

async function resolveRecord(
  contentClient: ContentClient,
  routableModels: readonly RoutableModel[],
  locale: SiteLocale,
  pages: LocalePages,
  requestedPath: string,
): Promise<PathResolution> {
  if (routableModels.length === 0) return notFound;
  const rules = await loadRoutingRules(contentClient, locale);

  for (const model of routableModels) {
    const rule = rules.get(model.apiKey);
    const basePath = rule && pages.recordBasePath(rule);
    if (!rule || !basePath || !requestedPath.startsWith(`${basePath}/`)) continue;

    const slug = requestedPath.slice(basePath.length + 1);
    if (slug.includes('/')) continue;

    const record = await model.find(contentClient, { locale, slug });
    if (record) {
      const breadcrumbs = pages.recordBreadcrumbs(rule.mainPageId, { title: record.title, path: requestedPath });
      return { kind: 'record', record, breadcrumbs };
    }
  }
  return notFound;
}
