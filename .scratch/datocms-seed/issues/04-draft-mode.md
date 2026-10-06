# 04: Draft mode

**What to build:** An Editor clicks a preview link in DatoCMS (Web Previews plugin) and sees the latest draft of the record on the Site, never cached. Visitors keep seeing published content.

See `spec.md` (Rendering, preview and cache stories; Content client).

**Blocked by:** 02 (Page tree routing and locales)

**Status:** resolved

- [x] The Web Previews plugin endpoint returns preview links for Pages, built with the Path builder, for each locale that has a translation.
- [x] Entering draft mode is protected by a secret. Exiting is possible from the Site.
- [x] In draft mode, the content client reads draft content and bypasses the cache.
- [x] Outside draft mode, published content is served.
- [x] Playwright verifies that a draft change is visible in draft mode and not visible to a Visitor.
- [x] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.

## Answer

Implemented on `develop`. Routes: `/api/draft/enable?secret=…&path=…` (checks `DRAFT_MODE_SECRET`, then redirects to a path on the Site only), `/api/draft/disable` (no secret; sends to `/`), and `POST /api/preview-links?secret=…`, the Web Previews plugin endpoint, with CORS for the DatoCMS dashboard. The locale layout shows an "exit draft mode" link in draft mode (a new Label).

The Core decides draft or published per query in the DatoCMS content client: draft mode sends `X-Include-Drafts` and a no-store fetch. Outside a request (build time) there is no draft mode, so it reads published content. `previewLinks` builds one "Draft (locale)" link per translated locale with the Path builder; the Home page links to the locale root. It reads drafts even without the Editor's cookie, so a new, unpublished Page gets its links. Only Pages have links for now; other Routable models add theirs in their own tickets.

Decisions taken while implementing:
- one CDA token serves both published and draft reads (the header decides), so the only new secret is `DRAFT_MODE_SECRET`;
- the secret travels in the plugin URL and in each link, visible to Editors only;
- the test project gets a sample Page with an unpublished draft (`migrations/1759860000_draft_sample_page.ts`), which the e2e tests read; Playwright loads `.env.local` for the secret.

`docs/new-site.md` gains the secret in steps 3, 7 and 8 and a new step 9 for the plugin. `DRAFT_MODE_SECRET` must also be added to this repository's GitHub secrets for CI. Vitest (37) and Playwright (15) pass on 2026-10-06.
