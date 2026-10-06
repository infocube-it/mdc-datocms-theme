# 08: Global cache invalidation and deploy contexts

**What to build:** Visitors get static pages that refresh after an Editor publishes. While a page regenerates, Visitors keep getting the previous version. This is the `global` invalidation mode, the default for a new Site.

Every Netlify deploy context reads from its matching DatoCMS environment: production → primary, previews → sandbox.

See `spec.md` (Cache and invalidation) and ADR-0002.

**Blocked by:** 01 (Walking skeleton)

**Status:** ready-for-agent

- [ ] CDA fetches use `force-cache` with a global tag. Tags stay within `[a-z0-9:_.-]`.
- [ ] A webhook endpoint for DatoCMS `cda_cache_tags` verifies the request and revalidates the global tag with stale-while-revalidate semantics.
- [ ] A rejected or failed webhook is logged once the logging adapter exists (ticket 03). Before that, it is a no-op hook.
- [ ] Code deploys and deploy rollbacks start from a fully revalidated cache.
- [ ] The deploy context → DatoCMS environment mapping is applied, and previews never read production content.
- [ ] The invalidation mode is a Site config setting, defaulting to `global`.
- [ ] Vitest drives the webhook handler and asserts the recorded revalidation calls.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
