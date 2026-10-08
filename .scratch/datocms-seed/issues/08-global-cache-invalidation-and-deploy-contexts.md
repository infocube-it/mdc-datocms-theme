# 08: Global cache invalidation and deploy contexts

**What to build:** Visitors get static pages that refresh after an Editor publishes. While a page regenerates, Visitors keep getting the previous version. This is the `global` invalidation mode, the default for a new Site.

Every Netlify deploy context reads from its matching DatoCMS environment: production → primary, previews → sandbox.

A staging Site shows new work to the client without touching production. It is the Netlify deploy of the `develop` branch, reading a long-lived `develop` sandbox where new migrations run first. The environment is chosen by an environment variable (e.g. `DATOCMS_ENVIRONMENT`); without it, the Site reads primary. Content written in the sandbox never flows back to primary (promoting a sandbox replaces primary whole), so staging is for new code and schema, not for preparing content.

See `spec.md` (Cache and invalidation) and ADR-0002.

**Blocked by:** 01 (Walking skeleton)

**Status:** resolved

- [x] CDA fetches use `force-cache` with a global tag. Tags stay within `[a-z0-9:_.-]`.
- [x] A webhook endpoint for DatoCMS `cda_cache_tags` verifies the request and revalidates the global tag with stale-while-revalidate semantics.
- [x] A rejected or failed webhook is logged once the logging adapter exists (ticket 03). Before that, it is a no-op hook.
- [x] Code deploys and deploy rollbacks start from a fully revalidated cache.
- [x] The deploy context → DatoCMS environment mapping is applied, and previews never read production content.
- [x] An environment variable selects the DatoCMS environment for every CDA read, draft mode included; unset means primary.
- [x] A staging Site (the `develop` branch deploy) reads the `develop` sandbox. The manual covers creating the sandbox, running migrations there first, giving the CDA token's role access to it, refreshing it from primary, and the release flow to primary.
- [x] The invalidation mode is a Site config setting, defaulting to `global`.
- [x] Vitest drives the webhook handler and asserts the recorded revalidation calls.
- [x] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
