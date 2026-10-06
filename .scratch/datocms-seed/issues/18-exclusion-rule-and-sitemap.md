# 18: Exclusion rule and sitemap

**What to build:** SEO consultants exclude content from search engines with one switch: a `noindex` record gets meta robots `noindex` and is left out of the sitemap. They can also exclude:
- a whole section, with "also exclude sub-pages" on a Page
- whole models, from Site config

Search engines get a sitemap index with one sitemap per Routable model, split past 50,000 URLs, with `lastmod`.

See `spec.md` (SEO and indexing).

**Blocked by:** 17 (Page metadata)

**Status:** ready-for-agent

- [ ] A migration adds two Page flags: "also exclude sub-pages" and "exclude from llms.txt only". The second flag only takes effect in ticket 19.
- [ ] One exclusion function considers the record's `noindex`, ancestor Pages with "also exclude sub-pages", and model exclusion in Site config.
- [ ] Excluded records get meta robots `noindex` and are absent from the sitemap.
- [ ] Sitemap index plus one sitemap per Routable model.
- [ ] Each sitemap splits at 50,000 URLs and has `lastmod` from the record.
- [ ] Sitemaps contain no hreflang, and no records missing in that locale.
- [ ] Vitest covers the exclusion rule and splitting. Playwright fetches the sitemap index from the test project.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
