# DatoCMS + Next.js (App Router): research for the theme seed

Research date: 2026-09-29. Sources are primary only: DatoCMS docs (fetched as Markdown from `datocms.com/docs/*.md`), Next.js docs (`nextjs.org/docs/*.md`, doc version **16.3.6**, most pages `lastUpdated: 2026-08-25`), the llmstxt.org spec, and source code of DatoCMS repos cloned at the commits listed in [Sources](#sources).

Conventions used below:
- **[DC]** = DatoCMS docs, **[NX]** = Next.js docs, **[SK]** = `datocms/nextjs-starter-kit@4abee90`, **[LP]** = `datocms/next-landing-page-demo@efe7242` (marketplace name "Marketing Website"), **[EC]** = `datocms/ecommerce-website-demo@5166109` ("Ecommerce Website"), **[CT]** = `datocms/nextjs-with-cache-tags-starter@3a461d8`.
- ⚠️ marks something that is uncertain, version-dependent, or contradicted between sources.

---

## Executive summary

DatoCMS has three current, maintained Next.js starters. All run on Next 16 + React 19 + `react-datocms` 8 + `@datocms/cda-client` 0.3. The Starter Kit is the one DatoCMS's own docs link to for every pattern: draft mode, real-time, visual editing, and cache invalidation. It gives the cleanest foundation. The other two starters add i18n, page-builder blocks, menus and pagination, but they are less tidy.

Recommendations for the seed:

1. **One data-access module.** Put a single `executeQuery()` wrapper around `@datocms/cda-client` in `lib/datocms/`. It should:
   - pick the published or draft token from `draftMode()`;
   - always send `excludeInvalid: true`, which narrows GraphQL types to non-null;
   - send `contentLink: 'v1'` and `baseEditingUrl` only in draft mode;
   - read `environment` from an env var;
   - tag every request for the Next cache.

   No UI code should import `cda-client` directly. ([SK] `src/lib/datocms/executeQuery.ts`; [DC] content-delivery-api/api-endpoints)
2. **Use gql.tada for types, with one fragment per component.** This is what the Starter Kit does: each block, link or inline-record component exports its own fragment, and page queries compose them. GraphQL Code Generator with `.graphql` files is the other officially used option ([LP]/[EC]). Both are endorsed by the `cda-client` docs ([DC] content-delivery-api/your-first-request).
3. **Cache invalidation: start with one global tag, and keep a seam to go finer later.**
   - The default follows the Starter Kit. Every CDA fetch uses `force-cache` with `next.tags: ['datocms']`. A single DatoCMS webhook on the `cda_cache_tags` / `invalidate` event calls `revalidateTag('datocms', …)`.
   - Granular invalidation needs a *query-id → DatoCMS cache tags* mapping stored in a database. This is because Next.js allows at most 128 tags per `fetch`/`cacheTag` call, and DatoCMS can return up to 500 tags per response ([DC] cache-tags-integrations, [NX] fetch, [NX] cacheTag).
   - ⚠️ Pick the `revalidateTag` profile on purpose. The Starter Kit passes `'default'`. Next docs recommend `'max'`, or `{ expire: 0 }` for webhooks that need immediate expiry ([NX] revalidateTag).
4. **Decide early between the "previous" caching model and Cache Components.**
   - The previous model is `fetch` with `force-cache` + `next.tags`, which is what every DatoCMS starter uses.
   - Cache Components is `cacheComponents: true` + `'use cache'` / `cacheTag` / `cacheLife`. None of the official starters enable it; [LP] has it commented out.
   - The two models behave differently across deploys, in serverless environments, and in `generateStaticParams` rules. See [§2.4](#24-nextjs-caching-models-version-dependent).
5. **Copy the Starter Kit's draft/preview plumbing as it is.** It includes:
   - `/api/draft-mode/enable|disable` with a shared secret and a same-host redirect check;
   - a partitioned (CHIPS) re-set of the `__prerender_bypass` cookie, so draft mode works inside the Web Previews iframe;
   - a `/api/preview-links` endpoint for the Web Previews plugin;
   - a `<ContentLink/>` client component rendered only in draft mode.
6. **Treat stega as a hazard.** In draft mode, text fields carry invisible characters. Call `stripStega()` before any string is used as logic: `switch` cases, URLs, comparisons, metadata ([DC] visual-editing; [LP] `[slug]/Content.tsx`).
7. **SEO: `toNextMetadata(_seoMetaTags)` is a starting point, not everything.**
   - It does not produce canonical or hreflang `alternates`, and it silently drops `og:image:alt` and `article:*` tags (react-datocms `src/Seo/nextUtils.ts`).
   - The seed has to add `metadataBase`, `alternates` (built from `_allSlugLocales`), `sitemap.ts` and `robots.ts` itself. None of the official starters ship sitemap, robots or llms.txt.
8. **Rendering blocks.** Use a `__typename → component` registry. Every block selection must include `... on RecordInterface { id __typename }`: `<StructuredText>` throws `RenderError` when a block or link id cannot be found in `blocks`/`links` (react-datocms `src/StructuredText/index.tsx`). Wrap Structured Text in a project `<Text>` component that also carries the Visual Editing group and boundary attributes ([SK] `src/components/Text`).
9. **Routing.** Keep one URL builder per routable model, keyed by `__typename` ([SK] `gqlUrlBuilder/`). Use it for links, sitemap, preview links and llms.txt alike. Mind the CDA defaults: `first` defaults to 20 and is capped at 500. Use `executeQueryWithAutoPagination` for `generateStaticParams`, sitemaps and llms.txt ([DC] pagination).
10. **i18n.** Use a `[locale]` segment, plus `proxy.ts` (formerly `middleware.ts`) for detection. Pass `locale` + `fallbackLocales` on every query, and use `_allSlugLocales` for the language switcher and hreflang. The official examples use no i18n library. [EC] uses `i18next` for UI strings, and Next docs list `next-intl` among other options ([NX] internationalization).

---

## 1. Data fetching

### 1.1 Content Delivery API endpoint and headers

- **Endpoint.** The single GraphQL endpoint is `https://graphql.datocms.com/`. It is the default in `cda-client` (`src/executeQuery.ts`: `options.graphqlEndpointUrl || 'https://graphql.datocms.com/'`).
- **Request headers.** [DC] <https://www.datocms.com/docs/content-delivery-api/api-endpoints> documents each header next to its `cda-client` option:

| Header | `cda-client` option | Effect |
|---|---|---|
| `X-Environment: <name>` | `environment` | Read from a sandbox environment. The primary environment is used if omitted. |
| `X-Include-Drafts: true` | `includeDrafts` | Return the latest (draft) version of records. |
| `X-Exclude-Invalid: true` | `excludeInvalid` | "Strict mode". Invalid records are filtered out **and GraphQL types are narrowed**: fields with a Required validation become non-null, and so do `responsiveImage`/`width`/`height`/`focalPoint` on imgix-image-validated asset fields, `video` on video-validated fields, and `alt`/`title` where they are required. |
| `X-Cache-Tags: true` | `returnCacheTags` | Response carries an `X-Cache-Tags` header. |
| `X-Visual-Editing: v1` | `contentLink: 'v1'` | Embed stega metadata for Content Link. |
| `X-Base-Editing-Url: https://<project>.admin.datocms.com` | `baseEditingUrl` | Needed with Content Link. Used alone, it enables the `_editingUrl` field. |

- **The header builder.** `cda-client` builds exactly these headers in `src/buildRequestHeaders.ts`, plus an optional `Referer` for usage tracking.
- ⚠️ **`contentLink` values.** The TS type accepts `'v1' | 'vercel-v1'`. The `cda-client` README option table still lists `'vercel-v1'`, and the `useQuerySubscription` docs list `'vercel-1'`. The current DatoCMS docs and all current starters use `'v1'`. `vercel-v1` is what the archived `nextjs-demo` sent.

### 1.2 `@datocms/cda-client` (v0.3.2, commit `00c4c29`)

- **Exports:**
  - `executeQuery`
  - `rawExecuteQuery`, which returns `[result, Response]` and is needed to read `x-cache-tags`
  - `executeQueryWithAutoPagination` and `rawExecuteQueryWithAutoPagination`
  - `buildRequestHeaders` and `buildRequestInit`
  - `ApiError`
- **Behaviour:**
  - It accepts a string, a `DocumentNode`, or a `TypedDocumentNode`. That makes it compatible with both gql.tada and codegen.
  - `requestInitOptions` is passed through to `fetch`. This is how the Next.js `cache`/`next.tags` options are injected ([SK] `executeQuery.ts`).
  - `autoRetry` is on by default. On HTTP 429 it waits `X-RateLimit-Reset` seconds, with jitter, and retries (`src/executeQuery.ts`).
  - It throws `ApiError` on a non-2xx response **or** when the body contains GraphQL `errors`.
- **Rate limits.** Uncached CDA requests are limited to **40 req/s and 1000 req/min per token**, plus **40 concurrent uncached requests per project**. The client does not coordinate concurrency across parallel build workers ([DC] <https://www.datocms.com/docs/content-delivery-api/technical-limits>).
- **Query size and CDN caching.** A query is only cacheable on DatoCMS's CDN if its compressed size is ≤ 12,000 bytes. The `x-cacheable-on-cdn` response header tells you. Big page-builder queries with many fragments can exceed this, so they are always uncached and rate-limited ([DC] technical-limits).
- **Billing.** Every request counts against quota, cached or not ([DC] technical-limits, "Billing considerations"). Next-side caching is therefore also a cost control.
- **Complexity.** The ceiling is 10,000,000, reported in the `x-complexity` header ([DC] technical-limits).

### 1.3 Request de-duplication

- Next.js memoizes only `GET` `fetch` calls within a render pass ([NX] <https://nextjs.org/docs/app/api-reference/functions/fetch> § Memoization). CDA calls are `POST`, so they are not memoized.
- DatoCMS recommends wrapping the call in `React.cache` with JSON-serialized arguments ([DC] <https://www.datocms.com/docs/next-js/optimizing-calls-with-react-cache-function>). [CT] does this (`lib/fetch-content.ts`, `cacheWithDeepCompare`).
- The Starter Kit **does not** do this. Its `generateMetadata` and `Page` each call `executeQuery`. That is harmless when the Data Cache is warm, but in draft mode the cache is bypassed, so it costs two CDA calls per page view.
- **Seed:** add `React.cache` memoization inside the wrapper.

### 1.4 Typed queries: gql.tada vs GraphQL Code Generator

| | gql.tada | graphql-codegen (client preset) |
|---|---|---|
| Used by | [SK] (`gql.tada ^1.9`, TS plugin in `tsconfig.json`, output `src/lib/datocms/graphql-env.d.ts`) | [LP], [EC] (`@graphql-codegen/cli ^6`, `graphql.config.ts`, output `graphql/types/`) |
| Query location | Inline `graphql(\`...\`, [fragments])` in TS | `.graphql` files next to routes/components |
| Fragment masking | `readFragment()` / `FragmentOf<>`; `@_unmask` for utility fragments ([SK] `commonFragments.ts`) | `getFragmentData` (renamed via `unmaskFunctionName`) |
| Schema download | `gql.tada generate schema https://graphql.datocms.com --header "X-Exclude-Invalid: true" --header "Authorization: …"` ([SK] `package.json`) | `schema` URL with the same headers in `graphql.config.ts` |
| Codegen step | None at runtime, only the schema/introspection (run in `prepare`) | `graphql-codegen` run |

- **Download the schema with `X-Exclude-Invalid: true`,** so the generated types match the strict-mode responses. Both setups do this.
- **Map the custom scalars by hand.** Both use the same mapping ([SK] `src/lib/datocms/graphql.ts`, [LP] `graphql.config.ts`; reference: [DC] <https://www.datocms.com/docs/content-delivery-api/custom-scalar-types>): `BooleanType→boolean`, `CustomData→Record<string,string|unknown>`, `Date`/`DateTime→string`, `FloatType`/`IntType→number`, `ItemId`/`UploadId→string`, `JsonField→unknown`, `MetaTagAttributes→Record<string,string>`.
- **Keep the schema environment-specific.** The schema is per environment. If the seed supports sandbox environments, the schema download must send `X-Environment` too. ⚠️ No starter does this.
- **CMA types.** [SK] also generates CMA record types with `datocms schema:generate` (`npm run generate-cma-types`). The preview-links and SEO-analysis endpoints use them to map a record to a URL (`src/lib/datocms/recordInfo.ts`).

---

## 2. Cache management

### 2.1 DatoCMS cache tags

- **Requesting and reading tags.** Send `X-Cache-Tags: true`. The response then has a space-separated `X-Cache-Tags` header of opaque tags ([DC] <https://www.datocms.com/docs/content-delivery-api/cache-tags-format>).
- **Tag format.** The alphabet has 66 symbols, with no spaces, commas or uppercase letters.
- **Limits.** There are at most 500 tags and about 14 KB of header per response. Beyond that, DatoCMS swaps in coarser "catch-all" tags, which can over-invalidate.
- **Invalidation webhook.** Configure it under Project Settings → Webhooks, with entity "Content Delivery API Cache Tags" and event "Invalidate". The payload is ([DC] <https://www.datocms.com/docs/content-delivery-api/cache-tags-invalidation>):
  ```json
  { "entity_type": "cda_cache_tags", "event_type": "invalidate",
    "entity": { "id": "cda_cache_tags", "type": "cda_cache_tags",
                "attributes": { "tags": ["N*r;L", "6-KZ@"] } },
    "related_entities": [] }
  ```
  - Batches have no upper bound, so chunk them and retry.
  - Webhooks can carry basic auth or custom headers. Optional auto-retry makes up to 7 attempts, spreading out to 2 days ([DC] <https://www.datocms.com/docs/general-concepts/webhooks>).
- **Also invalidate on deploy.** DatoCMS says: "Don't forget to invalidate on deploy" ([DC] cache-tags-invalidation). The [SK] comments agree: "on Vercel, the Data Cache persists across deployments" (`src/lib/datocms/executeQuery.ts`).
- **The webhook can be created in code.** [SK] `src/app/api/post-deploy/route.tsx` creates it via the CMA as `events: [{ entity_type: 'cda_cache_tags', event_types: ['invalidate'], filters: [] }]`, with an `Authorization: Bearer <SECRET>` header.

### 2.2 Wiring cache tags into Next.js: three documented strategies

1. **One global tag (Starter Kit, Marketing, Ecommerce).**
   - Every query gets `requestInitOptions: { cache: 'force-cache', next: { tags: ['datocms'] } }`.
   - `/api/invalidate-cache` checks the bearer token and calls `revalidateTag('datocms', 'default')` ([SK] `src/app/api/invalidate-cache/route.tsx`; [LP] `app/api/revalidateCache/route.tsx`).
   - The cost: every content change invalidates the whole site's data cache. The Starter Kit's comments say it "is not advised for larger projects".
2. **Query-ID tag plus a mapping database ([CT], and the DatoCMS guide).**
   - Each query is tagged with `sha1(print(query) + JSON(variables))`.
   - `x-cache-tags` is stored as `(query_id, cache_tag)` rows in Turso/libSQL.
   - The webhook looks up the `query_id`s for the received tags, deletes those rows, and calls `revalidateTag(queryId)` ([CT] `lib/fetch-content.ts`, `lib/database.ts`, `app/api/invalidate-cache-tags/route.ts`; [DC] <https://www.datocms.com/docs/next-js/using-cache-tags>).
   - This exists because Next allows at most 128 tags per `fetch` ([NX] fetch § `options.next.tags`: "max length for a custom tag is 256 characters and the max tag items is 128") and per `cacheTag()` call ([NX] cacheTag § Limits).
   - ⚠️ [CT] is pinned to Next 14.2.3 / react-datocms 6 and uses the old single-argument `revalidateTag(tag)`. It shows the idea but is not ready to copy.
   - ⚠️ The Next docs say "a single `cacheTag()` call accepts up to 128 tags". It is not documented whether *several* `cacheTag` calls in one scope can together exceed 128 per entry. Verify before relying on it.
3. **CDN-level tags (no mapping DB).**
   - DatoCMS now openly recommends hosts that keep all 500 tags verbatim (Cloudflare, Netlify, Fastly) over Vercel, which caps a cached response at 128 tags. Vercel's bulk purge also takes only 16 tags per call ([DC] <https://www.datocms.com/docs/content-delivery-api/cache-tags-integrations>).
   - With Next.js this means setting `Cache-Tag`/`Netlify-Cache-Tag` response headers per page. ⚠️ No official Next.js example of this exists. DatoCMS's worked examples are Hono+Fastly and Astro.

### 2.3 `revalidateTag` / `updateTag` semantics in Next 16

Source: [NX] <https://nextjs.org/docs/app/api-reference/functions/revalidateTag> (v16.3.6) and the v16 upgrade guide.

- **Signature.** It is now `revalidateTag(tag, profile)`. The single-argument form is deprecated and a TypeScript error in v16.
- **`'max'` (recommended).** Stale-while-revalidate: the next request is served stale while the revalidation runs.
- **`{ expire: 0 }`.** The next request is a blocking miss. The docs explicitly suggest this for invalidation "from outside a Server Action, for example a webhook".
- **Other profiles.** Any other `cacheLife` profile name works too; only its `expire` is read. The `default` profile is `stale 5m / revalidate 15m / expire never` ([NX] cacheLife § preset profiles).
  - ⚠️ So `revalidateTag('datocms','default')`, as [SK] and [LP] use it, behaves like SWR with an unbounded stale window. The first visitor after a publish sees old content. This matters for editors checking the live site. The seed should pick `{ expire: 0 }` or `'max'` deliberately.
- **Revalidation is lazy.** It is "triggered by a request, not by the `revalidateTag` call", so pages revalidate as they are visited.
- **`updateTag(tag)`** exists only in Server Actions (read-your-own-writes). It is not usable from a webhook route handler ([NX] updateTag).
- **Where tags come from.** Tags are attached either with `fetch(..., { next: { tags } })` or with `cacheTag()` inside `'use cache'`.

### 2.4 Next.js caching models (version-dependent)

- **Next 15 changed the `fetch` default.** `fetch` is no longer cached by default; caching is opt-in ([DC] optimizing-calls page, "Next.js 15 and Later"). The current default is "auto no cache": data is fetched at build time if the route prerenders, and per request after Request-time APIs.
- **`force-cache` covers CDA calls.** It caches any request, "including `POST` and requests that send `authorization` … headers". That is what makes it work for CDA calls ([NX] fetch § `options.cache`).
- **Draft mode bypasses everything.** It skips the fetch cache, `'use cache'` and `unstable_cache`, and marks the response `Cache-Control: private, no-cache, no-store…` ([NX] <https://nextjs.org/docs/app/guides/draft-mode>). Draft queries are therefore never cached, and no special handling is needed.
- **Cache Components (`cacheComponents: true`, introduced in 16.0.0):**
  - It replaces `dynamic`/`revalidate`/`fetchCache` segment configs with `'use cache'` + `cacheLife` + `cacheTag`. `fetch`'s `cache`/`next.tags` options "move" into a `'use cache'` function ([NX] <https://nextjs.org/docs/app/guides/migrating-to-cache-components>). The migration guide says existing `fetch` caching "keeps working as a separate layer".
  - `'use cache'` cache keys include the **build ID**, so entries do **not** survive a deploy. The `fetch` Data Cache does, and "for data that needs to persist across deploys, use `unstable_cache` … or the `fetch` cache" ([NX] use-cache § Runtime caching considerations).
    - Consequence: with `'use cache'`, a deploy naturally refreshes content. With `fetch`+`force-cache`, you must purge on deploy.
  - The default `'use cache'` handler is an in-memory LRU. On **serverless**, "cache entries typically don't persist across requests". `'use cache: remote'` needs a platform cache handler ([NX] use-cache).
  - `draftMode().isEnabled` may be read inside `'use cache'`; `cookies()`/`headers()` may not ([NX] draft-mode function).
  - With Cache Components, `generateStaticParams` must return **at least one** param. An empty array is a build error ([NX] generate-static-params).
- ⚠️ **Does reading `draftMode()` make a page dynamic?** The Next glossary lists `draftMode()` among the "Request-time APIs … causing a component to opt into dynamic rendering" ([NX] glossary). The [SK] page comments agree: "This page is dynamically rendered on each request (due to the `draftMode()` call), but the GraphQL data is cached". The draft-mode guide, meanwhile, suggests pages need not read it at all when the same endpoint serves both variants.
  - DatoCMS needs a different token and headers for drafts, so the seed must read it.
  - The effect: in the Starter Kit pattern, the **full route cache is not used**. Every request re-renders on the server from cached data, with no CDA call. Confirm with `next build` output which routes are static or dynamic.

### 2.5 Draft mode / preview

From [SK] `src/app/api/draft-mode/{enable,disable}/route.tsx` and `src/app/api/utils.ts`:

- **Enable route.** `GET /api/draft-mode/enable?token=…&redirect=/path`:
  - validates the token against `SECRET_API_TOKEN`;
  - checks `isSafeRedirectUrl()`, which resolves the target against the request URL and requires the same hostname, blocking `//evil.com` and `/\evil.com`;
  - calls `(await draftMode()).enable()` and then `redirect()`.
- **CHIPS workaround.** `makeDraftModeWorkWithinIframes()` re-sets `__prerender_bypass` with `sameSite: 'none', secure: true, partitioned: true`, so the Web Previews plugin iframe can keep the cookie. Next's own `enable()` doesn't set `Partitioned`.
- **Preview links.** `POST /api/preview-links` implements the Web Previews plugin webhook:
  - it receives `{ item, locale }`;
  - it maps the record to a route with `recordToWebsiteRoute()`;
  - it returns `previewLinks` for "Draft version" (through `/enable`) and "Published version" (through `/disable`), depending on `item.meta.status`.
- **Plugin install.** The plugin is installed and configured by code in `post-deploy`, including `visualEditing.enableDraftModeUrl`.
- **Tokens.** Use separate CDA tokens for published and draft content (`DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN`, `DATOCMS_DRAFT_CONTENT_CDA_TOKEN`) ([SK] `.env.local.example`, `datocms.json`).
- ⚠️ **Outdated DatoCMS snippet.** The DatoCMS draft-mode page ([DC] <https://www.datocms.com/docs/next-js/setting-up-next-js-draft-mode>) still shows synchronous `draftMode().enable()`. Since Next 15, `draftMode()` is async ([NX] draft-mode function). Follow the [SK] code.

### 2.6 Real-time Updates API (`useQuerySubscription`)

- **Pattern.** Recommended by [DC] <https://www.datocms.com/docs/next-js/real-time-updates>:
  - split each page into a server `Page`, a pure `<Content data>` and a client `<RealTime>`;
  - `<RealTime>` calls `useQuerySubscription({ query, variables, token, initialData, includeDrafts, excludeInvalid, contentLink, baseEditingUrl })` and renders `<Content>`.
- **Generated in [SK].** [SK] generates all of this with `generatePageComponentAndMetadataFn` (`src/lib/datocms/realtime/*`). It renders `<RealTime>` only when draft mode is on, and plain server `<Content>` otherwise.
- **Constraints of this pattern:**
  - `<Content>` must be renderable on **both** server and client, so no server-only code goes in it.
  - The **draft CDA token is sent to the browser** as a prop in draft mode (`generatePageComponent.tsx`: `token={process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN!}`). ⚠️ This is a deliberate trade-off. Anyone holding the draft-mode cookie can read the read-only draft token.
- **Limits.** There are at most 500 concurrent SSE connections per project. Each relevant change triggers one CDA call per *distinct* subscription, regardless of how many clients share it ([DC] <https://www.datocms.com/docs/real-time-updates-api/limits-and-pricing>).

### 2.7 Visual Editing / Content Link

Source: [DC] <https://www.datocms.com/docs/next-js/visual-editing>, react-datocms `docs/content-link.md`.

- **Level 1 works without a plugin.** Fetch drafts with `contentLink: 'v1'` + `baseEditingUrl`, and render `<ContentLink/>` from `react-datocms/content-link` in draft mode only. Click-to-edit then opens DatoCMS in a new tab.
- **Level 2 adds the Web Previews plugin,** which gives a side-by-side editor. ContentLink detects the iframe automatically. Pass `onNavigateTo={router.push}` and `currentPath={pathname}` ([SK] `src/components/ContentLink`).
- **Rules for Structured Text:**
  - wrap the whole field in `data-datocms-content-link-group`;
  - wrap blocks, inline records and inline blocks in `data-datocms-content-link-boundary`;
  - `renderLinkToRecord` needs no boundary.
- **Non-text fields** use `data-datocms-content-link-url={record._editingUrl}` or `data-datocms-content-link-source={someStegaString}`.
- **CSP.** If you set `frame-ancestors`, allow `https://plugins-cdn.datocms.com`.
- **Stega hazard.** Invisible characters break comparisons, JS and CSS. Use `stripStega()` from `@datocms/content-link`, or `react-datocms/stega`, which is server-safe. It works on strings, objects and arrays ([DC] <https://www.datocms.com/docs/visual-editing>). [LP] strips `displayOptions` before `switch` (`app/[locale]/(common-layout)/[slug]/Content.tsx`).
  - ⚠️ The [SK] `generateMetadataFn` fetches with `includeDrafts` (so with stega) and passes the result straight to `toNextMetadata`. Titles and descriptions in draft mode will therefore contain stega characters. That only matters for previews, but the seed should strip there.

---

## 3. SEO

### 3.1 `_seoMetaTags` and `faviconMetaTags`

Source: [DC] <https://www.datocms.com/docs/content-delivery-api/seo-and-favicon>.

- **What it is.** `_seoMetaTags { tag attributes content }` exists on every record. It merges the record's "SEO and Social" field with the global SEO preferences.
- **Fallbacks are automatic and ordered:**
  - **title:** the SEO field → the model's "SEO fallback title" field → the first single-line string with "Show as heading" → the first single-line string → the global setting;
  - **image:** the SEO field → the model's "Fallback social card image" → the first image-validated asset field → the first asset field → the global setting;
  - **description:** the SEO field → the model's excerpt field (plain text, truncated to 200 chars) → the global setting.
- **Title suffix.** The global suffix is appended only if the total length is ≤ 60 characters. It is not appended to OG/Twitter titles.
- **noindex.** `robots noindex` is emitted when the global or field "prevent indexing" is on.
- **Favicons.** Use `_site { faviconMetaTags(variants: [icon, appleTouchIcon, msApplication]) { … } }`.
- **Seed design implication.** Configure the "SEO fallback title", "Fallback social card image" and excerpt on every routable model. `_seoMetaTags` then works without editors filling the SEO field.

### 3.2 `toNextMetadata` (react-datocms 8.1.2, `src/Seo/nextUtils.ts`)

- **What it maps:**
  - `title`;
  - `og:*` with one segment (camelized into `openGraph`), plus `og:image`, `og:image:width` and `og:image:height`;
  - `twitter:*` with one segment;
  - other `name=` metas (so `robots`/`description` land at the top level);
  - favicon and apple-touch `<link>`s into `icons`.
- **What it drops:** `og:image:alt`, `twitter:image:alt`, `article:modified_time`, `article:publisher`, and `msapplication-*`.
- **What it never produces:** canonical or `alternates.languages` (hreflang). These are not in `_seoMetaTags` either.
- **Imports.** Import from `react-datocms/seo`, as [SK] and [LP] do.
- **Merging with Next metadata:**
  - Next merges metadata across segments **shallowly**. Nested objects like `openGraph` from a layout are **replaced** by the page's ([NX] generate-metadata § Merging).
  - [SK] spreads `parentMetadata` and then `toNextMetadata(tags)`, which is also shallow.
  - Favicons come from the layout's `generateMetadata` ([SK] `src/app/(base-layout)/layout.tsx`).
- **Seed recommendation:**
  - set `metadataBase` in the root layout (return it as a string if `generateMetadata` uses `'use cache'`, [NX] generate-metadata § metadataBase);
  - add `alternates.canonical` and `alternates.languages` from the URL builder + `_allSlugLocales`;
  - `stripStega` in draft mode.

### 3.3 `sitemap.ts`, `robots.ts`

- **Where they live and what they return.** `app/sitemap.ts` returns `MetadataRoute.Sitemap` entries (`url`, `lastModified`, `changeFrequency`, `priority`, `alternates.languages`, `images`). `app/robots.ts` returns `MetadataRoute.Robots` ([NX] <https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap>, …/robots).
- **Caching.** Both are special route handlers, "cached by default unless it uses a Request-time API or dynamic config". The CMS fetch inside them therefore needs the same tag, so the webhook invalidates them.
- **Large sites.** `generateSitemaps` splits sitemaps ([NX] generate-sitemaps).
- **Getting all URLs.** CDA returns at most 500 per collection. Use `executeQueryWithAutoPagination` / `rawExecuteQueryWithAutoPagination` (only one oversized selection per query) ([DC] <https://www.datocms.com/docs/content-delivery-api/pagination>). Use `_updatedAt` for `lastModified` ([DC] meta-fields).
- ⚠️ None of the official Next starters implement sitemap or robots. This is new code for the seed.

### 3.4 llms.txt (spec v2, August 2026)

Source: <https://llmstxt.org/> (index.md) and <https://llmstxt.org/changes.md>.

- **Location.** The file is `/llms.txt` at the root, **or at any subpath**. A file covers the URLs under its path, and the most specific one wins (new in v2).
- **Format, in order:**
  1. an optional BOM;
  2. an **H1 with the site name** (the only required part);
  3. a blockquote summary;
  4. optional non-heading Markdown;
  5. zero or more **H2 "file list" sections**, each a list of `[name](url)` with optional `: notes`.

  An `## Optional` section is a convention for secondary links. **v2 removed its special mechanical meaning.**
- **Per-page Markdown.** Pages should expose a Markdown version at the same URL with `.md` appended (`page.html.md`) or the extension replaced (`page.md`). URLs without a filename use `index.html.md` / `index.md`.
- **Discovery (v2).** Use `<link rel="alternate" type="text/markdown" href="…md">` and `<link rel="describedby" href="/llms.txt">`, or the HTTP `Link:` header equivalent.
- **Removed in v2.** The `llms_txt2ctx` context-expansion tooling is no longer part of the proposal.
- ⚠️ **`llms-full.txt` is not defined by the llmstxt.org spec (v1 or v2).** The spec page does not mention it. It is a vendor or community convention (e.g. docs platforms). Treat it as optional and non-normative.
- **Worked example.** DatoCMS itself publishes `https://www.datocms.com/llms.txt` and `/docs/llms.txt`, with a `.md` version of every docs page.
- **Generating it from the CMS (seed design):**
  - a route handler `app/llms.txt/route.ts` that queries routable models with auto-pagination, uses the URL builder, and emits H1 = `_site.globalSeo.siteName`, blockquote = the global SEO description, and one H2 section per model;
  - per-page Markdown through a route (e.g. a rewrite of `/:path*.md` to a handler) that renders Structured Text with `datocms-structured-text-to-markdown` (v6.0.0, `structured-text/packages/to-markdown`). It supports `renderBlock` / `renderInlineRecord` / `renderLinkToRecord`, and `inlineItem`/`itemLink` without a handler fall back to text or are skipped (package README).
  - Modular-content pages need a per-block Markdown serializer. That is the same `__typename` registry idea, with a `toMarkdown` per block.
  - Tag these handlers with the same cache tag as the pages.

---

## 4. Custom models, blocks, Structured Text

### 4.1 Concepts

Sources: [DC] <https://www.datocms.com/docs/content-modelling/blocks>, …/modular-content, …/structured-text, …/single-instance.

- **Blocks** exist only inside a parent record. They cannot be linked, don't count toward record limits, are deleted with the parent, and **cannot be localized themselves**. Localization happens at the containing field.
- **Modular content** comes as "Multiple blocks" (an array) or "Single block" (`single_block`: one block or `null`). Validators: `rich_text_blocks` (required, lists the allowed block models) and `size` for min/max count ([DC] <https://www.datocms.com/docs/content-management-api/resources/field>).
- **Structured Text** (`structured_text`) has two required validators: `structured_text_blocks` and `structured_text_links`. Optional ones are `structured_text_inline_blocks`, `required` and `length`.
  - `structured_text_links` also controls what happens on publish, unpublish and delete of referenced records. Defaults: `fail` on publishing with unpublished references, `delete_references` on unpublish and delete.
- **Single-instance models** are pages like the homepage, or global settings, that have exactly one record ([DC] single-instance). They are queried as `homepage { … }` rather than `allX`.
- **Strict mode.** "Required" validations turn into non-null types under `X-Exclude-Invalid`. Validations are the main lever for making UI code free of null checks ([DC] api-endpoints; [DC] <https://www.datocms.com/docs/content-modelling/validations>).
- **Invalid drafts.** "Allow saving invalid drafts" postpones validation until publish. Combined with `excludeInvalid`, invalid drafts silently vanish from preview. ⚠️ This is worth deciding per model.

### 4.2 Querying

Sources: [DC] <https://www.datocms.com/docs/content-delivery-api/modular-content-fields>, …/structured-text-fields.

- **Modular content:** `sections { ... on RecordInterface { id __typename } ...HeroFragment ...FaqFragment }`. All records and blocks implement `RecordInterface`.
- **Structured Text:** `body { value blocks { … } inlineBlocks { … } links { … } }`. Each list needs `id` and `__typename`.

### 4.3 Rendering by `__typename`

- **Starter Kit pattern:**
  - Each block component exports its fragment (e.g. `ImageBlockFragment on ImageBlockRecord`) and takes `data: FragmentOf<typeof …>`. It unmasks with `readFragment` ([SK] `src/components/blocks/ImageBlock/index.tsx`).
  - The page query imports every fragment and lists them in the `graphql()` second argument ([SK] `…/basic/page/[slug]/page.tsx`).
  - Heavy client blocks are `next/dynamic`-imported (`VideoBlock`).
- **`<StructuredText>` props (react-datocms `docs/structured-text.md`):**
  - `data`;
  - `renderBlock`, `renderInlineBlock`, `renderInlineRecord`, `renderLinkToRecord({ record, children, transformedMeta })`;
  - `customNodeRules` / `customMarkRules` (via `renderNodeRule`/`renderMarkRule`);
  - `renderText`, `metaTransformer`.
  - Overriding the rules for `block`/`inlineItem`/`itemLink`/`inlineBlock` disables the corresponding `render*` prop.
  - It **throws `RenderError`** if the document has such a node and the prop is missing, or if the id is not in `data.blocks`/`data.links` (source `src/StructuredText/index.tsx`, lines 155–245). A missing fragment in the query therefore crashes the page. The seed may want an error boundary, or a registry that returns `null` for unknown types.
- **`<Text>` wrapper ([SK] `src/components/Text`).** It adds the `data-datocms-content-link-group` wrapper and project-wide node rules (code blocks, headings with anchors). Caller rules are prepended so they win.
- **Page builder with variants ([LP]).** A block has a `displayOptions` enum field, and `Content.tsx` switches on `__typename` and then on `stripStega(displayOptions)` to choose a visual variant (`components/blocksWithVariants/<BlockRecord>/<Variant>/`). This maps well onto a theme seed. Blocks are data contracts; variants are theme components.
- **Seed recommendation.** Keep a central `blocks/registry.ts` mapping `__typename → { Component, fragment }`, and have one `<Blocks>` renderer for modular content. The same registry supplies `renderBlock` for Structured Text.
  - ⚠️ The GraphQL query still has to list the fragments statically. gql.tada needs fragments passed explicitly; codegen needs them in documents. So the registry can't fully auto-generate queries.
  - Watch the CDN-cacheable query size limit (12 KB compressed) as block counts grow.

### 4.4 Other limits worth knowing

- **Pagination defaults.** `first` defaults to 20 and is capped at 500. The same applies to `_allReferencingX` inverse relations, which are blocks-aware and must be enabled per model ([DC] <https://www.datocms.com/docs/content-delivery-api/inverse-relationships>).
- **Block limits.** Record block limits and byte-size limits exist ([DC] content-modelling/record-block-limits-and-byte-size-limits). ⚠️ Not researched in detail.

---

## 5. Navigation and menus

- **Hierarchical sorting (tree collections).** This was "Tree-like collections" until it was renamed in 2025. It is enabled per model in Presentation → "Default collection ordering" ([DC] <https://www.datocms.com/docs/content-modelling/hierarchical-sorting>).
  - CDA exposes `parent` and `children`; query roots with `allX(filter: { parent: { exists: false } })` ([DC] <https://www.datocms.com/docs/content-delivery-api/hierarchical-sorting>).
  - GraphQL has no recursion, so the depth is fixed by the query. [LP]'s docs sidebar nests `children` 4 levels deep (`app/[locale]/(docs-layout)/query.graphql`). ⚠️ It also fetches `content { value }` at every level, which is wasteful. Select only nav fields.
- **Block-based menus ([LP]).** A single-instance `layout` model holds:
  - `menu`, a modular content field with `MenuItemRecord { title page { slug } }` and `MenuDropdownRecord { title items { … } }`;
  - `footerLinks` (links to `LegalPageRecord`), `socialMediaLinks`, `logo`, `notification` (Structured Text).

  It is queried once in the shared layout with `locale`/`fallbackLocales` (`app/[locale]/(common-layout)/query.graphql`). The menu item points to a record via a **link field**, not a hard-coded URL, so renaming a slug never breaks navigation.
- **Link fields.** They take `item_item_type` (required: allowed models), plus `required` and `unique` ([DC] <https://www.datocms.com/docs/content-management-api/resources/field>). Inverse lookups need no reverse field ([DC] links).
- **Seed recommendation.**
  - Use a single-instance "Site settings / Navigation" model with modular-content menu blocks (`MenuLink` → link field to any routable model, `ExternalLink` → URL string, `MenuGroup` → nested blocks).
  - Resolve hrefs through the same `__typename` URL builder.
  - Use a hierarchical `Page` model only where the nav mirrors the page tree (e.g. docs).
  - Flag: block nesting depth also has to be fixed in the query.

---

## 6. Routing

### 6.1 Slugs

Sources: [DC] <https://www.datocms.com/docs/content-modelling/slug-permalinks>, <https://www.datocms.com/docs/content-management-api/resources/field>.

- **Behaviour.** A slug field is pre-filled from a reference title field and does not change when the title changes.
- **Validators.** `slug_title_field`, `slug_format` (`predefined_pattern: "webpage_slug"` or `custom_pattern`), `required`, `unique`, `length`.
- **Uniqueness scope.** `unique` means "unique across the whole collection of records". **Scoping by parent is not available.** So for hierarchical URLs (`/about/team`), either:
  - keep slugs globally unique and build the path from the `parent` chain, or
  - store a full path in a string field with a `unique` + format validation (maintaining it needs a plugin or migration).

  ⚠️ Whether `unique` on a localized slug is enforced per locale or across locales is not stated in the docs read. Verify.

### 6.2 Catch-all and `generateStaticParams`

- **Optional catch-all.** `app/[[...slug]]/page.tsx` matches `/` too, with `slug: undefined` ([NX] <https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes>).
- **Generating params.** `generateStaticParams` can return all paths, a subset, or `[]` to render everything on first visit. `dynamicParams = false` 404s unknown paths. ISR does not call `generateStaticParams` again ([NX] generate-static-params).
  - ⚠️ Under Cache Components, an empty array is a build error.
- **What the starters do:**
  - Every official starter uses **per-model folders** (`posts/[slug]`, `legal/[slug]`, `product/[slug]`, a flat `[slug]` for pages) rather than one catch-all resolver ([LP], [EC]).
  - A single catch-all that resolves a path to any model is **not demonstrated** by any official DatoCMS starter. It would be seed-specific design.
- ⚠️ **Pitfalls seen in the starters:**
  - [LP] `PageStaticParams` queries `allPages { slug }` with no `first`, so it gets at most 20 pages ([DC] pagination default).
  - [EC] `slugLookup.graphql` uses `allProducts(first: 100)`.
  - The archived `nextjs-demo` returned plain strings instead of `{ slug }` objects from `generateStaticParams` (`app/posts/[slug]/page.js`).

### 6.3 URL builder (reuse)

[SK] `src/lib/datocms/gqlUrlBuilder/`:

- per model, a `<Model>UrlFragment` (the routing fields) plus `buildUrlFor<Model>(fragment)`;
- `buildUrlFromGql(record)` dispatches on `__typename`;
- link components compose the URL fragment rather than raw `slug`, so URL shapes can change without touching callers.

The CMA-side twin is `recordToWebsiteRoute(item, locale)` in `recordInfo.ts`, used by preview links and SEO analysis. The seed should keep both in one module so they cannot drift.

### 6.4 Listing pages and pagination

- **Paging.** Use `allPosts(first: N, skip: (page-1)*N, filter, orderBy)` plus `_allPostsMeta(filter) { count }`, with the same filter on both ([DC] pagination).
- **What [LP] does.** It uses a `posts/page/[page]` route with `skip: (params.page - 1) * 9` (`app/[locale]/(common-layout)/posts/page/[page]/page.tsx`). Tag and author listing routes are `posts/tag/[slug]` and `posts/author/[slug]`.
- **Category pages.** Use either a filter on the link field (`filter: { category: { eq: $id } }`) or `_allReferencingPosts` on the category (requires "inverse relationships" to be enabled) ([DC] inverse-relationships).
- **Cache tags.** Large listing queries return many cache tags and invalidate often. Paginate or split to keep invalidation precise ([DC] cache-tags-format § Granularity).

### 6.5 Localization

Sources: [DC] <https://www.datocms.com/docs/content-delivery-api/localization>, <https://www.datocms.com/docs/general-concepts/localization>.

- **Locales.** `_site { locales }` lists them. The first locale is the default when no `locale` argument is given.
- **Querying a locale.** Pass `locale: it` at the query or field level. Use `fallbackLocales: [it, en]` to fill null-ish values (null, empty string, empty array) in order. Fallbacks are a **query-time** concern: "requires changes in your website query code".
- **Which records exist in a locale.** `_locales` lists the locales a record has. Filter with `_locales: { allIn | anyIn | notIn }` for models with optional locales.
- **Every locale at once.** `_all<Field>Locales { locale value }` returns all values, e.g. `_allSlugLocales`. [EC] uses it to build a per-locale slug map, redirect to the canonical localized slug, and power the language switcher (`utils/productSlugs.ts`, `app/[lng]/product/[slug]/page.tsx`).
- **i18n routing in the starters ([LP], [EC]):**
  - The route segment is `app/[locale]/…` ([EC] uses `[lng]`).
  - `proxy.ts` (Next 16's rename of `middleware.ts`, Node runtime only, [NX] v16 upgrade guide) detects the locale with `negotiator` + `@formatjs/intl-localematcher`, following the [NX] i18n guide. It redirects `/` to `/<locale>/home`.
  - Locales come from `_site.locales` via the CDA, which is called in the proxy on every non-asset request. That is cached through `force-cache`, but ⚠️ it is still a fetch on the request path. A static locale list in config is cheaper.
  - The DatoCMS locale `en_US` is converted to `en-US` for negotiation.
  - `generateStaticParams` crosses slugs × locales.
  - The UI strings library is `i18next`/`react-i18next` in [EC], and none in [LP]. No official example uses `next-intl`. Next docs list `next-intl`, `next-international`, `paraglide-next`, `lingui` and others without preference ([NX] <https://nextjs.org/docs/app/guides/internationalization> § Resources).
- **`next/root-params` (introduced in **v16.3.0**).** It lets any server code read `lang` without prop-drilling, but it is not available inside `unstable_cache` ([NX] next-root-params). It is a good fit for the seed's `executeQuery` to default the `locale` variable. ⚠️ It is very new.

---

## 7. Official starters: architecture review

| Repo @ commit | Status | Stack | What it demonstrates |
|---|---|---|---|
| `nextjs-starter-kit` @ `4abee90` (2026-09-24) | Maintained; linked from DatoCMS docs | Next ^16, React 19, react-datocms ^8.0.5, cda-client ^0.3.1, gql.tada | fetching wrapper, global-tag invalidation, draft mode (+iframe cookies), real-time, Content Link + Web Previews, SEO metadata helper, Structured Text with blocks/inline records/links, URL builder, CMA-typed record→URL, one-click project setup via `post-deploy` |
| `next-landing-page-demo` @ `efe7242` (2026-09-03) — "Marketing Website" | Maintained | Next ^16, graphql-codegen, Tailwind 3 | i18n `[locale]` + `proxy.ts`, singleton layout with block menus, page-builder with variants, blog with pagination/tag/author, tree-structured docs sidebar, real-time wrapper; ships agent `skills/` docs |
| `ecommerce-website-demo` @ `5166109` (2026-09-03) — "Ecommerce Website" | Maintained | Next ^16, graphql-codegen, i18next, Tailwind 3 | `[lng]` routing, localized slugs via `_allSlugLocales` with redirects, product filters/pagination |
| `nextjs-with-cache-tags-starter` @ `3a461d8` (2026-03-09) | Maintained but old deps | Next 14.2.3, react-datocms 6, cda-client 0.2 | granular cache tags via Turso mapping |
| `nextjs-demo` @ `1b22097` | **Archived** | Next 13, JS, react-datocms 4 | legacy blog; raw `fetch` with `X-Visual-Editing: vercel-v1` |

(Archive and push status come from the GitHub API `orgs/datocms/repos` listing, 2026-09-29.)

### 7.1 [SK] folder structure (condensed)

```
src/app/
  layout.tsx                      # bare <html>
  (base-layout)/layout.tsx        # favicon metadata, <ContentLink/> in draft, header
  (base-layout)/basic/page/[slug] # plain server page pattern
  (base-layout)/real-time-updates/[slug]/{page,common,Content,RealTime}.tsx
  api/{draft-mode/enable,draft-mode/disable,invalidate-cache,preview-links,seo-analysis,post-deploy}
src/components/{blocks/*, inlineRecords/*, linkToRecords/*, Text, ResponsiveImage, ContentLink, DraftModeToggler}
src/lib/datocms/{executeQuery,graphql,graphql-env.d.ts,commonFragments,generateMetadataFn,recordInfo,cma-types,gqlUrlBuilder/*,realtime/*}
```

### 7.2 Worth reusing

- **One `executeQuery` wrapper** that holds the draft-mode, token, strict-mode, Content Link and cache-tag concerns ([SK]).
- **gql.tada with colocated fragments,** the scalar map, and `TagFragment @_unmask` for SEO tags ([SK]).
- **`generateMetadataFn` / `generatePageComponentAndMetadataFn` factories.** A route becomes "query + variables + pick SEO + Content component" ([SK]). This is the main lever for making DatoCMS invisible to UI developers.
- **Draft mode routes** with the open-redirect guard and the CHIPS cookie fix; **preview-links** endpoint; **`post-deploy`** automation that creates the webhook and plugins via the CMA ([SK]).
- **`<Text>` wrapper** that enforces the Visual Editing attributes ([SK]).
- **URL builder per model** plus a `__typename` dispatcher ([SK]).
- **Block/variant folder convention** and `stripStega` on enum fields ([LP]).
- **Singleton layout model** for menus, footer and social links, queried in the locale layout ([LP]).
- **`_allSlugLocales` slug map** for the language switcher and canonical redirects ([EC]).

### 7.3 Worth avoiding or fixing

- **The global `datocms` tag with `revalidateTag(…, 'default')`.** It invalidates everything, with an unbounded stale window. Choose the profile deliberately, and plan the upgrade path to query-level tags ([SK], [LP]).
- **No `React.cache` dedupe.** Metadata and page each hit CDA in draft mode ([SK]).
- **Stega in draft metadata** ([SK] `generateMetadataFn`).
- **Draft token shipped to the client** for real-time ([SK], [LP]). Acceptable only if the team accepts it.
- **Unbounded or implicit `first`** in static params and lookups ([LP], [EC]).
- **CDA call in `proxy.ts`** to get locales on every request ([LP] `proxy.ts`, `app/i18n/settings.ts`).
- **Dead `'use cache'` helper.** [LP] has `utils/cachedQueryDatoCMS.ts` with `'use cache'` while `cacheComponents` is commented out in `next.config.ts`. `'use cache'` needs `cacheComponents: true` ([NX] use-cache § Usage), and the helper is unused. Don't copy it.
- **The archived `nextjs-demo`** in general: Next 13, JS, legacy headers, and a buggy `generateStaticParams`.
- **Duplicated query and metadata code** between `basic/` and `real-time-updates/` in [SK]. Pick one page pattern for the seed.

---

## Open questions / trade-offs for the team

1. **Caching model.** Choose between:
   - **(a)** `fetch` + `force-cache` + `next.tags` (proven in every DatoCMS starter; the Data Cache persists across deploys, so purge on deploy), or
   - **(b)** `cacheComponents` + `'use cache'` + `cacheTag` (the Next 16 direction; entries reset on deploy; the in-memory handler is weak on serverless; stricter `generateStaticParams`).
2. **Invalidation granularity.** Choose between:
   - a global tag (zero infrastructure);
   - query-id tags with a mapping DB (Turso, Postgres or KV), which needs an owned database in the invalidation path;
   - CDN-level tags, which pushes the choice of host toward Cloudflare, Netlify or Fastly (DatoCMS's stated preference) and away from Vercel's 128-tag cap.
3. **`revalidateTag` profile for the webhook.** `{ expire: 0 }` means editors see changes on the next hit, which then blocks. `'max'` means the first hit is stale.
4. **Hosting target.** It affects items 1–3, deploy-time purge, and whether `'use cache: remote'` is available.
5. **Real-time previews.** Decide whether to use them at all, given the draft token exposure, the 500-connection limit, and the constraint that `<Content>` must be client-renderable. The alternative is Web Previews plugin reloads (`reloadPreviewOnRecordUpdate` in the preview-links response).
6. **Routing.** Per-model route folders (official pattern) or a single `[[...slug]]` resolver? Hierarchical paths from a tree `Page` model or a stored full path? Slug uniqueness is model-wide only.
7. **Page builder shape.** Pick one of:
   - modular content only;
   - Structured Text with blocks;
   - both, sharing a registry.

   Also decide whether to use block variants through an enum field, as [LP] does.
8. **Typed queries.** gql.tada (inline, no codegen step, [SK]) or graphql-codegen (`.graphql` files, [LP]/[EC])? And how to handle `X-Environment` for sandbox schemas.
9. **i18n.** Choose:
   - a UI string library: none, `next-intl`, or `i18next`;
   - where the locale list lives: CDA `_site.locales` versus static config;
   - whether the default locale is prefixed;
   - whether to adopt `next/root-params` (16.3+).
10. **Strict mode vs invalid drafts.** `excludeInvalid` hides invalid drafts in preview. Decide the "Allow saving invalid drafts" policy per model.
11. **llms.txt scope.** Root-only or per-section files? Per-page `.md` versions or not? Include `llms-full.txt` (non-standard)?
12. **Query size budget.** Large page-builder queries may exceed the 12 KB CDN-cacheable limit and the 10M complexity cap. Consider splitting queries per section, which also improves cache-tag precision.

---

## Sources

**DatoCMS documentation** (fetched as Markdown on 2026-09-29; append `.md` to get the raw form):
- Next.js: <https://www.datocms.com/docs/next-js>, …/next-js/optimizing-calls-with-react-cache-function, …/next-js/setting-up-next-js-draft-mode, …/next-js/real-time-updates, …/next-js/visual-editing, …/next-js/seo-management, …/next-js/using-cache-tags
- CDA: <https://www.datocms.com/docs/content-delivery-api/api-endpoints>, …/your-first-request, …/cache-tags, …/cache-tags-format, …/cache-tags-invalidation, …/cache-tags-integrations, …/technical-limits, …/custom-scalar-types, …/seo-and-favicon, …/meta-fields, …/pagination, …/localization, …/hierarchical-sorting, …/modular-content-fields, …/structured-text-fields, …/inverse-relationships
- Content modelling: <https://www.datocms.com/docs/content-modelling/blocks>, …/modular-content, …/structured-text, …/single-instance, …/hierarchical-sorting, …/slug-permalinks, …/links, …/validations
- General: <https://www.datocms.com/docs/general-concepts/localization>, …/general-concepts/webhooks, <https://www.datocms.com/docs/visual-editing>, <https://www.datocms.com/docs/real-time-updates-api/limits-and-pricing>
- CMA field reference (validators): <https://www.datocms.com/docs/content-management-api/resources/field>
- Docs index: <https://www.datocms.com/docs/llms.txt>

**Next.js documentation** (doc version 16.3.6, fetched 2026-09-29):
- <https://nextjs.org/docs/app/api-reference/functions/fetch>, …/revalidateTag, …/updateTag, …/cacheTag, …/cacheLife, …/draft-mode, …/generate-metadata, …/generate-static-params, …/generate-sitemaps, …/next-root-params
- <https://nextjs.org/docs/app/api-reference/directives/use-cache>, …/config/next-config-js/cacheComponents
- <https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap>, …/metadata/robots, …/dynamic-routes, …/proxy
- <https://nextjs.org/docs/app/guides/draft-mode>, …/guides/internationalization, …/guides/migrating-to-cache-components, …/guides/caching-without-cache-components, …/guides/upgrading/version-16, …/guides/upgrading/version-15, <https://nextjs.org/docs/app/getting-started/caching>, <https://nextjs.org/docs/app/glossary>

**llms.txt:** <https://llmstxt.org/> (v2, "Jeremy Howard, 2024-09-03", revised August 2026), <https://llmstxt.org/changes.md>

**Source code** (GitHub `datocms` org, shallow clones on 2026-09-29):
- `datocms/nextjs-starter-kit` @ `4abee909d7d296e171c395dabee80defbb7294bf` (2026-09-24)
- `datocms/next-landing-page-demo` @ `efe724298cd2a45a371055fd8c1e7400482467d3` (2026-09-03)
- `datocms/ecommerce-website-demo` @ `5166109463b684c298286e3e10e54a6078fd094f` (2026-09-03)
- `datocms/nextjs-with-cache-tags-starter` @ `3a461d89914ce7284e1e010c7c4ba452848d0342` (2026-03-09)
- `datocms/nextjs-demo` @ `1b22097dcb1f02596904cf607f6e262bf449f51d` (archived)
- `datocms/react-datocms` @ `759b5b40477fcbdb29a66f31bd46037525de70b0` (v8.1.2; `src/Seo/nextUtils.ts`, `src/StructuredText/index.tsx`, `src/stega/index.ts`, `docs/*.md`)
- `datocms/cda-client` @ `00c4c29f1a832a9aca290093f431e5cf35b3b56e` (v0.3.2; `src/buildRequestHeaders.ts`, `src/executeQuery.ts`, `README.md`)
- `datocms/structured-text` @ `97fc3da80b466267f91ba87f064f173f907af5f9` (`packages/to-markdown`, v6.0.0)
- Repo status and dates: `https://api.github.com/orgs/datocms/repos`
