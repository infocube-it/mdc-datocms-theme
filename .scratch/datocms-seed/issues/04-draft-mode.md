# 04: Draft mode

**What to build:** An Editor clicks a preview link in DatoCMS (Web Previews plugin) and sees the latest draft of the record on the Site, never cached. Visitors keep seeing published content.

See `spec.md` (Rendering, preview and cache stories; Content client).

**Blocked by:** 02 (Page tree routing and locales)

**Status:** ready-for-agent

- [ ] The Web Previews plugin endpoint returns preview links for Pages, built with the Path builder, for each locale that has a translation.
- [ ] Entering draft mode is protected by a secret. Exiting is possible from the Site.
- [ ] In draft mode, the content client reads draft content and bypasses the cache.
- [ ] Outside draft mode, published content is served.
- [ ] Playwright verifies that a draft change is visible in draft mode and not visible to a Visitor.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
