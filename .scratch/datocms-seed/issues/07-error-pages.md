# 07: Error pages

**What to build:** Visitors who hit a missing Path see a 404 page whose content Editors write and translate in DatoCMS. Visitors hitting a server error see a static 500 page in their language.

The 404 Page is chosen in Site settings. If it is missing, a static fallback is shown. The 500 page is static and translated through Labels.

See `spec.md` (Routing).

**Blocked by:** 02 (Page tree routing and locales), 03 (Logging adapter and Labels)

**Status:** ready-for-agent

- [ ] Site settings gets a 404 Page link (migration).
- [ ] A 404 response renders that Page's content in the requested locale, with status 404.
- [ ] If no 404 Page is set or it can't be fetched, a static fallback is rendered, still with status 404.
- [ ] The 500 page is static, with text from Labels.
- [ ] Playwright with axe covers the 404 page.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
