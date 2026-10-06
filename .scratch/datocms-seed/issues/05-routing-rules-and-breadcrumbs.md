# 05: Routing rules and breadcrumbs

**What to build:** Records of Routable models other than Page get their own Paths, e.g. `/it/articolo/<slug>`. The Path comes from a Routing rule the Editor manages in DatoCMS. Breadcrumbs place each record under its Main page.

Path rules:
- An empty prefix falls back to the Main page's Path.
- When two records claim the same Path, the first model in the Site config order wins.

See `spec.md` (Routing) and ADR-0001.

**Blocked by:** 02 (Page tree routing and locales)

**Status:** ready-for-agent

- [ ] A migration adds the Routing rule model: model, Main page, localized prefix.
- [ ] The test project gets a sample Routable model (e.g. article) with a localized slug and a native SEO field.
- [ ] Path builder and resolver handle Routing rules: localized prefix plus slug, with an empty prefix → the Main page's Path.
- [ ] Adding a Routable model needs only a Routing rule and Site config, not resolver changes.
- [ ] Path collisions across models resolve by the Site config model order.
- [ ] Breadcrumbs render the Main page chain for records and the ancestor chain for Pages.
- [ ] Vitest covers prefix, empty prefix, collisions and breadcrumbs. Playwright covers a sample record.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
