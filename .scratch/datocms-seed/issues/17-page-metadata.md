# 17: Page metadata

**What to build:** Every page has correct metadata for search engines and link sharing:
- title, description and share image from the native SEO field, with fallbacks per model
- favicons
- canonical, and hreflang for existing translations only
- `og:image:alt` and `article:modified_time`

See `spec.md` (SEO and indexing).

**Blocked by:** 05 (Routing rules and breadcrumbs)

**Status:** ready-for-agent

- [ ] Metadata is built from `_seoMetaTags`, with per-model fallback fields declared in Site config.
- [ ] Favicons come from DatoCMS.
- [ ] The canonical is the record's own Path from the Path builder.
- [ ] hreflang lists only locales where the record exists.
- [ ] `og:image:alt` and `article:modified_time` are present when data exists.
- [ ] Vitest covers fallbacks and hreflang with missing translations. Playwright checks `<head>` on a Page and on a record.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
