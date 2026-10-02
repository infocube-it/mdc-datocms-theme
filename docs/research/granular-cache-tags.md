# Granular cache invalidation: DatoCMS cache tags × Next.js 16 × Netlify

Research date: 2026-09-29. Builds on [`datocms-nextjs.md` §2](./datocms-nextjs.md#2-cache-management). Nothing there is repeated here unless it is needed for an argument.

Scope: a reusable Next.js 16 (App Router) + DatoCMS seed hosted on Netlify. It uses the "previous" caching model: `fetch` with `cache: 'force-cache'` + `next.tags`. Visitors get stale-while-revalidate (SWR); editors use Draft Mode.

Conventions (sources are pinned; see [Sources](#sources)):
- **[DC]** DatoCMS docs (Markdown, fetched 2026-09-29).
- **[CT]** `datocms/nextjs-with-cache-tags-starter@3a461d8` (`main`).
  - **[CT-16]** its unmerged Next 16 branches: `claude/nextjs16-upgrade-fixes@babd460` (PR #6) and `claude/elegant-heisenberg-m0vi1m@553ec17` (PR #5).
- **[NX]** Next.js docs (doc version 16.3.7).
- **[NXS]** Next.js source at tag `v16.3.7`.
- **[NL]** Netlify docs (Markdown, fetched 2026-09-29).
- **[ON]** `opennextjs/opennextjs-netlify@a60189b` (= `@netlify/plugin-nextjs` 5.16.0, 2026-09-17).
- **[NF]** `@netlify/functions@6.0.0` (`dist/main.js`).
- ⚠️ = uncertain, undocumented, version-dependent, or my own inference rather than a documented fact.

---

## Executive recommendation

1. **Use query-ID tags plus a persistent "DatoCMS tag → query ID" index.** This is the DatoCMS-documented pattern, with four fixes. It is the only granular strategy that is both *correct* and compatible with `fetch` + `force-cache`.
   - With `fetch`, `next.tags` must be known **before** the request is sent. DatoCMS tags only exist **in the response**, so they can never be attached to the fetch itself (see [§2](#2-strategies-for-granular-invalidation)). That rules out passing DatoCMS tags directly.
   - The 128-tag cap ([NX] fetch) is a second, independent blocker.
2. **Every CDA fetch carries exactly two Next tags:** `dato` (global) and `dato:q:<sha1>` (query ID). Both are lowercase ASCII with no commas, which is safe for Next, the Netlify runtime and the Netlify CDN (see [§3.4](#34-tag-encoding-pitfall-on-netlify)).
   - On Netlify these tags automatically become the page's `Netlify-Cache-Tag`.
   - `revalidateTag` both marks the Blobs-backed data cache and purges the CDN ([ON] `src/run/handlers/tags-handler.cts`, `src/run/headers.ts`).
3. **Four improvements over the DatoCMS starter:**
   - **(a) Insert-only index.** Never delete rows in the webhook. GC happens only on deploy, together with a global SWR revalidation. This closes a lost-update hole in [CT]'s delete-then-revalidate flow.
   - **(b) Fail safe.** If the index lookup fails, or matches too many queries, fall back to `revalidateTag('dato', 'max')`.
   - **(c) Use `'max'`** for visitor SWR, not `'default'` or `{ expire: 0 }`.
   - **(d) Full SWR revalidation** on Netlify *deploy succeeded / deploy restored* and on DatoCMS *environment promote*.
4. **Index store:**
   - Postgres: **Netlify Database** if the team is on a credit-based plan ([NL] netlify-database). Its per-deploy-preview branching is a bonus: previews can't pollute the production index.
   - Otherwise **Turso/libSQL**, which is what DatoCMS itself uses ([CT] `lib/database.ts`).
   - **Not Netlify Blobs:** it has no secondary index, no atomic set operations and is last-write-wins ([NL] netlify-blobs § Troubleshooting).
5. **Keep public pages static (ISR-style), so the Netlify CDN + durable cache serve them.**
   - Reading `draftMode()` does **not** make a page dynamic in 16.3.7. In `prerender-legacy` it returns an empty draft mode without tracking dynamic usage ([NXS] `packages/next/src/server/request/draft-mode.ts` L71-74).
   - This corrects the ⚠️ in `datocms-nextjs.md` §2.4. Verify with `next build` output.
6. **Netlify specifics that reshape the problem:**
   - The Next data cache is **deploy-scoped**: Blobs `getDeployStore`, and `.next/cache/fetch-cache` is deleted from the build cache ([ON] `src/run/storage/regional-blob-store.cts` L57, `src/build/cache.ts` L14).
   - The CDN cache is invalidated on every deploy ([NL] caching-overview § Automatic invalidation).
   - So "purge on deploy" is mostly automatic. Only build-time-fetched data and rollbacks need explicit handling.
7. **Do not add hand-computed "semantic" tags** (per model, per record, per locale) as an invalidation mechanism. They cannot be made complete: there is no webhook for site settings, and linked records, Structured Text links, uploads and locale fallbacks all create hidden dependencies. They add complexity for little precision. Keep only `dato`.

---

## 1. What DatoCMS cache tags represent

**Format.**
- Send `X-Cache-Tags: true` to get a space-separated `X-Cache-Tags` response header.
- Each tag is drawn from a 66-symbol alphabet: `!"#$%&@'()*+-./0123456789:;<=>?[\]^_abcdefghijklmnopqrstuvwxyz{|}~`, with "no spaces, no commas, and no uppercase letters". The alphabet is chosen to be safe on CDNs "that treat cache tags case-insensitively (such as Netlify)" ([DC] <https://www.datocms.com/docs/content-delivery-api/cache-tags-format>).

**Semantics are deliberately opaque.**
- The tags are "intentionally opaque, to prevent misinterpretation and misuse", which lets DatoCMS change its "tagging strategies in the future, without necessitating changes on your frontend" ([DC] cache-tags-format).
- If the encoding changes, DatoCMS will "automatically send an invalidation event through your existing webhook" (same page).

**Granularity.**
- Not documented. ⚠️ Whether a tag maps to a record, a field, a model, an upload or a schema element cannot be learned from primary sources, and the seed must not depend on it.
- What *is* documented:
  - "A response's cache tags cover all the content its query returns, so the more content a query returns, the more often that response is invalidated" ([DC] cache-tags-format § Granularity).
  - Tags "cover all possible invalidation scenarios", and DatoCMS tracks "every possible alteration in your schema, text, images, and videos" ([DC] cache-tags-format; [DC] cache-tags-invalidation).

**Collection queries and new records.**
- The docs state the outcome, not the mechanism. For "a blog's homepage [that] showcases the latest posts … adding a new post on DatoCMS will invalidate the homepage" ([DC] <https://www.datocms.com/docs/content-delivery-api/cache-tags> § "What will be the final cache hit ratio?").
- So a response to `allArticles` carries some tag(s) that a *create/publish* in that collection will invalidate. ⚠️ Which tag, and whether it is scoped by filter, is not documented.

**Limits and overflow.**
- At most **500 tags** and about **14 KB** of header per response.
- Beyond that, DatoCMS "replace[s] some specific tags with less granular, 'catch-all' tags". It over-invalidates rather than leaving "orphaned stale content".
- Advice: paginate or split queries to regain precision ([DC] cache-tags-format § Limits, § Granularity).

**Webhook (`cda_cache_tags` / `invalidate`).**
- The body is `{ entity_type: "cda_cache_tags", event_type: "invalidate", entity: { id: "cda_cache_tags", type: "cda_cache_tags", attributes: { tags: [...] } }, related_entities: [] }` ([DC] <https://www.datocms.com/docs/content-delivery-api/cache-tags-invalidation>).
- DatoCMS "groups invalidations over a short window, so the `tags` array has no fixed upper bound: a bulk publish can easily produce several hundred tags" (same page).
- Every webhook body also carries `site_id`, `webhook_id`, `environment`, `is_environment_primary`, `webhook_call_id`, `event_triggered_at` and `attempted_auto_retries_count` ([DC] <https://www.datocms.com/docs/general-concepts/webhooks> § The HTTP Payload). ⚠️ The `cda_cache_tags` example omits these fields, so treat them as optional.
- Delivery rules:
  - 2 s connect timeout and **8 s total** timeout.
  - Non-2xx means failed.
  - Optional auto-retry: up to 7 attempts, first after 2 min, last after 2 days ([DC] webhooks § Automatic Retry, § Webhook Timeouts).
- Webhook `filters` accept `environment` / `environment_type` ([DC] <https://www.datocms.com/docs/content-management-api/resources/webhook>).
  - ⚠️ It is undocumented whether cache tags are namespaced per environment. Dropping sandbox events could therefore only *save* work, never add correctness, and the seed should not filter (over-invalidation is harmless).

**Environment promotion.**
- An "Environment Promote" webhook event exists ([DC] <https://www.datocms.com/docs/general-concepts/primary-and-sandbox-environments> § Promotion).
- ⚠️ The webhooks page only lists `deploy_*` events for the Environment entity, which contradicts this.
- ⚠️ Whether a promotion also emits `cda_cache_tags` invalidations is undocumented. Assume it doesn't, and do a full revalidation.

**DatoCMS's own stance.**
- For Next.js, DatoCMS says "you cannot hand DatoCMS tags to Next.js directly", because of the 128-tag `fetch` cap. Its guide uses "a single synthetic identifier and … a 'query ID to cache tags' mapping in a persistent database".
- It recommends Cloudflare/Netlify/Fastly because they keep all 500 tags verbatim ([DC] <https://www.datocms.com/docs/content-delivery-api/cache-tags-integrations>).
- Netlify "accepts exactly 500" tags per response, and its purge is limited to "twice every five seconds, per tag or per site" (same page; [NL] caching-overview § Purge by cache tag).

## 2. Strategies for granular invalidation

### Two structural facts that decide most of the comparison

- **F1: `next.tags` are fixed before the network call.** They are an argument of `fetch()`, validated and stored with the data-cache entry ([NXS] `packages/next/src/server/lib/patch-fetch.ts` `validateTags`, L89-125).
  - There is no API to add tags to a `fetch` cache entry after the response arrives.
  - Response-derived tags can only be attached with `cacheTag()` inside `'use cache'`, which is the Cache Components model ([NX] cacheTag). The seed does not use that model.
- **F2: on Netlify you cannot replace Next's cache handler.**
  - The runtime overwrites `config.cacheHandler` with its own Blobs-backed handler at request time ([ON] `src/run/config.ts` L41-56).
  - So "a custom cacheHandler that understands DatoCMS tags" is not an option on Netlify.

### (a) Pass DatoCMS tags directly as Next tags

- **Correctness:** ❌ in the `fetch` model, because of F1: the tags are unknown when `fetch()` is called.
  - Even under Cache Components (`cacheTag(...datoTags)` after the call), three things break:
    - `cacheTag` drops everything past the 128th tag of a call, with a warning ([NX] cacheTag § Limits; [NXS] `validateTags`). ⚠️ Whether several calls can exceed 128 per entry is undocumented.
    - **Truncation is unsafe.** Every dropped tag is a change that will never invalidate the entry: a silent missed invalidation.
    - A page's tag union across all its queries can exceed Netlify's 500-per-response limit. ⚠️ What Netlify does with the excess is undocumented.
- **Netlify encoding bug:** raw DatoCMS tags break CDN purges ([§3.4](#34-tag-encoding-pitfall-on-netlify)). They would have to be hashed or re-encoded first.
- **Cost on Netlify:** every data-cache `get` reads one tag-manifest blob per tag ([ON] `tags-handler.cts` `isAnyTagStaleOrExpired`). With 100+ tags per fetch, that is 100+ strongly-consistent Blobs reads on every cache check.
- **Verdict:** not viable for the seed.

### (b) Query-ID tag + "DatoCMS tag → query ID" index (DatoCMS's documented approach)

- **How it works** ([CT] `lib/fetch-content.ts`, `lib/database.ts`, `app/api/invalidate-cache-tags/route.ts`; [DC] <https://www.datocms.com/docs/next-js/using-cache-tags>):
  - Tag each fetch with `sha1(print(query)+JSON(variables))`.
  - After the call, write `(query_id, cache_tag)` rows.
  - The webhook runs `SELECT DISTINCT query_id WHERE cache_tag IN (...)`, deletes those rows, and calls `revalidateTag(queryId)`.
- **The tags header is available on cache hits too.** Next rebuilds the cached `Response` with the stored headers ([NXS] `patch-fetch.ts` L1129-1134). So `x-cache-tags` is present even on a data-cache HIT, and the index is written on every *render*.
  - For static/ISR pages, a render happens only on (re)generation.
  - For dynamic pages, it happens on every request.
- **Correctness:** ✅ as long as every cached entry's tags are in the index. The failure modes are:
  1. **Index write fails after the fetch was cached.** It self-heals on the next render that reads the entry, as long as the write error is not swallowed.
  2. **[CT]'s delete-in-webhook opens a lost-update window.** After the delete, rows come back only when the query is re-rendered.
     - For static pages Next refetches in the foreground during regeneration: "when stale and is revalidating we wait for fresh data" ([NXS] `patch-fetch.ts` L1083-1087). So rows come back with fresh tags.
     - For **dynamic** renders, the stale body (old tags) is served and refetched in the background **outside** our `executeQuery`, so the new tag set is recorded only by the next request's render ([NXS] `patch-fetch.ts` L1088-1110).
     - Insert-only rows avoid this entirely.
  3. **Generic race, present in every Next tag strategy.**
     - A regeneration whose CDA call started *before* a publish, but whose cache `set` lands *after* the webhook, is considered fresh.
     - Netlify compares the tag's `staleAt` with the entry's `lastModified`, which is set at write time ([ON] `tags-handler.cts` L87, `cache.cts` `set`).
     - ⚠️ The window is short (fetch + render time). An optional delayed second revalidation narrows it ([§4.6](#46-risks-and-mitigations)).
- **Stores that work on Netlify:**

  | Store | Fit | Notes |
  |---|---|---|
  | **Netlify Database** (managed Postgres) | ✅ best | Relational; `ON CONFLICT DO NOTHING`, `= ANY($1)`. Production deploys use the main DB, deploy previews get a branch ([NL] <https://docs.netlify.com/build/data-and-storage/netlify-database/index.md>). ⚠️ Credit-based plans only; billed per compute/bandwidth. |
  | **Turso / libSQL** | ✅ | DatoCMS reference implementation; HTTP client, `cache: 'no-store'` on its fetch ([CT] `lib/database.ts`). External account needed. |
  | **Upstash Redis** | ✅ | `SADD dato:t:<tag> <qid>` pipelined in one HTTP call (`/pipeline`, [Upstash REST API](https://upstash.com/docs/redis/features/restapi)); lookup with `SUNION` ([redis.io SUNION](https://redis.io/docs/latest/commands/sunion/)). Reset needs a dedicated DB (`FLUSHDB`) or key-prefix scan. |
  | **Netlify Blobs** (site store `getStore`) | ⚠️ poor | Key/value only, "last write wins … no concurrency control mechanism" ([NL] netlify-blobs § Troubleshooting). An inverted index needs a read-modify-write per tag (racy), or one marker key per `(tag, query)` pair: up to 500 HTTP writes per render and a `list({prefix})` per tag in the webhook. Viable only for tiny sites. ⚠️ Default consistency is eventual, with up to 60 s propagation; `strong` is opt-in (§ Consistency). |

- **Complexity:** medium. One table, three functions, one webhook.
- **Cost:** one DB write per render; one indexed read per webhook.
- **Cold starts:** the DB round-trip adds latency to (re)generation only when pages are static. The webhook has 8 s ([DC] webhooks), which is plenty for one indexed query.
- **Deploy resets:** see [§3](#3-netlify-runtime-behaviour).

### (c) Skip the Next data cache; Netlify CDN caching with `Netlify-Cache-Tag: <DatoCMS tags>`, purged via `purgeCache({ tags })`

This is the "any server, any CDN" pattern from [DC] cache-tags-integrations. Netlify reads `Netlify-Cache-Tag`/`Cache-Tag` (comma-separated), with up to 500 tags per response and up to 1024 characters per tag, case-insensitive ([NL] caching-overview § Purge by cache tag).

- **App Router pages can't set per-response headers.** For cacheable pages the Netlify runtime **overwrites** `netlify-cache-tag` with Next's own `x-next-cache-tags` ([ON] `headers.ts` `setCacheTagsHeaders` L359-366; `cache.cts` `captureCacheTags`). Proxy (middleware) runs before rendering and cannot know the tags.
- **Only Route Handlers can do it.** A dynamic GET handler can return `Netlify-CDN-Cache-Control` + `Netlify-Cache-Tag` itself; the runtime leaves user CDN headers alone when there is no Next cache entry ([ON] `headers.ts` `setCacheControlHeaders` L272-356).
- **Correctness:** ✅ for a single query (≤500 tags). ⚠️ Undefined for a response whose *union* of tags exceeds 500.
- **Purge limits:**
  - "Each cache tag or site can only be purged twice every 5 seconds", after which the API returns 429 ([NL] caching-overview).
  - `purgeCache` throws on non-2xx ([NF] `dist/main.js` L109-116).
  - ⚠️ No documented cap on tags per purge call.
- **Verdict:** technically sound, but it cannot cover pages. It would create a second invalidation path just for feeds and sitemaps. **Not recommended.**
  - Route Handlers can instead use `dynamic = 'force-static'` plus the same `executeQuery`. They then get a ROUTE cache entry tagged like pages ([ON] `cache.cts` `captureCacheTags` handles `APP_ROUTE`).

### (d) Semantic tags we compute (per model / record / locale)

- **Idea:** declare tags up front, e.g. `m:blog_post`, `r:<id>`, `l:it`. Invalidate them from *record* webhooks (`item` create/update/delete/publish/unpublish, `upload`, `item_type`) ([DC] webhooks § Webhook triggers).
- **Why it can't be made complete** (⚠️ this is my analysis; DatoCMS explicitly warns against hand-built invalidation in its [cache tags announcement](https://www.datocms.com/blog/introducing-datocms-cache-tags)):
  - **No webhook entity for Site settings** (global SEO, favicon, locales). The entities are `item_type, item, upload, build_trigger, environment, maintenance_mode, sso_user, cda_cache_tags` ([DC] CMA webhook resource).
  - **Linked records, inverse relationships and Structured Text `links`/`blocks`** make a page depend on records it never queried by ID.
  - **Uploads** (alt/title/focal point edits) affect every query that selects that file.
  - **Locale fallbacks** (`fallbackLocales`) make a change in locale A visible in locale B, so per-locale tags are unsafe.
  - **Filters and ordering:** a field change can move a record into or out of any filtered list of that model.
  - **Scheduled publishing:** ⚠️ whether record webhooks fire on scheduled publish/unpublish is not stated.
- **A correct variant exists but is coarse.** Tag each query with *every* model reachable from its selection set, derived from the GraphQL AST + schema, plus `uploads` + `site`. Since layouts and menus link most models, most publishes would invalidate most queries: close to global.
- **Verdict:** not worth it. Keep only the global `dato` tag as a deliberate full-flush handle.

### (e) Hybrids

- **(b) + global fallback** (recommended). Use the index normally. On lookup error, or when too many query IDs match (bulk publish), use `revalidateTag('dato', 'max')`. Correct in every branch.
- **(b) + (c) for Route Handlers.** Only if some endpoint must bypass the Next cache. Otherwise redundant.
- **Cache Components + `cacheTag(hash(datoTag)…)`.**
  - Would remove the DB, but hits the 128-per-call cap, the 500-per-response Netlify cap and the encoding issue.
  - On Netlify, `'use cache'` entries live in a per-instance in-memory LRU; only the tag manifests are in Blobs ([ON] `src/run/handlers/use-cache-handler.ts` header comment).
  - ⚠️ Revisit only if the seed moves to Cache Components.

### Strategy comparison

| | (a) direct Dato tags | (b) query-ID + index | (c) CDN headers only | (d) semantic tags | (e) (b)+global fallback |
|---|---|---|---|---|---|
| Works with `fetch`+`force-cache` | ❌ (F1) | ✅ | n/a (bypasses) | ✅ | ✅ |
| Covers App Router pages | ❌ | ✅ | ❌ (Route Handlers only) | ✅ | ✅ |
| No missed invalidations | ❌ truncation >128, encoding bug | ✅ (insert-only index) | ✅ ≤500 per response | ❌ hidden deps, no site webhook | ✅ |
| Precision | high | high (per query) | high | low (model-level) | high, global on bulk |
| Extra infra | none | DB | none | none | DB |
| Per-render cost | 100+ Blobs reads/fetch | 1 DB write | none | none | 1 DB write |
| Webhook cost | n/a | 1 indexed read + N blob writes + 1 purge | purge calls (429 risk) | per-event mapping | same as (b) |
| SWR behaviour | Next/Netlify SWR | Next/Netlify SWR (`'max'`) | CDN `stale-while-revalidate` | Next SWR | Next SWR |
| Deploy reset | automatic (deploy-scoped) | automatic + index GC | automatic (atomic deploys) | automatic | automatic + index GC |
| Complexity | medium | medium | medium (2 paths) | high | medium |

## 3. Netlify runtime behaviour

### 3.1 Where the caches live

- **Full Route Cache and Data Cache** go through `NetlifyCacheHandler` into **deploy-scoped** Netlify Blobs: `getDeployStore(...)`, region `us-east-2` unless `USE_REGIONAL_BLOBS=true` ([ON] `src/run/storage/regional-blob-store.cts` L54-60). Blobs docs: deploy-specific stores are "scoped to a specific deploy" ([NL] netlify-blobs § getDeployStore).
- **Build-time fetch responses** are uploaded into that deploy's store ([ON] `src/build/content/prerendered.ts` `copyFetchContent` L344-361). The runtime also deletes `.next/cache/fetch-cache` before saving the build cache, "because they are never updated once created at build time and would always be stale if saved" ([ON] `src/build/cache.ts` L7-22).
- **Tag state:** one Blobs "tag manifest" per tag, `{ staleAt, expireAt }` ([ON] `tags-handler.cts` L179-209).
- **CDN:**
  - Cacheable responses get `netlify-cdn-cache-control: s-maxage=…, stale-while-revalidate=31536000, durable` and `netlify-cache-tag = x-next-cache-tags` ([ON] `headers.ts` L255-265, L308-344, L359-366).
  - That means the Netlify durable cache is used automatically: "cacheable responses on sites using the Next Runtime 5.5.0 or later automatically use the durable cache" ([NL] caching-overview § Framework support).
- **Draft-mode isolation at the CDN** comes from `Netlify-Vary: cookie=__prerender_bypass|__next_preview_data` ([ON] `headers.ts` L156). Draft requests never share cache objects with visitors.

### 3.2 Does the data cache persist across deploys? Is it purged on deploy?

- **No, it does not persist**, and nothing needs to be purged. Every deploy has its own Blobs store (see above), and "all new deploys invalidate the cache for the given deploy context by default" at the CDN ([NL] caching-overview § Automatic invalidation with atomic deploys).
  - This is the opposite of Vercel, where "the Data Cache persists across deployments" (quoted in `datocms-nextjs.md` §2.1).
- **Residual staleness sources:**
  1. **Build-time fetches.** Content published between the build's CDA call and deploy publish is baked into the new deploy. The webhook during the build ran on the *old* deploy's store.
  2. **Rollback/restore** of an older deploy revives its old Blobs store: old data and old tag manifests. ⚠️ Inferred from deploy scoping, not documented.
     - Netlify emits a "Deploy restored" notification for this ([NL] <https://docs.netlify.com/deploy/deploy-notifications.md>).
  3. **Deploy previews and branch deploys** have their own stores and never receive the DatoCMS webhook.
     - `purgeCache` without `deployAlias` purges tags "across all deploys" at the CDN ([NL] caching-overview), but that does not touch their Blobs.

### 3.3 `revalidateTag(tag, profile)` on Netlify

**How Next hands tags to the cache handler.**
- Next collects the revalidated tags during a request.
- It groups them **by profile** and calls `incrementalCache.revalidateTag(tags[], { expire })` once per group ([NXS] `packages/next/src/server/revalidation-utils.ts` L95-180).
- The Netlify handler then runs `markTagsAsStaleAndPurgeEdgeCache` ([ON] `tags-handler.cts` L179-255), which does three things:
  - writes `{ staleAt: now, expireAt: now + expire*1000 }` to one blob per tag, using strong consistency;
  - makes **one** `purgeCache({ tags })` call covering all tags;
  - registers the work as background work (`trackBackgroundWork`).

**Behaviour by profile.**
- **`'max'`** (`expire` = 1 year; [NX] cacheLife preset table):
  - The CDN object is purged, so the next request reaches the function.
  - The handler marks the entry stale but serves it: `markCacheEntryStaleByTags` ([ON] `cache.cts` L542-569). Next regenerates in the background.
  - The STALE response gets `public, max-age=0, must-revalidate, durable`, so the edge does **not** cache stale HTML ([ON] `headers.ts` L259-263, L327-331).
  - The following request gets fresh HTML, which the CDN caches again.
  - During background regeneration of a static page, stale `fetch` entries are refetched in the foreground ([NXS] `patch-fetch.ts` L1083-1087). The regenerated page therefore contains fresh data.
- **`{ expire: 0 }`:** `expireAt = now`, so the entry counts as expired and `get` returns `null`. Result: a blocking MISS for the next visitor ([ON] `tags-handler.cts` L87-101, `cache.cts` L300-310). Matches [NX] revalidateTag.
- **`'default'`:** its `expire` is "never" ([NX] cacheLife), which gives SWR with an effectively unbounded stale window. Functionally close to `'max'`; `'max'` is more explicit.

**Failure modes and limits.**
- **CDN purge errors are swallowed.** `purgeEdgeCache` wraps `purgeCache(...)` in `.catch(log)` ([ON] `tags-handler.cts` L153-170), while `purgeCache` throws on non-2xx, including 429 ([NF] L114-116). If a purge is rate-limited:
  - the Blobs tag is marked stale,
  - but the **CDN keeps serving the old HTML**, with `s-maxage` of about 1 year.
  - ⚠️ This is the main operational risk on Netlify; see mitigations in [§4.6](#46-risks-and-mitigations).
- **Dedupe:** duplicate calls with the same `(tags, durations)` in the same request and tick are deduplicated ([ON] `tags-handler.cts` L211-250).

### 3.4 Tag-encoding pitfall on Netlify

- **Next's encoding.** Next encodes tags with `encodeHeaderSafe`, which only percent-encodes characters outside `\t\x20-\x7e`. So `[ ] % " \ ^ { | }` pass through unchanged ([NXS] `packages/next/src/server/lib/encode-header-safe.ts`; applied in `validateTags` and `revalidateTag`).
- **What the Netlify runtime does with page tags.** When building `netlify-cache-tag` for a page, it splits `x-next-cache-tags` on `/,|%2c/gi` **and applies `encodeURI`** ([ON] `cache.cts` L158-164, `captureCacheTags`, added in commit `f3c9b64`, 2026-01-26).
- **What it does with purges.** `purgeEdgeCache` sends the tags **without** `encodeURI` ([ON] `tags-handler.cts` L147-165).
- **Consequence.** Any Next tag containing a character that `encodeURI` changes (`[`, `"`, `\`, `^`, `{`, `|`, `}`, `%`, space…) will be marked stale in Blobs, but **never purged from the CDN**.
- ⚠️ Also, a raw DatoCMS tag containing the substring `%2c` would be split in two.
- **Rule for the seed:** Next tags must match `^[a-z0-9:_.-]{1,200}$`.

## 4. Recommended design for the seed

### 4.1 Tag naming scheme

| Tag | Attached to | Purpose |
|---|---|---|
| `dato` | every published CDA fetch | full SWR flush: deploy, restore, environment promote, index failure, bulk fallback, manual |
| `dato:q:<sha1-hex>` | every published CDA fetch (exactly one) | granular invalidation via the index |

- The query ID is `sha1(print(query) + '\0' + stableJSON(variables) + '\0' + environment)`. Always include `locale` and `fallbackLocales` in `variables`, so they are part of the key.
- ⚠️ Next's own data-cache key already includes the request body and headers. The query ID only needs to be *stable* and *collision-free*, not secret.
- Do not add page, route or model tags. Next already adds implicit `_N_T_/…` path tags, which are usable with `revalidatePath` ([ON] `cache.cts` L127-177).

### 4.2 Data access (`lib/datocms/executeQuery.ts`, sketch)

```ts
import 'server-only';
import { rawExecuteQuery } from '@datocms/cda-client';
import { draftMode } from 'next/headers';
import { cacheTagIndex } from './cache-tag-index';
import { queryId } from './query-id';

export const GLOBAL_TAG = 'dato';
export const queryTag = (id: string) => `dato:q:${id}`;

export async function executeQuery<R, V>(query: TadaDocumentNode<R, V>, variables?: V) {
  const { isEnabled: draft } = await draftMode(); // does not force dynamic in 16.3.7 (see §Exec 5)
  const id = queryId(query, variables, process.env.DATOCMS_ENVIRONMENT);

  const [data, res] = await rawExecuteQuery(query, {
    token: draft ? process.env.DATOCMS_DRAFT_CDA_TOKEN! : process.env.DATOCMS_PUBLISHED_CDA_TOKEN!,
    includeDrafts: draft,
    excludeInvalid: true,
    environment: process.env.DATOCMS_ENVIRONMENT,
    returnCacheTags: !draft,
    variables,
    requestInitOptions: draft
      ? { cache: 'no-store' } // Draft Mode bypasses the cache anyway ([NX] draft-mode guide)
      : { cache: 'force-cache', next: { tags: [GLOBAL_TAG, queryTag(id)] } },
  });

  if (!draft && process.env.DATO_TAG_INDEX === 'on') {
    const tags = res.headers.get('x-cache-tags')?.split(' ').filter(Boolean) ?? [];
    // Must throw on failure: a cached entry without index rows can never be invalidated
    // granularly. A throw fails this render; the next render re-records (self-healing).
    await cacheTagIndex.record(id, tags);
  }
  return data;
}
```

- Wrap `executeQuery` in React `cache()` with deep-compare, as [CT] does, so one render records each query only once.
- `DATO_TAG_INDEX` is a Netlify env var with a **per-deploy-context value**: `on` for production, `off` for previews and branch deploys ([NL] environment-variables overview § contextual values).
  - Previews then rely on Draft Mode, or on a redeploy, for freshness.
  - ⚠️ Netlify's read-only `CONTEXT`/`DEPLOY_ID` are build-time only. Functions get only `URL`, `SITE_NAME`, `SITE_ID` ([NL] functions/environment-variables).

### 4.3 Index store (Postgres flavour; same shape on Turso)

```sql
CREATE TABLE dato_cache_tag_index (
  cache_tag text NOT NULL,
  query_id  text NOT NULL,
  PRIMARY KEY (cache_tag, query_id)   -- serves the webhook lookup
);
```

```ts
interface CacheTagIndex {
  record(queryId: string, datoTags: string[]): Promise<void>; // INSERT … ON CONFLICT DO NOTHING (insert-only)
  lookup(datoTags: string[]): Promise<string[]>;              // SELECT DISTINCT query_id WHERE cache_tag = ANY($1)
  reset(): Promise<void>;                                     // TRUNCATE — only together with revalidateTag('dato')
}
```

- **Insert-only** is deliberate:
  - A stale row only causes an extra `revalidateTag` of a query that no longer needs it: harmless.
  - A missing row causes a missed invalidation.
  - This removes [CT]'s delete-then-revalidate window (§2b, point 2).
- The table only grows between deploys. `reset()` on each production deploy bounds its size.

### 4.4 Webhook route (`app/api/datocms/invalidate/route.ts`, flow)

1. **Authenticate:** `Authorization: Bearer <secret>`, compared in constant time. The webhook is created via the CMA in `post-deploy`, as in [SK] (see `datocms-nextjs.md` §2.1).
2. **Parse the body and dispatch:**
   - `cda_cache_tags` / `invalidate` → go to step 3.
   - `environment` / `promote` (⚠️ event name) → full flush (step 5).
   - Anything else → 200, ignored.
3. **Look up** `queryIds = await index.lookup(tags)`, with tags chunked (e.g. 500 per `ANY`).
   - **If the lookup throws**, run `revalidateTag('dato', 'max')` and return 200. Correctness is kept; the cost is one global SWR cycle.
   - **If `queryIds.length > FULL_FLUSH_THRESHOLD`** (e.g. 200; ⚠️ tune it — the Netlify purge body has no documented tag cap), use `revalidateTag('dato', 'max')`.
4. **Revalidate:** `for (const id of queryIds) revalidateTag(queryTag(id), 'max')`.
   - Next batches these into one handler call, which means one purge request ([NXS] `revalidation-utils.ts`).
   - Do **not** delete index rows.
5. **Full flush** = `await index.reset(); revalidateTag('dato', 'max')`. Order matters:
   - Reset **before** revalidating. Every entry created before the revalidation is then stale, and every entry created after it writes fresh rows.
6. **Return 200** with `{ tags: n, queries: m }` well inside 8 s. Enable DatoCMS auto-retry for transport failures.

Profile choice:
- `'max'` meets the visitor-SWR requirement: the first visitor after a publish sees the old page once. Editors who need to verify the live site can reload twice, or use Draft Mode.
- Switch to `{ expire: 0 }` only if "next visitor must see it" becomes a requirement. The cost is a blocking regeneration for that visitor.

### 4.5 Full-flush triggers

| Trigger | Mechanism | Why |
|---|---|---|
| Netlify **Deploy succeeded** (production) | Netlify outgoing webhook notification with a JWS secret → `POST /api/cache/flush` ([NL] deploy-notifications § Payload signature). ⚠️ Filter on the payload's context/branch field. Alternatively an event-triggered function `deploySucceeded(event)` that POSTs to `event.deploy.sslUrl` ([NL] <https://docs.netlify.com/build/functions/trigger-on-events.md>). | GC the index; refresh data fetched at build time (§3.2 item 1) |
| Netlify **Deploy restored** (rollback/rollforward) | Same route, "Deploy restored" notification ([NL] deploy-notifications) | Revived deploy store holds stale data (§3.2 item 2) |
| DatoCMS **Environment promote** | Same webhook route (step 2) | Primary content changed wholesale; tag coverage undocumented |
| Manual / ops | Authenticated `POST /api/cache/flush` | Incident recovery |

The flush route runs **in the published deploy**, so `revalidateTag` writes that deploy's Blobs tag manifests. Its `purgeCache` covers all deploys at the CDN ([NL] caching-overview § Purge by cache tag).

### 4.6 Risks and mitigations

1. **Swallowed CDN purge failures (429).** The Blobs entry is stale, but the edge keeps the old HTML (§3.3).
   - **Mitigation:** in the webhook, use `after()` ([NX] after) to call `purgeCache({ tags })` from `@netlify/functions` again after about 5 s, retrying on 429.
   - Our tags are URI-safe, so they match the page's `netlify-cache-tag`.
   - ⚠️ `after()` duration is bounded by the function's max duration.
2. **Regeneration/publish race** (§2b, point 3).
   - **Optional mitigation:** from `after()`, run a second `revalidateTag(…, 'max')` for the same tags about 10 s later.
   - ⚠️ Validate that `revalidateTag` works inside `after()` in a Route Handler on Netlify before relying on it.
3. **Index write in the render path.** A DB outage fails page generation.
   - Static/ISR pages keep serving the previous version on background-regeneration errors ⚠️ (Next ISR behaviour; verify on Netlify). Only never-cached pages would 500.
   - The alternative, swallowing the error, trades availability for silent staleness. Don't.
4. **Dynamic pages multiply cost.** Every request does Blobs reads (entry + one tag manifest per tag, [ON] `cache.cts` `checkCacheEntryStaleByTags`) plus an index write.
   - **Mitigation:** keep public routes free of request-time APIs, and check `next build` output.
5. **Response-size budget.** Queries that return 500 tags are over-invalidated by DatoCMS's catch-all tags ([DC] cache-tags-format).
   - **Mitigation:** log the tag count in `executeQuery` during development, and paginate or split big page-builder queries.
6. **Netlify Database availability.** Credit-based plans only ([NL] netlify-database). Keep `CacheTagIndex` an interface with a Turso implementation.
7. **Adapter drift.** Everything in §3 is read from `@netlify/plugin-nextjs` 5.16.0. Netlify auto-updates the adapter unless pinned ([NL] nextjs overview § Reverting). ⚠️ Re-verify §3.3/§3.4 on upgrades.

## Open questions

1. What exactly does the DatoCMS environment-promote webhook look like (entity/event names)? Does promotion emit `cda_cache_tags`? The docs contradict each other (§1).
2. What does Netlify do when a response carries more than 500 cache tags? Is there a per-call tag cap on `POST /api/v1/purge`? Neither is documented.
3. Should the `encodeURI` asymmetry in the Netlify runtime (§3.4) be reported upstream? It does not affect the recommended scheme.
4. Does a `'use cache'`-based variant (Cache Components) become attractive once Netlify persists `'use cache'` entries beyond per-instance memory?
5. `FULL_FLUSH_THRESHOLD`: measure typical webhook sizes on a real project first.
6. Previews: is "no granular invalidation on deploy previews" acceptable, or should previews use `next.revalidate` (time-based)?
7. Are DatoCMS cache tags environment-scoped? If yes, the webhook could filter by `environment`. Not needed for correctness.

## Sources

**DatoCMS docs** (fetched 2026-09-29, `.md` variants):
- <https://www.datocms.com/docs/content-delivery-api/cache-tags>
- <https://www.datocms.com/docs/content-delivery-api/cache-tags-format>
- <https://www.datocms.com/docs/content-delivery-api/cache-tags-invalidation>
- <https://www.datocms.com/docs/content-delivery-api/cache-tags-integrations>
- <https://www.datocms.com/docs/next-js/using-cache-tags>
- <https://www.datocms.com/docs/astro/using-cache-tags> (Netlify provider: `Netlify-Cache-Tag`, `purgeCache()`, "cap is 500 tags per response")
- <https://www.datocms.com/docs/general-concepts/webhooks>
- <https://www.datocms.com/docs/content-management-api/resources/webhook>
- <https://www.datocms.com/docs/general-concepts/primary-and-sandbox-environments>
- <https://www.datocms.com/blog/introducing-datocms-cache-tags> (2024-07-15)

**DatoCMS code:**
- `datocms/nextjs-with-cache-tags-starter@3a461d89914ce7284e1e010c7c4ba452848d0342`:
  - `lib/fetch-content.ts`
  - `lib/database.ts`
  - `lib/cache-tags.ts`
  - `schema.sql`
  - `app/api/invalidate-cache-tags/route.ts`
  - `app/api/invalidate-all/route.ts`
  - `netlify.toml`
  - `package.json` (Next 14.2.3)
- Branches `claude/nextjs16-upgrade-fixes@babd4605486fc76c9f018744c23f031ac454e24c` and `claude/elegant-heisenberg-m0vi1m@553ec17926280df5aad14b7b67443b85beb24f33` (open PRs #6/#5): `revalidateTag(queryId, { expire: 0 })`, plus comments on why a DB is needed.

**Next.js docs** (v16.3.7):
- <https://nextjs.org/docs/app/api-reference/functions/fetch>
- <https://nextjs.org/docs/app/api-reference/functions/revalidateTag>
- <https://nextjs.org/docs/app/api-reference/functions/cacheTag>
- <https://nextjs.org/docs/app/api-reference/functions/cacheLife>
- <https://nextjs.org/docs/app/api-reference/functions/draft-mode>
- <https://nextjs.org/docs/app/guides/draft-mode>
- <https://nextjs.org/docs/app/api-reference/functions/after>
- <https://nextjs.org/docs/app/guides/caching-without-cache-components>
- <https://nextjs.org/docs/app/api-reference/config/next-config-js/incrementalCacheHandlerPath>
- <https://nextjs.org/docs/app/glossary>

**Next.js source** (`vercel/next.js` tag `v16.3.7`):
- `packages/next/src/server/request/draft-mode.ts`
- `packages/next/src/server/lib/patch-fetch.ts`
- `packages/next/src/server/web/spec-extension/revalidate.ts`
- `packages/next/src/server/revalidation-utils.ts`
- `packages/next/src/server/lib/encode-header-safe.ts`

**Netlify docs** (fetched 2026-09-29):
- <https://docs.netlify.com/build/caching/caching-overview.md>
- <https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview.md>
- <https://docs.netlify.com/build/data-and-storage/netlify-blobs.md>
- <https://docs.netlify.com/build/data-and-storage/netlify-database/index.md>
- <https://docs.netlify.com/deploy/deploy-notifications.md>
- <https://docs.netlify.com/build/functions/trigger-on-events.md>
- <https://docs.netlify.com/build/configure-builds/environment-variables.md>
- <https://docs.netlify.com/build/functions/environment-variables.md>
- <https://docs.netlify.com/build/environment-variables/overview.md>

**Netlify code:**
- `opennextjs/opennextjs-netlify@a60189bf863daf614c91f01c43f1a38c2957e32f` (v5.16.0):
  - `src/run/handlers/cache.cts`
  - `src/run/handlers/tags-handler.cts`
  - `src/run/handlers/use-cache-handler.ts`
  - `src/run/headers.ts`
  - `src/run/config.ts`
  - `src/run/storage/regional-blob-store.cts`
  - `src/build/cache.ts`
  - `src/build/content/prerendered.ts`
  - commit `f3c9b64` ("fix: encode cache tags provided by Next.js for App Router")
- `@netlify/functions@6.0.0`, `dist/main.js` (`purgeCache`).

**Other:**
- <https://upstash.com/docs/redis/features/restapi>
- <https://redis.io/docs/latest/commands/sunion/>
- <https://docs.turso.tech/sdk/ts/quickstart>
