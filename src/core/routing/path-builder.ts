/*
 * The one module that computes Paths. The resolver, breadcrumbs, preview
 * links, and later links, sitemap, hreflang and llms.txt, all build Paths
 * here so they never disagree (ADR-0001).
 */

/** A Page's place in the Page tree, in one locale. */
export type PageTreeEntry = { id: string; slug: string; title: string; parentId: string | null };

/** The per-model setting that gives a Routable model's records their Paths. */
export type RoutingRule = {
  /** API key of the Routable model. */
  model: string;
  mainPageId: string;
  /** Path segments after the locale, or `null` to fall back to the Main page's Path. */
  prefix: string | null;
};

/** A step in the breadcrumbs, the last being the current record. */
export type Breadcrumb = { title: string; path: string };

export function localeRootPath(locale: string): string {
  return `/${locale}`;
}

export function pathFromSegments(locale: string, segments: string[]): string {
  return [localeRootPath(locale), ...segments].join('/');
}

/**
 * The Path of every Page translated into `locale`, keyed by Page id. A Page's
 * Path joins its ancestors' slugs, so a Page whose ancestor lacks a
 * translation has no Path in that locale. The Home page keeps its own Path
 * here, which redirects to the locale root.
 */
export function pageTreePaths(locale: string, pages: PageTreeEntry[]): Map<string, string> {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const paths = new Map<string, string | null>();

  function pathOf(id: string): string | null {
    const known = paths.get(id);
    if (known !== undefined) return known;

    const page = pagesById.get(id);
    let path: string | null = null;
    if (page) {
      const parentPath = page.parentId ? pathOf(page.parentId) : localeRootPath(locale);
      if (parentPath !== null) path = `${parentPath}/${page.slug}`;
    }
    paths.set(id, path);
    return path;
  }

  return new Map(
    pages.flatMap((page) => {
      const path = pathOf(page.id);
      return path === null ? [] : [[page.id, path] as const];
    }),
  );
}

/** The Pages of one locale, with the Paths they are served at and their breadcrumbs. */
export type LocalePages = {
  /** The Page whose own Path is `path`, the Home page included. */
  pageAt(path: string): string | undefined;
  /** Where a Page is served: the locale root for the Home page; `null` without a translation. */
  servedPath(id: string): string | null;
  /** The base of a Routing rule's record Paths: its prefix, else its Main page's served Path. */
  recordBasePath(rule: RoutingRule): string | null;
  /** The Home page, then the Page's ancestors, then the Page itself. */
  breadcrumbsOf(id: string): Breadcrumb[];
  /** The Home page, then the Main page's chain, then the record itself. */
  recordBreadcrumbs(mainPageId: string, record: Breadcrumb): Breadcrumb[];
};

export function localePages(
  locale: string,
  pages: PageTreeEntry[],
  homePageId: string | undefined,
): LocalePages {
  const treePaths = pageTreePaths(locale, pages);
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const pageIdsByPath = new Map([...treePaths].map(([id, path]) => [path, id]));

  const servedPath = (id: string) => {
    if (!treePaths.has(id)) return null;
    return id === homePageId ? localeRootPath(locale) : (treePaths.get(id) ?? null);
  };

  const crumb = (id: string): Breadcrumb[] => {
    const page = pagesById.get(id);
    const path = servedPath(id);
    return page && path ? [{ title: page.title, path }] : [];
  };

  const home = () => (homePageId ? crumb(homePageId) : []);

  function breadcrumbsOf(id: string): Breadcrumb[] {
    if (id === homePageId || !treePaths.has(id)) return [];

    const chain: string[] = [];
    for (let current: string | null = id; current; current = pagesById.get(current)?.parentId ?? null) {
      // A Page placed under the Home page already starts from it.
      if (current !== homePageId) chain.unshift(current);
    }
    return [...home(), ...chain.flatMap(crumb)];
  }

  return {
    pageAt: (path) => pageIdsByPath.get(path),
    servedPath,
    recordBasePath: (rule) =>
      rule.prefix ? pathFromSegments(locale, [rule.prefix]) : servedPath(rule.mainPageId),
    breadcrumbsOf,
    recordBreadcrumbs(mainPageId, record) {
      const parents = breadcrumbsOf(mainPageId);
      return [...(parents.length > 0 ? parents : home()), record];
    },
  };
}
