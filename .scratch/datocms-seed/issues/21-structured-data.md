# 21: Structured data

**What to build:** Search engines get JSON-LD on every Site:
- WebSite and Organization
- BreadcrumbList, following the breadcrumbs

Sites can add per-model mappings (e.g. Museum, Event) through a hook in Site config.

See `spec.md` (SEO and indexing).

**Blocked by:** 17 (Page metadata)

**Status:** ready-for-agent

- [ ] WebSite and Organization JSON-LD are present on every page.
- [ ] BreadcrumbList matches the rendered breadcrumbs, built with the Path builder.
- [ ] A per-model JSON-LD hook in Site config adds Site-specific types.
- [ ] Playwright parses the JSON-LD on a Page and on a record.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
