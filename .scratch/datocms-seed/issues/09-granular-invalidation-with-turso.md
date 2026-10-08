# 09: Granular invalidation with Turso

**What to build:** On a Site set to `granular` mode (Capodimonte), a publish regenerates only the pages whose queries depend on the changed content.

How it works:
- Fetches are tagged with a query ID.
- An index store records "DatoCMS cache tag → query ID". The store sits behind an adapter; Turso is the implementation.
- The webhook revalidates only the matching queries.

Safety rules:
- Failures and oversized matches fall back to a global revalidation.
- A delayed second CDN purge covers purges that were rate-limited and dropped.
- The index is insert-only and is wiped only together with a full revalidation: on code deploy, deploy rollback and environment promotion.

See `spec.md` (Cache and invalidation) and ADR-0002.

**Blocked by:** 08 (Global cache invalidation and deploy contexts), 03 (Logging adapter and Labels)

**Status:** resolved

- [x] In `granular` mode, each CDA fetch carries a global tag and a query-ID tag. The cache tags DatoCMS returns are recorded in the index store.
- [x] Index store adapter interface: insert mappings, look up query IDs by tags, wipe.
- [x] Turso/libSQL implementation, with credentials from environment variables.
- [x] An in-memory fake. One shared contract suite runs against the fake and against libSQL on a local file.
- [x] The webhook revalidates matching query IDs. A lookup failure or a match above the threshold falls back to the global tag and is logged.
- [x] A delayed second CDN purge is scheduled after each invalidation.
- [x] The index is wiped together with a full revalidation on code deploy, deploy rollback and DatoCMS environment promotion.
- [x] Each DatoCMS environment has its own index.
- [x] Vitest covers the granular, fallback and delayed-purge paths through the webhook handler.
- [x] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
