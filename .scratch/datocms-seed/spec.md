# Spec: DatoCMS Seed (Core)

Status: ready-for-agent

Sources: `grilling-log.md` (decisions Q1–Q81), `CONTEXT.md` (glossary), `docs/adr/` (ADR-0001 routing, ADR-0002 cache invalidation), `deferred.md`, `block-coverage.md`, `docs/research/`.

## Problem Statement

Every new website built on DatoCMS and Next.js re-solves the same content plumbing before any UI work can start: routing, caching and invalidation, preview, SEO, sitemaps, robots rules, accessible Block rendering, menus, search, a contact form, consent and monitoring. The official DatoCMS starters don't fit the kind of Site we build:

- They route each model through its own folder, so URL segments can't be translated or edited by Editors.
- They revalidate the whole Site on every publish.
- They leave indexing rules, consent gating, accessibility checks and anti-spam to each project.

Our first Site, the Museo e Real Bosco di Capodimonte, is a public-administration website. It must be multilingual with translated URLs, accessible (WCAG 2.1 AA legal minimum), fast, careful with personal data and third-party scripts, and maintainable by Editors without developer help. Solving this again for every client is slow and produces inconsistent quality.

## Solution

A reusable **Seed**: a Next.js 16 App Router + React + Tailwind codebase, based on the official DatoCMS Next.js Starter Kit, from which every **Site** is created as a copy with its own DatoCMS project.

The Seed contains a **Core**: a self-contained part that handles everything about DatoCMS. Its scope:

- fetching, caching and invalidation
- routing and Paths
- preview
- SEO and indexing
- Block and Structured Text rendering
- Menus
- Labels
- search
- the contact form
- consent gating
- monitoring

The Core is kept apart from the UI so it can later be extracted into a shared npm package.

The Seed is design-neutral, with its own token layer. Each Site brings its design, its custom models and Blocks, its concrete third-party tools, and its **Site config**.

**Editors** manage everything in DatoCMS:

- the Page tree
- Paths and their translations
- the Home page
- Menus
- Redirects
- SEO settings
- extra robots.txt rules

Editors always see their latest drafts. **Visitors** get fast, static, server-rendered pages that stay fresh after each publish.

## User Stories

### Routing and Paths

1. As an Editor, I want every segment of a Path to come from DatoCMS, so that I can translate or rename a section without a code change.
2. As an Editor, I want to arrange Pages in a tree, so that each Page's Path follows its position in the Site's structure.
3. As an Editor, I want a different slug for each locale, so that Visitors see URLs in their own language.
4. As a Visitor, I want every URL to start with its locale, so that I always know which language I am reading.
5. As a Visitor opening the bare domain, I want to be redirected to my browser's language when the Site offers it, and to the default locale otherwise.
6. As an Editor, I want the Site's locales to come from DatoCMS, with the first as default, so that adding a language needs no code change.
7. As a Visitor, I want a 404 when a record has no translation in the requested locale, so that I never see half-translated or mismatched content.
8. As an Editor, I want to choose any Page as the Home page in Site settings, so that I can prepare and swap alternatives (e.g. a Christmas home), including by scheduling.
9. As a Visitor, I want the Home page's own Path to redirect permanently to the locale root, so that the home has a single URL.
10. As an Editor, I want a Routing rule per Routable model naming its Main page and a localized prefix, so that records get Paths like `/it/articolo/<slug>`.
11. As an Editor, I want an empty prefix in a Routing rule to fall back to the Main page's Path, so that records can sit under their Main page without repeating it.
12. As a Visitor, I want breadcrumbs that place a record under its Main page, so that I understand where I am even when the Path doesn't show it.
13. As a Visitor, I want paginated Listings under a localized suffix (`/it/articoli/pagina/2`), so that page URLs read naturally in my language.
14. As a developer, I want a fixed model order to decide which record wins when two records of different models claim the same Path, so that the behaviour is predictable.
15. As an Editor, I want to create manual Redirects in DatoCMS, so that old URLs keep working after I reorganise content.
16. As an Editor, I want the 404 page's content to come from a Page I choose in Site settings, so that I can write and translate it myself.
17. As a Visitor, I want a static fallback 404 if that Page is missing, and a static 500 page translated in code, so that errors are never blank or broken.
18. As a developer, I want links, sitemap, hreflang, preview links and llms.txt to build Paths through the same code as the resolver, so that they never disagree.
19. As a developer, I want to add a new Routable model to a Site without changing the resolver, so that the Core stays open to Site-specific content.

### Rendering, preview and cache

20. As an Editor, I want draft mode that bypasses the cache, so that I always see my latest drafts on the Site.
21. As an Editor, I want to open draft mode from DatoCMS through the Web Previews plugin, so that previewing is one click away.
22. As a Visitor, I want static, server-rendered pages, so that pages load fast and work without JavaScript.
23. As a Visitor, I want to keep getting the previous version of a page while it regenerates after a publish, so that pages never become slow or unavailable.
24. As a developer, I want a global invalidation mode as the default, so that a fresh Site works with no external database.
25. As a developer, I want a granular invalidation mode, so that a large Site (Capodimonte) regenerates only the pages affected by a publish.
26. As a developer, I want the granular index store behind an adapter, with Turso implemented, so that other stores can be added without touching invalidation logic.
27. As a developer, I want invalidation to fall back to a global revalidation when the index lookup fails or matches too many queries, so that stale content is never left behind.
28. As a developer, I want a full revalidation, wiping the index, on code deploy, deploy rollback and DatoCMS environment promotion, so that the cache always matches the code and the content.
29. As a developer, I want each Netlify deploy context mapped to a DatoCMS environment (production → primary, previews → sandbox), each with its own index, so that previews never touch production content or caches.
30. As a developer, I want a delayed second CDN purge after each invalidation, so that rate-limited purges silently dropped by the platform still take effect.
31. As an Editor, I want an unknown Block type to show a visible "not implemented" placeholder in draft mode, so that I notice content the Site can't render yet.
32. As a Visitor, I want unknown Block types to render nothing in production, so that I never see broken or developer-facing output.

### Navigation

33. As an Editor, I want to manage Menus as records independent of the Page tree, so that navigation can differ from the Site's structure.
34. As an Editor, I want to assign a Menu to each Menu zone (header, footer, top, mobile) in Site settings, reusing the same Menu in several zones if I want.
35. As a developer, I want to add Menu zones for a Site with a new Site settings field and a layout slot, so that designs with extra navigation areas are supported.
36. As an Editor, I want Menu items that link to any Routable model, to an external URL, group other items, or list the sub-pages of a Page automatically, so that I can build any common menu.
37. As a Visitor, I want Menus no deeper than three levels, so that navigation stays usable and accessible.

### SEO and metadata

38. As an Editor, I want each record's title, description and share image to come from its native SEO field, with fallbacks configured per model, so that every page has sensible metadata even when I leave the field empty.
39. As a search engine, I want each page to have a canonical URL, hreflang alternates for its existing translations, `og:image:alt` and `article:modified_time`.
40. As a Visitor sharing a link, I want a correct favicon, title and preview image.
41. As an SEO consultant, I want `noindex` on a record to add meta robots `noindex` and remove the record from the sitemap and from llms.txt, so that one switch excludes it everywhere.
42. As an SEO consultant, I want to exclude a record from llms.txt only, so that it stays in search engines but out of AI summaries.
43. As a developer, I want to declare excluded models in Site config, so that technical models never reach search engines.
44. As an Editor, I want an "also exclude sub-pages" option on a Page, so that I can exclude a whole section from indexing at once.
45. As a search engine, I want a sitemap index with one sitemap per model, split automatically past 50,000 URLs, with `lastmod` taken from each record.
46. As a developer, I want hreflang only in `<head>`, not in the sitemap, so that there is one source of truth.
47. As a developer, I want robots.txt generated from code rules (Seed defaults plus Site rules), so that each Site starts from safe defaults.
48. As an SEO consultant, I want a free-text field in Site settings for extra robots.txt rules, appended after the code rules, so that I can adjust crawling without a deploy.
49. As an SEO consultant, I want to be able to block crawling of the whole Site from that field, so that I can handle situations nobody foresaw.
50. As a developer, I want the Core to drop and log only the robots.txt lines that block DatoCMS's search crawler or are syntactically invalid, so that Editors can't break Site search or produce an unreadable file.
51. As a Site owner, I want non-production deploys to disallow all crawlers except DatoCMS's search crawler and send `X-Robots-Tag: noindex` on every response, so that previews never end up in search engines while Site search can still be tested.
52. As a Site owner, I want a Site setting for AI crawlers (allow all / block training crawlers / block all, default allow all), so that I can decide how AI companies use our content.
53. As a search engine, I want all indexable content in server-rendered HTML, so that I see the same content as a Visitor.
54. As an SEO consultant, I want a Page holding a Listing or Archive search to follow its own SEO settings, with filtered combinations and later pages inheriting them, so that I decide how listings are indexed.
55. As a search engine, I want later Listing pages to be self-canonical, filtered Archive search combinations to point their canonical to the unfiltered page, and neither to be in the sitemap.
56. As an SEO consultant, I want Site search results (`?q=…`) to always be `noindex`, while the search Page without a query follows its own SEO settings.
57. As a search engine, I want WebSite, Organization and BreadcrumbList structured data on every Site, plus a per-model hook for Site-specific types (e.g. Museum, Event).
58. As an AI assistant, I want an llms.txt index of the Site, and per-page Markdown versions when a Site opts in.

### Blocks and content rendering

59. As an Editor, I want a Core catalog of Blocks for page-builder fields: rich text, image, gallery, video, call to action (with buttons), text and image, FAQ, Listing, Site search, Archive search, contact form, content grid, and logos (partners, sponsors).
60. As a developer, I want every native Structured Text node and mark and every DatoCMS field type rendered by the Core, enforced by a test, so that no content shape is ever silently lost.
61. As a developer, I want Block coverage tracked against the DatoCMS Schema Recipes and the Starter Kit, each Block marked handled / to do / not planned, so that gaps are visible.
62. As a developer, I want every Block wrapped in an element with speaking hooks (`dato-block`, `dato-block--<type>`, a modifier per Editor-chosen variant, `data-block-type`, `data-block-id`), so that I can style, debug and test each Block by type.
63. As a developer, I want the `dato-block` prefix configurable per Site, so that it never clashes with a Site's CSS framework.
64. As a developer, I want Menus and Menu zones to follow the same class scheme (`dato-menu dato-menu--header`).
65. As a Visitor using assistive technology, I want Structured Text rendered as clean semantic HTML without extra classes.
66. As a developer, I want to add Site-specific Blocks to the catalog without changing the Core.
67. As an Editor, I want a Video Block that accepts either an uploaded video (Mux) or a YouTube/Vimeo link.
68. As a Visitor, I want external videos to show a preview with a "load video" button until I accept the related cookies, and to use `youtube-nocookie` where possible, so that no third party tracks me without consent.
69. As an Editor, I want a Listing Block where I set the model, page size, order, one linked-record filter and pinned items.
70. As a Visitor, I want responsive images in modern formats, so that pages load fast on any device.

### Images and accessibility

71. As an Editor, I want a "decorative" flag on each Block that uses an image, so that the same upload can be meaningful in one place and decorative in another.
72. As a Visitor using a screen reader, I want decorative images to have empty alt text, so that I am not distracted by them.
73. As an Editor, I want a visible warning in draft mode when a non-decorative image has no alt text, so that I fix it before publishing.
74. As a Visitor, I want a missing alt text to fall back to empty alt in production, with the event logged, so that pages never break and developers learn about it.
75. As a developer, I want automated accessibility checks (axe) to fail on missing alt text and other violations on every template.
76. As a Site owner, I want the Seed to target WCAG 2.2 AA, so that PA Sites comfortably meet their WCAG 2.1 AA legal minimum.
77. As a Visitor using assistive technology, I want repeated layout parts (header, footer, Menus, breadcrumb, cookie banner) marked so they don't pollute Site search results.

### Search

78. As a Visitor, I want to search the whole Site by free text, so that I find content without knowing the structure.
79. As a developer, I want Site search behind an adapter, with DatoCMS Site Search implemented first, so that Algolia can be added later.
80. As a developer, I want each search adapter to declare whether it runs on the server or in the browser, so that secrets stay on the server and browser-side providers take the load off the application.
81. As a developer, I want each search adapter to declare whether it can narrow results by Routable model, so that the UI shows that control only when it works.
82. As a Site owner, I want the DatoCMS search token never to reach the browser.
83. As a Site owner, I want server-side search results never cached and the search Path disallowed for third-party crawlers, so that bots can't flood the cache or the search quota.
84. As a Visitor, I want a friendly message instead of an error page when the search provider is rate-limiting.
85. As an Editor, I want Site search to include content that is `noindex` for search engines, because internal search covers the whole Site.
86. As a developer, I want to mark extra areas of a Site as excluded from the Site search index.
87. As a Visitor, I want to explore one Routable model's records (e.g. artworks) through filters specific to that model, with the filters in the URL, so that I can bookmark and share a search.
88. As a developer, I want each model's Archive search filters (field, control type, Label) declared in Site config, with Archive search behind its own adapter (Content Delivery API filters first, Algolia later).
89. As a Visitor, I want the unfiltered Archive search page served statically and filtered results rendered on the server with a short cache, so that results are fast and indexable when the SEO settings allow it.

### Contact form

90. As a Visitor, I want a contact form with name, email, subject, message and a mandatory privacy consent linking to the privacy notice, so that I can write to the organisation.
91. As a Visitor, I want the form to work without JavaScript and show accessible error messages.
92. As an Editor, I want to choose the recipient address in Site settings.
93. As a recipient, I want the Visitor's address in Reply-To, so that I can answer directly.
94. As a Site owner, I want no confirmation copy sent to the Visitor, so that the form can't be abused as an email relay.
95. As a Site owner, I want messages sent but never stored, so that the Site holds no personal data.
96. As a Visitor, I want a clear error when the message can't be sent, and the failure logged.
97. As a Site owner, I want an always-on honeypot field and a minimum fill time, so that spam is blocked even without a captcha or consent.
98. As a developer, I want a captcha behind an adapter, with reCAPTCHA implemented and loaded only after consent, so that each Site can choose an accessible, privacy-friendly alternative.
99. As a developer, I want email delivery behind an adapter, using SMTP credentials from environment variables.

### Consent, Labels, monitoring and performance

100. As a Visitor, I want third-party scripts to load only after I accept their cookie category.
101. As a developer, I want a consent adapter exposing the accepted categories, so that each Site plugs in its own tool (Iubenda, a ministry banner…).
102. As a Visitor, I want interface text (Labels) in my language.
103. As a developer, I want Labels in per-locale files in the Seed, extendable and overridable per Site.
104. As a Visitor, I want default-locale Labels when my locale's file is missing, with the page language unchanged and a warning logged.
105. As a developer, I want failed webhooks, cache fallbacks, unimplemented Blocks, missing alt text and missing Labels logged through a logging adapter, to Netlify logs by default and pluggable (e.g. Sentry).
106. As a developer, I want Lighthouse CI on each pull request's deploy preview with budgets (LCP < 2.5 s, CLS < 0.1, TBT < 200 ms, a client JavaScript size cap), tunable per Site, so that performance regressions are caught before merging.
107. As a Site owner, I want real-user Core Web Vitals collected without cookies or personal data.
108. As a developer, I want design rules built into the Core (priority hero image with declared sizes, local fonts, deferred third-party scripts, minimal Client Components), so that fast pages are the default.

### Schema and Site creation

109. As a developer, I want the Seed to ship a small reference schema (Site settings, Page, Routing rule, Redirect, Menu, the Core Blocks) with versioned migrations, so that a new Site's DatoCMS project is set up reproducibly.
110. As a developer, I want every Routable model to have a localized, Editor-editable slug.
111. As a developer, I want to create a Site by copying the Seed and keeping my code outside the Core, so that I can later swap the Core folder for a shared package.

## Implementation Decisions

### Structure

- The Core lives in its own folder with a public interface. Site code (design, custom models and Blocks, Site config, concrete adapters) only uses that interface, so the Core can become an npm package without rewrites.
- No plugin or module system. The Core is open by construction:
  - the resolver accepts new Routable models
  - the Block catalog accepts new Blocks
  - every external service sits behind an adapter

  A module system will be extracted when the Commerce Seed brings a real second use case.
- **Site config** is a typed object in the Site's code, read by the Core. It holds the developer-owned choices:
  - invalidation mode and index store
  - Routable model order for collisions
  - models excluded from indexing
  - Archive search filters per model
  - Block CSS prefix
  - robots.txt code rules
  - Lighthouse budgets
  - adapter implementations (Site search, Archive search, captcha, email delivery, consent, logging)
  - per-model metadata fallbacks and JSON-LD mappings
  - llms.txt Markdown opt-in

### Content client (the single DatoCMS boundary)

- Every read from DatoCMS goes through one Core content client. It covers:
  - Content Delivery API queries typed with gql.tada, with a fragment per component
  - the Site Search API, using a CMA search token on the server only
- The client decides between published and draft content from Next.js draft mode. Draft requests bypass the cache.
- In `granular` mode the client tags each fetch and records the cache tags DatoCMS returns.
- This client is the only part of the Core that tests replace with a fake.

### Routing (ADR-0001)

- One `[locale]/[[...slug]]` catch-all route. A resolver turns (locale, segments) into one of: a record to render (by `__typename`), a redirect, or not found.
- **Path builder**: one module that computes Paths for:
  - Pages, from the native hierarchical sorting
  - other Routable models, from their localized prefix plus slug, as set in their Routing rule

  The resolver, links, sitemap, hreflang, preview links, breadcrumbs and llms.txt all use it.
- Resolution order:
  1. manual Redirects
  2. Home page Path → 301 to the locale root
  3. pagination suffix (localized word from Labels)
  4. Pages
  5. other Routable models, in the Site config order (first match wins)
  6. not found
- Locales come from `_site.locales`; the first is the default. `/` → 302 to a matching browser language, else to the default locale.
- A missing translation gives a 404 and excludes the record from sitemap and hreflang.
- The Main page is used for breadcrumbs and BreadcrumbList, never for the Path.

### Cache and invalidation (ADR-0002)

- Fetches use `force-cache`. Each one carries a global tag and, in `granular` mode, a query-ID tag. Tags stay within `[a-z0-9:_.-]`.
- Invalidation is stale-while-revalidate.
- **Index store adapter.** The interface:
  - records "DatoCMS cache tag → query ID" (insert only)
  - looks up the query IDs for a set of tags
  - wipes everything

  Turso/libSQL is the only implementation.
- **Webhook handler** for DatoCMS `cda_cache_tags`:
  - verifies the request
  - in `global` mode, revalidates the global tag
  - in `granular` mode, revalidates the matching query IDs
  - if the lookup fails or matches more than a threshold, falls back to the global tag
  - schedules a delayed second CDN purge
  - logs failures
- Full revalidation plus index wipe on code deploy, deploy rollback and DatoCMS environment promotion.
- Deploy context → DatoCMS environment mapping: production → primary, previews → sandbox, with a separate index per environment.

### Rendering

- Public pages are static and server-rendered. Client Components are used only for interactive parts and receive their data from the server. No indexable content is loaded in the browser; the declared exceptions are Algolia and other `noindex` content.
- **Block renderer**: maps a Block's model `api_key` to a component from the catalog. Core and Site Blocks are registered the same way.
  - Each Block gets a wrapper with:
    - `class="<prefix> <prefix>--<kebab-type>"`
    - one `<prefix>--<kebab-type>--<variant>` class per Editor-chosen variant
    - `data-block-type="<api_key>"`
    - `data-block-id="<record id>"`
  - The default prefix is `dato-block`. Menus use the same scheme (`dato-menu`, `dato-menu--<zone>`).
  - An unknown type renders nothing in production and a visible placeholder in draft mode, and is logged.
- **Structured Text renderer**: handles all 14 node types and 6 marks, plus embedded Blocks and inline records/links through the Block renderer and the Path builder. Text nodes get no classes.
- Images use react-datocms `<Image>`. Every image-using Block has a "decorative" boolean:
  - decorative → `alt=""`
  - not decorative and alt missing → `alt=""` plus a log entry in production, and a visible warning in draft mode
- The Video Block holds either a Mux upload (react-datocms video player) or an external video field. External video renders a preview with a "load video" button until the consent adapter reports the needed category, and uses `youtube-nocookie` for YouTube.
- Unknown Blocks, missing alt text and missing Labels go through the logging adapter.

### Schema (Seed models, versioned migrations, reference DatoCMS test project)

- **Site settings** (singleton):
  - Home page (link to Page)
  - 404 Page
  - one Menu link per Menu zone (header, footer, top, mobile)
  - contact form recipient
  - privacy notice link
  - extra robots.txt rules (free text)
  - AI crawler policy (allow all / block training crawlers / block all)
  - social links
- **Page**: title, localized slug, tree position, native SEO field, "also exclude sub-pages" flag, "exclude from llms.txt only" flag, page-builder field.
- **Routing rule**: model, Main page, localized prefix.
- **Redirect**: source Path, target (record or URL), permanent or temporary.
- **Menu**: title and nested item Blocks, at most three levels:
  - internal link (any Routable model)
  - external link
  - group
  - automatic sub-pages of a Page
- **Core Blocks**, per `block-coverage.md`: rich text, image, gallery, video, call to action (with buttons), text and image, FAQ, Listing, Site search, Archive search, contact form, content grid, logo.
- Every Routable model has a localized, Editor-editable slug and a native SEO field.

### SEO and indexing

- **Metadata builder**:
  - starts from `_seoMetaTags`, with per-model fallback fields from Site config, plus favicons
  - adds canonical, hreflang (existing translations only), `og:image:alt` and `article:modified_time`
  - meta robots comes from the exclusion rule
- **Exclusion rule**: one function decides whether a record is excluded. It considers:
  - the record's `noindex`
  - an ancestor Page with "also exclude sub-pages"
  - the model's exclusion in Site config

  An excluded record gets `noindex` and is left out of the sitemap and of llms.txt. "Exclude from llms.txt only" affects llms.txt alone.
- **Sitemap**: an index plus one sitemap per Routable model, split at 50,000 URLs, with `lastmod` from `_updatedAt`. No hreflang, no paginated pages, no filtered combinations.
- **robots.txt generator**. Inputs: deploy context, Site config rules, Site settings free text, AI crawler policy. Output: the file plus the list of dropped lines.
  - In production it emits, in this order:
    1. Seed defaults (including disallowing the Site search Path)
    2. Site rules
    3. the AI crawler policy group
    4. the Editor's text
  - Only lines that block DatoCMS's search crawler ("DatoCmsSearchBot") or are syntactically invalid are dropped and logged.
  - Outside production it disallows everyone except DatoCMS's crawler.
- **Non-production**: every response gets `X-Robots-Tag: noindex`. The context comes from Netlify and is not configurable.
- **Listing and Archive search pages**: inherit the hosting Page's indexing setting.
  - Later pages are self-canonical.
  - Filtered combinations have their canonical on the unfiltered page.
  - Site search with `?q=` is always `noindex`.
- **Structured data**: the Core emits WebSite, Organization and BreadcrumbList. Per-model JSON-LD mappings come from Site config.
- **llms.txt**: an index of non-excluded records. Per-page Markdown versions are opt-in per Site.
- The Core marks header, footer, Menus, breadcrumb and cookie banner with `data-datocms-noindex`.

### Search

- **Site search adapter**: input is query, locale, page and an optional model filter. Output is results (title, Path, excerpt), total and pagination. The adapter also declares:
  - `runs: server | browser`
  - `canNarrowByModel`
- The **DatoCMS Site Search** implementation:
  - runs on the server and reports `canNarrowByModel: false`
  - is never cached
  - maps a rate-limit response to a friendly message, not a 500
- The browser-mode path (for Algolia later) exists in the interface but has no implementation yet.
- **Archive search adapter**: input is model, filters from the URL, order and page. Output is records and total. The first implementation uses Content Delivery API filters. Filters per model (field, control type, Label) come from Site config.
  - The unfiltered page is static.
  - Filtered requests are dynamic with a short cache.

### Contact form

- A Server Action with progressive enhancement: it works without JS and returns accessible field errors.
- Validation runs on the server, in this order:
  1. honeypot
  2. minimum fill time
  3. captcha adapter, if the Site has one and consent allows it
  4. fields
- **Captcha adapter**: browser widget plus server verification. reCAPTCHA is implemented and loads only after consent; without consent, the baseline alone applies.
- **Email delivery adapter**: SMTP is implemented, with credentials from environment variables.
  - The recipient comes from Site settings.
  - The Visitor's email goes in Reply-To, not as sender.
  - No copy goes to the Visitor and nothing is stored.
  - Failure shows a clear error and is logged.

### Consent, Labels, logging, performance

- **Consent adapter**: exposes the accepted cookie categories and change events. The Core loads third-party scripts and embeds only for accepted categories. Concrete tools live in the Site.
- **Labels**: one file per locale in the Seed, merged with Site overrides. A missing locale falls back to the default locale and logs a warning. The page `lang` stays the content's locale.
- **Logging adapter**: events with severity and context. The default writes to Netlify logs; a Site can plug in Sentry or similar.
- **Performance**:
  - Lighthouse CI in GitHub Actions against each PR's deploy preview, on sample templates (home, Page, record, Listing), with Seed default budgets that Sites can override.
  - Real-user metrics via `web-vitals`, sent without cookies to a Site endpoint (logging adapter or analytics).
  - `next/font`, a priority hero image with declared sizes, deferred third-party scripts.

## Testing Decisions

- **Good tests check external behaviour only**: what a Visitor, Editor, crawler or calling Site code can observe (HTTP responses, HTML, headers, generated files, adapter calls at the boundary). They don't check internal functions or component structure, so they survive refactors.
- **Seam 1, the Site over HTTP (primary).** Playwright runs against a real build connected to the DatoCMS test project, both locally and on the Netlify deploy preview. It covers:
  - status codes and redirects (`/` 302, Home page 301, manual Redirects, 404, 500)
  - rendered HTML: Block hooks, alt text, `data-datocms-noindex`
  - `<head>`: canonical, hreflang, meta robots, JSON-LD
  - `X-Robots-Tag` outside production
  - robots.txt, sitemap, llms.txt
  - draft mode
  - the contact form without JS
  - external video consent gating

  axe runs on every template.
- **Seam 2, the Core's public interface in-process.** Vitest, with the **content client as the only fake**: it returns fixture DatoCMS responses. Next.js cache and draft-mode calls are recorded, not reimplemented. Covered cases:
  - resolver and Path builder: Page tree depth, Routing rules, empty prefix, collisions, missing translations, pagination, Home page
  - metadata builder and exclusion rule
  - robots.txt generator: dropped lines, AI policy, deploy contexts
  - sitemap splitting
  - webhook handler: global and granular modes, fallback, delayed purge
  - Block renderer and Structured Text renderer, including the coverage test that every native node, mark and field type renders
  - Labels fallback
  - contact form validation order
- **Seam 3, adapter contract tests.** One shared suite per adapter interface (index store, Site search, Archive search, captcha, email delivery, consent, logging), run against every implementation:
  - Turso on a local libSQL file
  - an in-memory fake, which seams 1 and 2 reuse
  - SMTP against a local test server
- **Performance gate**: Lighthouse CI budgets on the deploy preview. This is a gate, not a functional test.
- All suites run in GitHub Actions on every PR.
- **Prior art**: none in this repo; the codebase is empty. The DatoCMS Next.js Starter Kit is the structural reference, not a testing one.

## Out of Scope

- Automatic redirects on Path change. Only manual Redirects are in scope.
- A Path collision check on publish in DatoCMS. The resolver's fixed model order is used instead.
- Visual Editing / Content Link.
- A Netlify Database index store. Only Turso is in scope.
- A Label dictionary in DatoCMS. Labels stay in files.
- Algolia adapters for Site search and Archive search. The interfaces include browser mode and narrowing by model, but no implementation.
- Forms beyond contact (newsletter, bookings).
- Front-end users (registration, login, profile editing, recovery). The Core must be able to host them later.
- E-commerce. It is expected as a separate Commerce Seed extending the Core.
- A plugin or module system.
- RSS feeds; events and calendars (per Site).
- Blocks marked "not planned" in `block-coverage.md`: Statistic, Testimonial, Social proof, Newsletter signup, Exit-intent popup, Marketing starter Blocks.
- Anything Site-specific to Capodimonte:
  - Designers Italia tokens and UI kit
  - concrete consent tool and analytics (e.g. WAI)
  - the ALTCHA captcha adapter
  - Museum/Event JSON-LD mappings
  - Archive search filters for artworks
  - custom models

## Further Notes

- Capodimonte will run in `granular` mode with Turso. Proposed Site-level captcha: ALTCHA, with Friendly Captcha as the paid EU alternative.
- Client questionnaire answers (`to-questionnaire-capodimonte-vincoli-pa.md`, still to be sent; its deadline placeholder needs filling) may reopen the UI-kit choice. That choice is Site-level and doesn't affect the Core.
- To verify on the DatoCMS test project: whether the CDA exposes `_site { noIndex }`. No decision depends on it.
- Assumption made while writing this spec: the privacy notice link used by the contact form is a Site settings field. Adjust if Capodimonte uses a centralised ministry notice.
- DatoCMS Site Search facts that shaped the decisions are in `docs/research/datocms-site-search.md`:
  - its crawler doesn't run JavaScript
  - it ignores meta `noindex` but honours robots.txt and `data-datocms-noindex`
  - it has no model filter
  - it is rate-limited to 60 requests per 3 seconds
