# 24: Archive search

**What to build:** Visitors explore one Routable model's records through model-specific filters. Each model's filters (field, control type, Label) are declared in Site config. The filters live in the URL, so a search can be bookmarked and shared.

Rendering:
- The unfiltered page is static.
- Filtered combinations are server-rendered, dynamic and cached briefly.
- Filtered combinations inherit the Page's indexing, are canonical to the unfiltered page and are never in the sitemap.

The first adapter uses Content Delivery API filters.

See `spec.md` (Search, SEO and indexing).

**Blocked by:** 22 (Listing Block and pagination)

**Status:** ready-for-agent

- [ ] Archive search adapter interface:
  - input: model, filters, order, page
  - output: records and total
- [ ] A Content Delivery API implementation and a fake, covered by one shared contract suite.
- [ ] Archive search Block (migration and component). Filters are rendered from Site config, and the form works without JS.
- [ ] The unfiltered page is static. Filtered requests are dynamic with a short cache.
- [ ] Filtered pages inherit the Page's meta robots, have their canonical on the unfiltered page, and are absent from the sitemap.
- [ ] Pagination works within filtered results.
- [ ] Playwright with axe covers unfiltered and filtered states.
- [ ] `block-coverage.md` is updated.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
