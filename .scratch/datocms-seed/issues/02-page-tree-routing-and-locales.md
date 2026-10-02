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

**Status:** ready-for-agent

- [ ] Locales are read from `_site.locales`; the first is the default; every URL is locale-prefixed.
- [ ] A Page's Path is built from its ancestors' localized slugs, following DatoCMS hierarchical sorting, at any depth.
- [ ] `/` answers 302 to the browser's preferred locale when available, else to the default locale.
- [ ] A Page without a translation in the requested locale answers 404.
- [ ] The Home page is served at `/<locale>`, and its own Path answers 301 to `/<locale>`.
- [ ] An unknown Path answers 404.
- [ ] Vitest (fake content client) covers nested Paths, missing translations, the Home page and unknown Paths. Playwright covers the redirects and a nested Page on the test project.
