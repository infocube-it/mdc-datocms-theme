import { createFakeContentClient } from '@/core/testing';

type Translations = Partial<Record<string, string>>;

export type FakePage = {
  id: string;
  parentId?: string;
  /** One entry per locale the Page is translated into. */
  slug: Translations;
  title: Translations;
};

export type FakeRoutingRule = {
  model: string;
  mainPageId: string;
  /** One entry per locale the prefix is translated into. */
  prefix: Translations;
};

export type FakeSiteContent = {
  locales: string[];
  homePageId?: string;
  pages: FakePage[];
  routingRules?: FakeRoutingRule[];
};

/**
 * A fake content client answering the Core's queries from a small in-memory
 * Site, the way DatoCMS would: a Page exists in a locale only if translated.
 */
export function fakeSiteContentClient({ locales, homePageId, pages, routingRules = [] }: FakeSiteContent) {
  const translatedIn = (locale: string) => pages.filter((page) => page.slug[locale] !== undefined);

  return createFakeContentClient({
    SiteLocales: () => ({ _site: { locales } }),
    HomePageId: () => ({ siteSetting: homePageId ? { homePage: { id: homePageId } } : null }),
    PageTree: (variables) => {
      const { locale, first, skip } = variables as { locale: string; first: number; skip: number };
      const translatedPages = translatedIn(locale);
      return {
        allPages: translatedPages.slice(skip, skip + first).map((page) => ({
          id: page.id,
          slug: page.slug[locale],
          title: page.title[locale],
          parent: page.parentId ? { id: page.parentId } : null,
        })),
        _allPagesMeta: { count: translatedPages.length },
      };
    },
    RoutingRules: (variables) => {
      const { locale } = variables as { locale: string };
      return {
        allRoutingRules: routingRules.map((rule) => ({
          model: rule.model,
          prefix: rule.prefix[locale] ?? null,
          mainPage: { id: rule.mainPageId },
        })),
      };
    },
    PageById: (variables) => {
      const { locale, id } = variables as { locale: string; id: string };
      const page = translatedIn(locale).find((candidate) => candidate.id === id);
      return {
        page: page ? { __typename: 'PageRecord', id: page.id, title: page.title[locale] } : null,
      };
    },
  });
}
