# 23: Site search

**What to build:** Visitors search the whole Site by free text from a Page holding the Site search Block. Results are rendered on the server through the Site search adapter. The first implementation is DatoCMS Site Search, which keeps the search token on the server.

Rules for results:
- always `noindex`
- never cached
- the search Path is disallowed for third-party crawlers
- a rate-limit response shows a friendly message, not a 500

The search Page without a query follows its own SEO settings.

See `spec.md` (Search) and `docs/research/datocms-site-search.md`.

**Blocked by:** 10 (Block renderer and Structured Text), 17 (Page metadata), 20 (robots.txt and non-production guards)

**Status:** ready-for-agent

- [ ] Site search adapter interface:
  - input: query, locale, page, optional models
  - output: results (title, Path, excerpt), total and pagination
  - declares `runs: server | browser` and `canNarrowByModel`
- [ ] DatoCMS implementation, server-side, `canNarrowByModel: false`. The CMA token never reaches the browser.
- [ ] A fake implementation exists. One shared contract suite covers both.
- [ ] The UI shows the model filter only when the adapter supports it.
- [ ] Results (`?q=`) are always `noindex`, regardless of the Page's settings, and are never cached.
- [ ] The Seed default robots.txt rules disallow the search Path.
- [ ] A DatoCMS rate-limit response renders a friendly message from Labels and is logged.
- [ ] The search form works without JS. Playwright with axe covers the search Page and its results.
- [ ] `block-coverage.md` is updated.
