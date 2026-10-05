# 02: Page tree routing and locales

**What to build:** Visitors can reach every Page at its localized Path, which follows the Page tree. Locales come from DatoCMS.

The ticket introduces:
- the Path builder, the one module that computes Paths
- the resolver, which turns (locale, segments) into a record, a redirect or not found

Locale handling:
- `/` redirects to the Visitor's browser language when the Site offers it.
- A missing translation is a 404.
- The Home page's own Path redirects to the locale root.

See `spec.md` (Routing) and ADR-0001.

**Blocked by:** 01 (Walking skeleton)

**Status:** resolved

- [x] Locales are read from `_site.locales`; the first is the default; every URL is locale-prefixed.
- [x] A Page's Path is built from its ancestors' localized slugs, following DatoCMS hierarchical sorting, at any depth.
- [x] `/` answers 302 to the browser's preferred locale when available, else to the default locale.
- [x] A Page without a translation in the requested locale answers 404.
- [x] The Home page is served at `/<locale>`, and its own Path answers 308 to `/<locale>` (Next.js can't send 301 from a page; agreed on 2026-10-05).
- [x] An unknown Path answers 404.
- [x] Vitest (fake content client) covers nested Paths, missing translations, the Home page and unknown Paths. Playwright covers the redirects and a nested Page on the test project.

## Answer

Implemented on `develop`. The Path builder is `src/core/routing/path-builder.ts`; the resolver loads the whole Page tree of a locale (in batches of 500) and matches the requested Path against it. Pages became a DatoCMS tree with optional translations (migration `1759770000_page_tree.ts`, which also seeds a nested sample tree). `/` is a route handler answering 302 with `Vary: Accept-Language`; the Home page's own Path answers 308, since Next.js page redirects can't send 301 (spec updated). Pages placed under the Home page get Paths under its slug (`/it/home/...`). Vitest (15) and Playwright (8) pass on 2026-10-05.
