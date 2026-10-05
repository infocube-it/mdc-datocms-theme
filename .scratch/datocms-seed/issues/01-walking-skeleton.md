# 01: Walking skeleton

**What to build:** A Visitor opening `/it` on a Netlify deploy sees the Home page's title and content. The content is fetched from the DatoCMS test project through the Core.

The ticket sets up the whole path with the thinnest possible content:
- a Next.js 16 App Router app based on the official DatoCMS Next.js Starter Kit (Tailwind, gql.tada, react-datocms)
- a separate Core folder with its own public interface
- the Core content client, the single boundary to DatoCMS
- a typed Site config object
- the `[locale]/[[...slug]]` catch-all route (ADR-0001)
- versioned migrations for a minimal Site settings model (Home page link) and a Page model (title, localized slug, page-builder field)
- the three test seams agreed in the spec, running in GitHub Actions

See `spec.md` (Structure, Content client, Testing Decisions).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The app builds and deploys on Netlify; the production deploy reads from the DatoCMS primary environment.
- [x] Site code reaches the Core only through its public interface. No Site code imports Core internals.
- [x] Every DatoCMS read goes through the content client, with typed queries and a fragment per component.
- [x] A Site config object exists and the Core reads it (it can be nearly empty at this stage).
- [x] Migrations create Site settings (singleton, Home page link) and Page (title, localized slug, page-builder field) on the DatoCMS test project, and can be replayed.
- [x] `/it` (default locale) renders the Home page chosen in Site settings, server-rendered.
- [x] Vitest runs a Core test against a fake content client returning fixtures.
- [x] Playwright with axe runs against a build connected to the test project and passes on the Home page.
- [x] GitHub Actions runs Vitest and Playwright on every PR.
