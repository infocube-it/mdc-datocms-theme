/*
 * The one module that computes Paths. The resolver, and later links, sitemap,
 * hreflang, preview links, breadcrumbs and llms.txt, all build Paths here so
 * they never disagree (ADR-0001).
 */

/** A Page's place in the Page tree, in one locale. */
export type PageTreeEntry = { id: string; slug: string; parentId: string | null };

export function localeRootPath(locale: string): string {
  return `/${locale}`;
}

export function pathFromSegments(locale: string, segments: string[]): string {
  return [localeRootPath(locale), ...segments].join('/');
}

/**
 * The Path of every Page translated into `locale`, keyed by Page id. A Page's
 * Path joins its ancestors' slugs, so a Page whose ancestor lacks a
 * translation has no Path in that locale.
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
