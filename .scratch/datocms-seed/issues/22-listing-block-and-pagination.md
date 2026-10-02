# 22: Listing Block and pagination

**What to build:** Editors add a Listing Block that shows records of one Routable model, with:
- a page size
- an order
- one linked-record filter
- pinned items

Visitors page through it under a localized suffix (`/it/articoli/pagina/2`).

Indexing of later pages:
- They inherit the hosting Page's indexing setting.
- They are self-canonical.
- They are never in the sitemap.

See `spec.md` (Routing, SEO and indexing, Blocks).

**Blocked by:** 10 (Block renderer and Structured Text), 18 (Exclusion rule and sitemap)

**Status:** ready-for-agent

- [ ] Listing Block migration and component, with the `dato-block` wrapper.
- [ ] Pinned items come first, then the ordered and filtered records. Excluded models still list normally.
- [ ] The resolver recognises the localized pagination suffix, with the word from Labels. An out-of-range page answers 404.
- [ ] Later pages inherit the Page's meta robots, are self-canonical and are absent from the sitemap.
- [ ] Pagination is server-rendered and works without JS.
- [ ] Vitest covers pagination resolution. Playwright with axe covers page 1 and page 2.
- [ ] `block-coverage.md` is updated.
