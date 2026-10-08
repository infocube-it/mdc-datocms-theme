# 05: Routing rules and breadcrumbs

**What to build:** Records of Routable models other than Page get their own Paths, e.g. `/it/articolo/<slug>`. The Path comes from a Routing rule the Editor manages in DatoCMS. Breadcrumbs place each record under its Main page.

Path rules:
- An empty prefix falls back to the Main page's Path.
- When two records claim the same Path, the first model in the Site config order wins.

See `spec.md` (Routing) and ADR-0001.

**Blocked by:** 02 (Page tree routing and locales)

**Status:** resolved

- [x] A migration adds the Routing rule model: model, Main page, localized prefix.
- [x] The test project gets a sample Routable model (e.g. article) with a localized slug and a native SEO field.
- [x] Path builder and resolver handle Routing rules: localized prefix plus slug, with an empty prefix → the Main page's Path.
- [x] Adding a Routable model needs only a Routing rule and Site config, not resolver changes.
- [x] Path collisions across models resolve by the Site config model order.
- [x] Breadcrumbs render the Main page chain for records and the ancestor chain for Pages.
- [x] Vitest covers prefix, empty prefix, collisions and breadcrumbs. Playwright covers a sample record.
- [x] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.

## Answer

Implemented on `develop`. A Site declares each Routable model other than Page with `defineRoutableModel` (API key, `findBySlug`, title, template, optional metadata) and lists it in `SiteConfig.routableModels`; the list order decides collisions. The resolver tries Pages first, then each listed model whose Routing rule gives a base Path matching the requested Path minus one slug segment; the first model with a record wins. The Seed's sample is `src/site/models/article.tsx`.

The Path builder (`localePages`) now gives the Path a Page is served at (the locale root for the Home page), the base Path of a Routing rule (the prefix, else the Main page's served Path) and the breadcrumbs. A resolved record carries its breadcrumbs: the Home page, then the Page's ancestors or the record's Main page chain, then the record. The Home page has none. `Breadcrumbs` renders them in a `nav` labelled by the new `breadcrumb` Label, marked `data-datocms-noindex`.

Decisions taken while implementing:
- the Routing rule's `model` is a select of API keys (enum validator): a Site adding a Routable model adds its key in a migration;
- a prefix may have several segments (`eventi/evento`); stray slashes and spaces are dropped, an empty prefix falls back per locale;
- a resolved record carries its rendered template, title and metadata, so the Core no longer switches on `__typename` (ADR-0001 amended);
- a model listed in the Site config without a Routing rule has no Paths, silently;
- the Home page's title is the first breadcrumb, so no new Label is needed for it.

Not done here, logged in `deferred.md`: preview links for records of other models, and a hint about a prefix filled in only some locales. The article's SEO field isn't read yet: the metadata builder is ticket 17.

The migration ran on the sandbox `ticket-05-routing`, as the Dev Container's CMA token can't touch primary; `schema.graphql` comes from that sandbox. Primary needs the sandbox promoted before this code deploys: without the Routing rule model, every Path that isn't a Page fails instead of answering 404. `docs/new-site.md` gains the sandbox-only role (step 2), the new models (step 4) and how to add a Routable model (step 5). Vitest (57) passes on 2026-10-08; Playwright (20) passes against the sandbox, with the CDA client temporarily pointed at it.
