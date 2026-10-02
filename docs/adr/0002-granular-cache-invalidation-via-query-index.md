# Granular cache invalidation via a query-ID tag index, with a global fallback

DatoCMS only reveals which content a query depends on through the cache tags in its *response*, while Next.js needs a fetch's tags *before* the request and caps them at 128 (DatoCMS can return up to 500). So DatoCMS tags can't be attached to fetches directly. We tag every CDA fetch with a global tag and a query-ID tag, record "DatoCMS tag → query ID" in a persistent index, and on the `cda_cache_tags` webhook revalidate only the matching queries with stale-while-revalidate semantics. That is why a Site carries a database whose only job is caching. See `docs/research/granular-cache-tags.md`.

## Decisions

- **Two independent settings.** The *invalidation mode* is `global` (one tag, whole cache revalidated on every publish, as in the official starters) or `granular` (query index). The *index store* is chosen separately and only matters in `granular` mode.
- **Index store behind an adapter.** The Core defines an index-store interface. Turso/libSQL is the only adapter implemented now; Netlify Database and others can be added without touching the invalidation logic.
- **Fail safe towards over-invalidation.** If the index lookup fails or matches too many queries, fall back to revalidating the global tag.
- **Insert-only index.** The webhook never deletes index rows, which avoids the lost-update window in DatoCMS's reference starter. The index is wiped only together with a full global revalidation: on code deploy, deploy rollback and DatoCMS environment promotion.

## Considered Options

- **Global tag only.** Simple and always correct, but every publish regenerates the whole Site. Kept as the default mode, so a freshly created Site works with no external database; Sites that need it (the first, Capodimonte) switch to `granular`.
- **Semantic tags computed by us** (per model, record, locale). Rejected: linked records, uploads, locale fallbacks and global settings create hidden dependencies, so invalidations would be missed.
- **Netlify CDN cache tags set by hand.** Rejected: on pages the Netlify runtime overwrites the `Netlify-Cache-Tag` header with Next's own tags.
- **Netlify Blobs as the index.** Rejected: no secondary index, last-write-wins.

## Consequences

- Tags must stay within `[a-z0-9:_.-]`, because Netlify encodes page tags but not purge requests.
- The Netlify runtime silently swallows rate-limited CDN purges, so the webhook handler schedules a delayed second purge.
