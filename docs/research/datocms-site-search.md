# DatoCMS Site Search — research notes

Researched 2026-10-01 against the official DatoCMS docs (Markdown versions of the pages, `<url>.md`), the CMA reference, `react-datocms` docs and the DatoCMS pricing page. Facts only; no design decisions.

Labels: **confirmed** = stated in official docs. **not found** = searched official docs, no such feature documented. **uncertain** = some evidence, but no first-hand confirmation.

## Short answers

1. **How it works / query params**: confirmed. DatoCMS runs its own crawler ("DatoCmsSearchBot") over the public site, starting from a configured URL. It runs when a linked build trigger reports a successful deploy, when started by hand, or when started through the CMA. Each page's language is detected (from `lang` or by heuristics) and used for stemming. The search endpoint accepts only `filter[query]`, `filter[fuzzy]`, `filter[search_index_id]`, `filter[locale]`, the deprecated `filter[build_trigger_id]`, `page[offset]` and `page[limit]`.
2a. **Filtering by URL prefix, DatoCMS model or custom metadata**: not found. The query API has no such filter. The documented way to split results is several **search indexes**, each with its own User-Agent suffix plus matching `robots.txt` rules (for example `/docs/` versus `/blog/`). You then choose one index per query with `search_index_id`.
2b. **Excluding page parts or whole pages**: confirmed. `data-datocms-noindex` on an element removes that subtree from indexing. Whole pages can be excluded only through `robots.txt` (`Disallow`). The crawler **does not** honour `<meta name="robots" content="noindex|nofollow">`.
3. **robots.txt, sitemap and public reachability**: confirmed. It honours `robots.txt` (`user-agent`/`allow`/`disallow`, `*`, `$`; the first matching rule wins; no `crawl-delay`). It reads sitemaps, including sitemap indexes, from the `Sitemap:` line in robots.txt or else from `/sitemap.xml`. `frontend_url` is documented as "the public URL of the website". Requiring the site to be publicly reachable is an inference (see below).
4. **Limits**: confirmed. Spiderable pages: Free 200, Professional 5k (pricing page). Each request returns 20 results by default and 100 at most. `body_excerpt` holds the first 200 characters. `highlight.title[]` and `highlight.body[]` use `[h]…[/h]` markers. CMA rate limit: 60 requests every 3 seconds. That this limit applies to the search endpoint is inferred.
5. **Site-level noindex and robots.txt**: partly confirmed.
   - Confirmed: the CMA `site` resource has `no_index` (boolean).
   - Confirmed: the CDA `_seoMetaTags` emits `robots noindex` when global SEO preferences or the record's SEO field has "Prevent from being indexed" turned on.
   - Uncertain: a CDA `_site { noIndex }` field. I could not verify it by schema introspection.
   - Not found: DatoCMS does not generate or manage `robots.txt` in any way.

## 1. How Site Search works

Verified facts:

- "Every time your website finishes being deployed, we'll crawl it to fetch updated content." You query results from the frontend through the **Content Management API** (REST). [Overview](https://www.datocms.com/docs/site-search)
- The setup is built around **search indexes**. Each one has `name`, `enabled`, `frontend_url` (the start URL), an optional `user_agent_suffix`, `build_triggers[]`, and `meta.indexing_status` (`unstarted|pending|success|failed`) with `meta.last_indexing_completed_at`. A project can have several. [Configuration](https://www.datocms.com/docs/site-search/configuration), [CMA Search Index](https://www.datocms.com/docs/content-management-api/resources/search-index)
- Ways to start indexing:
  - a linked build trigger finishing a successful deploy;
  - a manual start in the CMS;
  - the CMA `client.searchIndexes.trigger(id)` call. [Trigger](https://www.datocms.com/docs/content-management-api/resources/search-index/trigger)
  - A running crawl can be aborted through the CMA.
- Search indexes used to be tied to build triggers and are now separate entities. The deprecated `build_trigger_id` filter "will return an error if the build trigger has multiple search indexes associated". [Search for results](https://www.datocms.com/docs/content-management-api/resources/search-result/instances). A 2025 recap post also mentions the split and new crawler logs. [A look back at 2025](https://www.datocms.com/blog/a-look-back-at-2025)
- The crawler is an in-house spider. It starts from the Starting URL, recursively follows links to the same domain, and adds sitemap URLs. It **does not execute JavaScript** and parses plain HTML only. Typical speed is about 20 pages per second. [How the crawling works](https://www.datocms.com/docs/site-search/how-the-crawling-works)
- **Locale**: "Through the HTML global `lang` attribute present on a page — or language-detection heuristics, if the attribute is missing — we detect the language of every crawled page", which drives stemming. All locales go into one index, and a query can be limited to one locale with `filter[locale]`. [How the crawling works](https://www.datocms.com/docs/site-search/how-the-crawling-works)

Query API, `GET /search-results` (CMA), from [Search for results](https://www.datocms.com/docs/content-management-api/resources/search-result/instances):

| Param | Notes |
|---|---|
| `filter[query]` | text to search |
| `filter[fuzzy]` | "When any value is passed" fuzzy matching is on (Levenshtein) |
| `filter[search_index_id]` | if omitted, "the first enabled search index will be used"; the docs strongly recommend always passing it |
| `filter[locale]` | "Restrict the search on pages in a specific locale" |
| `filter[build_trigger_id]` | deprecated |
| `page[offset]`, `page[limit]` | limit defaults to 20, maximum 100 |

These are the only parameters documented. The response includes `meta.total_count`.

- JS client: `client.searchResults.rawList({ filter, page })` or `listPagedIterator`. The docs use `@datocms/cma-client-browser`, and `@datocms/cma-client-node` also works. [Perform searches via API](https://www.datocms.com/docs/site-search/base-integration)
- Auth: a CMA API token whose role has only the permission "Can perform Site Search API calls". The docs' examples create this token in browser code. [Perform searches via API](https://www.datocms.com/docs/site-search/base-integration)
- `react-datocms` `useSiteSearch` takes these options:
  - `client` and `searchIndexId` (both required);
  - `fuzzySearch` (default false);
  - `resultsPerPage` (default 8);
  - `highlightMatch(text, key, context: 'title'|'bodyExcerpt')`;
  - `initialState.{query, locale, page}`.

  It returns `state` (`query`, `locale`, `page` and their setters) and `data` (`pageResults[]`, `totalResults`, `totalPages`). It has no filter option beyond locale. [react-datocms site-search.md](https://github.com/datocms/react-datocms/blob/master/docs/site-search.md)

## 2. Filtering and exclusion

Verified facts:

- A `search_result` has exactly these fields: `id`, `title`, `body_excerpt`, `url`, `score`, `highlight {title[], body[]}`. It carries **no model, record ID, type, or custom metadata field**. [Search result](https://www.datocms.com/docs/content-management-api/resources/search-result)
- The query endpoint has **no URL, path, model or metadata filter** (full list in section 1).
- The docs never mention reading custom meta tags or `data-*` attributes into the index. The only documented attribute is `data-datocms-noindex`, and it only excludes content.
- **Splitting by path prefix (documented).** "By using a custom User-Agent and a custom-tailored robots.txt, you can restrict the crawling to specific subsets of your website". For example, one index with suffix `Docs` and one with suffix `Blog`:
  ```
  User-agent: DatoCmsSearchBotDocs
  Allow: /docs/
  Disallow: /

  User-agent: DatoCmsSearchBotBlog
  Allow: /blog/
  Disallow: /
  ```
  [How the crawling works](https://www.datocms.com/docs/site-search/how-the-crawling-works)
- **Excluding part of a page:** add a `data-datocms-noindex` attribute to an element. "everything contained in those elements will be ignored during indexing" (the docs' example is header and footer).
- **Excluding a whole page:** only `robots.txt` `Disallow` works. "DatoCmsSearchBot does not currently support the `crawl-delay` directive in robots.txt and robots meta tags on HTML pages such as `nofollow` and `noindex`."

Inference (not documented):

- **"Narrow by model" has no native support.** It is possible only when each model maps to its own URL prefix: you build one search index per prefix with the UA-suffix plus robots.txt technique, then choose the index per query. Each extra index re-crawls its part of the site, and the per-plan page quota probably counts pages in every index, though the docs do not say so.
- Another option is filtering returned `url`s by prefix on the client side. Then `total_count` and pagination stop matching the filtered list, because the server pages before you filter.
- Pages marked `noindex` through `_seoMetaTags` will still show up in Site Search when they can be reached by links or the sitemap. To keep them out, add `robots.txt` rules or wrap their content in `data-datocms-noindex`.

## 3. robots.txt, sitemap, reachability

Verified facts, all from [How the crawling works](https://www.datocms.com/docs/site-search/how-the-crawling-works) unless noted:

- User-Agent is `DatoCmsSearchBot`, or `DatoCmsSearchBot<Suffix>` when an index has a suffix.
- **robots.txt rules:**
  - `user-agent`, `allow` and `disallow` are honoured, case-insensitive, with a simple `*` wildcard and a `$` end-of-path marker (query strings are ignored).
  - **Only the first matching Allow/Disallow line applies.** Rule order matters, not specificity.
  - A robots.txt with several groups for the same user agent is not supported.
- **Sitemaps:** the crawler first reads `Sitemap:` lines in robots.txt and otherwise tries `/sitemap.xml`. Sitemap index files are supported. URLs outside the configured frontend domain are ignored.
- `frontend_url` is described as "The public URL of the website. This is the starting point from which the website's spidering will start". [Search Index](https://www.datocms.com/docs/content-management-api/resources/search-index)

Inference:

- The site must be reachable from DatoCMS's servers over HTTP. The docs mention no auth, basic-auth or header settings for the crawler, so preview or staging deployments behind authentication can probably not be indexed. "Public" is the docs' own word, but the docs never test or state this restriction directly.
- Next.js server-rendered or static HTML can be crawled. Content rendered only on the client would not be indexed.

## 4. Limits

Verified facts:

- **Spiderable pages** per plan: Free **200**, Professional **5k**. The pricing page defines this as "the number of pages in your frontend website that we'll scrape and index". Enterprise is custom. [Pricing](https://www.datocms.com/pricing)
- **Results per request:** 20 by default, at most 100. [Search for results](https://www.datocms.com/docs/content-management-api/resources/search-result/instances)
- **Snippet:** `body_excerpt` is the "First 200 characters of page body, unformatted". It is not built around the matched text. [Search result](https://www.datocms.com/docs/content-management-api/resources/search-result)
- **Highlights:** `highlight.title[]` and `highlight.body[]` are fragments where matches are wrapped in `[h]…[/h]`, for example `"All our student accommodation and apartments in [h]Florence[/h] are fully"`. [Perform searches via API](https://www.datocms.com/docs/site-search/base-integration)
- **CMA rate limit:** 60 requests every 3 seconds, signalled by `x-ratelimit-*` headers and HTTP 429. The JS client retries automatically on 429. Shared infrastructure can return 429 under heavy load even below the limit. [CMA Technical Limits](https://www.datocms.com/docs/content-management-api/technical-limits)

Inference:

- The search endpoint is part of the CMA, so the CMA rate limit most likely applies to search queries too. The docs set no separate limit for search. Because the token is meant to be used from browsers, all visitors to a project share that one limit, which matters for search-as-you-type.
- The docs do not say whether Professional's 5k is a soft limit like other Professional quotas (the pricing page says "soft limits you can exceed and pay-as-you-go").

## 5. Site-level robots/noindex in DatoCMS

Verified facts:

- The CMA `site` resource has `no_index: boolean`: "Whether the website needs to be indexed by search engines or not". It also has `global_seo` (`site_name`, `title_suffix`, `fallback_seo {title, description, image}`, …). [CMA Site](https://www.datocms.com/docs/content-management-api/resources/site)
- The "SEO and Social" field includes a **No Index** sub-field: "Control whether the page should be indexed by search engines." [SEO fields](https://www.datocms.com/docs/content-modelling/seo-fields)
- In CDA `_seoMetaTags`, "A `robots noindex` tag will be added if either global SEO Preferences or the 'SEO and Social' field have a 'Prevent from being indexed by search engines' enabled." [CDA SEO and favicon](https://www.datocms.com/docs/content-delivery-api/seo-and-favicon)
- The CDA `_site` documents `faviconMetaTags` and `globalSeo` (for example `titleSuffix`). [CDA SEO and favicon](https://www.datocms.com/docs/content-delivery-api/seo-and-favicon)

Uncertain:

- A CDA field `_site { noIndex }`. The official `gatsby-source-datocms` maps `no_index` to `noIndex` on its Site type, but that plugin is built on the CMA, not the CDA. I could not confirm the field in the CDA GraphQL schema: no introspection was done. Run `{ _site { noIndex } }` once against the project to settle it.
- Per-record SEO `noIndex`, though, is certainly readable from the CDA, either through `_seoMetaTags` or by querying the SEO field.

Not found:

- **robots.txt:** no official doc says DatoCMS generates, hosts or manages `robots.txt`. It belongs to the frontend. The only robots.txt topic in the docs is how the Site Search crawler reads it.
