# DatoCMS "base blocks": what is native, what starters ship

Research date: 2026-10-01. Primary sources only: DatoCMS docs (`datocms.com/docs/*.md`), DatoCMS marketplace pages, recipe JSON exports from `datocms-assets.com`, and source code of DatoCMS repos cloned at these commits:

| Tag | Repo @ commit (date) | Marketplace name | Template project |
|---|---|---|---|
| [SK] | `datocms/nextjs-starter-kit@4abee90` (2026-09-24) | "Next.js Starter Kit" | `datocmsProjectId: 186629` |
| [LP] | `datocms/next-landing-page-demo@efe7242` (2026-09-03) | "Marketing Website" | `105705` |
| [EC] | `datocms/ecommerce-website-demo@5166109` (2026-09-03) | "Ecommerce Website" | `107337` |
| [CT] | `datocms/nextjs-with-cache-tags-starter@3a461d8` (2026-03-09) | not listed on marketplace | n/a |
| [WEB] | `datocms/astro-website@2a8f886` (2026-09-18) | none: this is the datocms.com site itself | n/a |
| [ST] | `datocms/structured-text@97fc3da` | | |
| [RD] | `datocms/react-datocms@759b5b4` (v8.1.2) | | |

The Nuxt, SvelteKit and Astro Starter Kits point at the same template project as [SK] (`datocmsProjectId: 186629` in each repo's `datocms.json`), so they share its schema.

The marketplace starters page lists exactly six official starters: astro-starter-kit, ecommerce-website, marketing-website, next-js-starter-kit, nuxt-starter-kit, sveltekit-starter-kit (<https://www.datocms.com/marketplace/starters>).

---

## Short answers

| # | Question | Answer |
|---|---|---|
| 1a | Does DatoCMS define built-in or canonical blocks natively in the product? | **Not found.** Every block is a user-defined block model, which is an `item_type` with `modular_block: true`. The "Blocks Library" is only the sidebar/settings section that lists the project's own block models. |
| 1b | Is there any official ready-made block set? | **Confirmed: Schema Recipes.** These are six importable JSON schema exports in the marketplace, curated by DatoCMS. They are not native: importing a recipe creates normal, editable models and blocks. They are the closest thing to an official "base block set". |
| 1c | Can plugins provide blocks? | **Not found.** Plugins can add custom marks and paragraph/heading styles to Structured Text, and custom field editors. They cannot define block models. Recipes can bundle plugins (e.g. Conditional Fields). |
| 2 | What blocks do the starters ship? | **Confirmed**, see §2. [SK] has 3 blocks (image, gallery, uploaded video), all in Structured Text. [LP] has about 26 blocks: 15 page sections in Modular Content, 4 in Structured Text, plus nested/menu blocks. [EC] has about 21. |
| 3 | Which native content must a renderer handle? | **Confirmed**, see §3. DAST has 14 node types. 6 default marks plus plugin custom marks/styles. 20 field types. react-datocms gives ready renderers for Structured Text, responsive images, Mux video, SEO tags and site search. There is **no** ready renderer for the external `video` field, `lat_lon`, `color`, `json`, or `text` (markdown/HTML). |
| 4 | What does our draft catalog miss? | See §4. The block types that appear across most official sources and are absent from our catalog are: **Statistic/Stats, Testimonial / Social proof (reviews), Hero, Logo/Brand reel, Feature list/grid, Button (as a reusable nested block), Newsletter signup, Content grid**. Others are minor or domain-specific. |

---

## 1. Native vs shipped

### Facts

- **Blocks are user-defined.** The docs say blocks "allow you to define complex and repeatable structures that can be embedded inside records". They are managed in "the 'Blocks Library' section". They "do not exist independently, but only within a parent record". No predefined blocks are mentioned. <https://www.datocms.com/docs/content-modelling/blocks>
- **Blocks Library is a UI section, not a catalog.** It was announced 2021-03-04: "A new Blocks Library section is now visible on the sidebar, giving you an overview of all the blocks your project has defined." <https://www.datocms.com/product-updates/blocks-library-and-schema-editing-improvements>
- **Schema Recipes** are "a curated selection of ready-to-use models and blocks that you can import into your projects". The blog post (2025-07-14) adds: "if you're just starting out, the Recipes are a solid base layer". <https://www.datocms.com/blog/schema-import-exports-and-recipes>
  - The six recipes are: Blog Post, Case Study, Global Settings, Marketing Exit Intent (Pop Up), Marketing Landing Page, Newsletter Signup. <https://www.datocms.com/marketplace/recipes>
  - Import goes through the dashboard's `/configuration/recipes/import?recipe_url=…`. The JSON uses the official **Schema Import/Export** plugin format (`version: "2"`, `entities: [plugin | item_type | field | fieldset]`). The plugin says: "This is an Official DatoCMS Plugin!" and "Imports are additive: new models/blocks/fields/fieldsets/plugins are created with fresh IDs". <https://www.datocms.com/marketplace/plugins/i/datocms-plugin-schema-import-export>
- **What plugins can change in Structured Text.** Plugins can customize Structured Text only through `customBlockStylesForStructuredTextField`, which writes `style` on paragraph/heading nodes, and `customMarksForStructuredTextField`, which writes extra strings into `marks`. The DAST node set is fixed. <https://www.datocms.com/docs/plugin-sdk/structured-text-customizations>

### Recipe block inventory (from the recipe JSON files)

Recipe JSON URLs follow the pattern `https://www.datocms-assets.com/205/<id>-recipes-<name>.json`. The IDs are 1742283606 (blog-post), 1742283734 (case-study), 1742283660 (landing-page), 1742283557 (settings), 1742283821 (popup) and 1742283786 (newsletter). They are linked from each recipe page.

| Block (api_key) | Fields | Used in |
|---|---|---|
| `image` | image: file | ST blocks, inline blocks (BP, CS); MC (LP) |
| `media_gallery` | gallery: gallery | ST (BP, CS); MC (LP) |
| `video` | video: file (DatoCMS/Mux-hosted, not the external `video` field) | ST (BP, CS); MC (LP) |
| `cta` | title: string, description: ST, button: single_block[button] | ST (BP, CS); MC (LP) |
| `button` | label, is_internal_link: boolean, external_url: string, internal_link: links, button_style: string (uses the Conditional Fields plugin) | ST block and inline (BP); inline (CS); MC `buttons` (LP); single_block in cta/popup |
| `faq` | question: ST, answer: ST (the page copy says "string fields", but the JSON has structured_text) | ST (BP, CS); MC (LP) |
| `statistic` | stat: string, description: string | ST (BP, CS); inline (CS); MC (LP, and CS `statistics`) |
| `testimonial` | quote: ST, person: link → Person model | ST (BP, CS); MC (LP) |
| `social_proof` | testimonials: MC[testimonial] | ST (BP); MC (LP) |
| `content_block` "Text & Image (2-Column)" | image: file, content: ST | ST (CS); MC (LP) |
| `content_grid` | label: string, content_blocks: MC[content_block] | MC (LP) |
| `logo` | logo: file, title: string | MC inside the `logo_reel` model (LP) |
| `social_link` | platform: string, url: string | inline (BP, CS); MC on person/author/admin |
| `menu_dropdown` | label, pages: MC[menu_item] | MC on the `admin` singleton (Global Settings) |
| `menu_item` | label, page: link | as above |

Key: BP = Blog Post, CS = Case Study, LP = Landing Page recipe, ST = Structured Text, MC = Modular Content (`rich_text`).

Some recipe items are models, not blocks: `popup`, `newsletter_signup`, `logo_reel`, `person`, `author`, `tag`, `category`, and `admin` (a singleton). The Landing Page links to `popup`, `newsletter_signup` and `logo_reel` through `link` fields.

---

## 2. Blocks in the official starters

### [SK] Next.js Starter Kit (also used by the Nuxt, SvelteKit and Astro kits)

Source: `src/lib/datocms/cma-types.ts`, `schema.graphql`, `src/components/blocks/*`.

- Only one model: `page` with title, slug, `structured_text`, `seo_settings_social: seo` and `seo_analysis: json`.
- `structured_text` allows these blocks: **ImageBlock** (`asset: file`), **ImageGalleryBlock** (`assets: gallery`) and **VideoBlock** (`asset: file`, rendered with `<VideoPlayer>` through Mux).
- Links go to `page`, rendered as `itemLink` / `inlineItem` by `components/linkToRecords/PageLink` and `components/inlineRecords/PageInline`. Inline blocks are not used (`inlineBlocks: [String]`).
- The project-wide `<Text>` wrapper adds custom rules for `code` (`components/Code`) and `heading` (`HeadingWithAnchorLink`).
- **There is no Modular Content in [SK].**

### [CT] Cache-tags starter

Source: `schema.graphql`. One block, `ImageBlockRecord { image: FileField }`, plus the models Author, Blog, Category and Post.

### [LP] Marketing Website (`next-landing-page-demo`)

Source: `graphql/types/graphql.ts`, `components/blocksWithVariants/*`, `skills/landing-page-demo-sections/SKILL.md`.

Blocks are told apart from models by checking which records have no `all*` root query.

**Modular Content `Page.sections`** (localized) has 15 section blocks. Most carry a `displayOptions` string that selects a visual variant:

| Block | Fields | Variants (`displayOptions` values) |
|---|---|---|
| HeroSection | heroTitle, heroSubtitle, heroImage: file, buttons: MC[Button{label, primary: bool, url}] | gradient, right_image, background_image, split_image, default |
| FeatureListSection | featuresHeader, featuresSubheader, feature: MC[Feature{featureTitle, featureDescription, featureIcon}] | card_minimal, grid, big_image_horizontal, big_image_vertical, default |
| BrandSection | brand: MC[Brand{brandName, brandLogo, brandUrl}] | brand_cards, default |
| VideoSection | videoHeader, videoSubheader, **video: VideoField (external YouTube/Vimeo)**, videoThumbnail | — |
| DetailSection | details: ST, image: file, imagePosition: boolean (this is text+image) | — |
| ReviewSection | header, subheader, reviews: links → Testimonial model | card_carrousel, modern_carrousel, minimal_carrousel, minimal_cards, default |
| PricingSection | header, subheader, plans: links → PricingTier model | cards_gradient, minimal, feature_list, mini_cards, default |
| FeaturedPostsSection | header, subheader, featuredPosts: links → Post | modern_cards, carrousel, carousel, minimalist_grid, full_image_card, default |
| TeamSection | title, subtitle, showcasedMembers: links → Author | compact, expanded |
| FaqSection | title, subtitle, questions: MC[Question{question: string, answer: ST with blocks CtaButtonWithImage / NewsletterSubscription}] | accordion, grid |
| StatsSection | title, subtitle, statistic: MC[Statistic{label, quantity: int, icon}] | — |
| AboutIntro | preHeader, header, subheader, introductionText: ST, images: gallery | — |
| AllPostsSection | no fields (a marker block that renders the paginated post list) | — |
| ChangelogSection | title, subtitle, featuredVersions: links → ChangeLog | — |
| RedirectSection | slugToRedirectTo: string (makes the page redirect) | — |

**Structured Text `Post.content`** allows these blocks:
- **ImageBlock** (`image`);
- **NewsletterSubscription** (title, subtitle, buttonLabel);
- **CtaButtonWithImage** (title, subtitle, buttonLabel, image);
- **AppCta** (title, text, appstoreUrl, googlePlayUrl).

Its links go to Post, rendered both as `itemLink` and `inlineItem`.

Other Structured Text fields in [LP] have no blocks: ChangeLog.content, LegalPage.content, DocumentationPage.content, Testimonial.review, PricingTier.tierDescription, AboutIntro.introductionText, DetailSection.details, and Layout.notification.

**Layout (singleton):** `menu` is MC[MenuItem{title, page: link} | MenuDropdown{title, items: MC[MenuItem]}] and `socialMediaLinks` is MC[SocialMediaIcon{name, icon, url}]. It also has `mainColor: color`.

### [EC] Ecommerce Website

Source: `graphql/types/graphql.ts`.

- **Modular Content `Home.sections`:**
  - HeroSection (heroTitle, heroSubtitle, heroImage, additionalImage, featuredCollections: links, socials: MC[SocialMediaIcon]);
  - CollectionCardShowcaseSection (pretitle, title, description, collection: links, button: MC[SimpleButton{label, slug}], direction);
  - DividerSection (preTitle, title, subtitle, button: MC[SimpleButton]), which is effectively a CTA band;
  - MaterialShowcaseSection (title, description, materials: links);
  - TestimonialSection (title, testimonial: MC[Testimonial{author, testimonial}]).
- **Structured Text `Product.description`:**
  - FeaturedQuestionsSection (questions: MC[ProductQuestion{question, answer: string}]), which is an FAQ;
  - ProductFeatureSection (material, occasions, style, weather).
- **Layout singleton:**
  - menu: MC[DropdownMenu{label, column: MC[DropdownColumn], newArrival, trending} | LinkItem{label, slug}];
  - footerColumns: MC[FooterColumn{label, footerItem: MC[FooterItem]}];
  - popup: single_block Popup;
  - cookieNotice: single_block CookieNotice;
  - socialMediaLinks.
- **Other blocks:** FilterDetail (a single_block on Brand/Collection/Material), FeaturedReview, ProductVariation (color: color, availableSizes: json).
- **Native types used:** `lat_lon` (Store.storeLocation, rendered as a Google Maps link) and `color`.

### [WEB] datocms.com (context only, not a starter)

- About 138 record types.
- Blocks allowed in `BlogPost.content` Structured Text: CodesandboxEmbed, CopyPromptButton, CtaButton, Demo, ImageCarousel, Image, InternalVideo (`VideoFileField`), MultipleDemos, QuestionAnswer, ShowcaseProject, **Table (`table: JsonField`)**, Tabs, TutorialVideo, **Video (external `VideoField`)**.
- Text fields there are queried as `field(markdown: true)` to get HTML.

---

## 3. Native content a renderer must handle

### Structured Text (DAST)

Sources: <https://www.datocms.com/docs/structured-text/dast>, [ST] `packages/utils/src/{types,definitions}.ts`.

| Node | Attributes | Allowed parent | Default renderer output ([ST] generic-html-renderer, used by `<StructuredText>`) |
|---|---|---|---|
| root | — | — | fragment |
| paragraph | `style?` (plugin) | root, listItem, blockquote | `<p>` (style ignored) |
| heading | `level` 1–6, `style?` | root | `<hN>` (style ignored) |
| list | `style` bulleted/numbered | root, listItem | `<ul>`/`<ol>` |
| listItem | — | list | `<li>` |
| blockquote | `attribution?` | root | `<blockquote>` + `<footer>` attribution |
| code | `code`, `language?`, `highlight?` (line numbers) | root | `<pre data-language><code>` (no syntax highlighting) |
| thematicBreak | — | root | `<hr>` |
| span | `value`, `marks?` | inline | `strong`/`code`/`em`/`u`/`s`/`mark`. A custom mark becomes a tag named after the mark unless `customMarkRules` is given |
| link | `url`, `meta?` [{id,value}] | inline | `<a href>` with meta passed through `metaTransformer` (e.g. target/rel) |
| itemLink | `item`, `meta?` | inline | **requires `renderLinkToRecord`** plus the `links` data |
| inlineItem | `item` | inline | **requires `renderInlineRecord`** plus `links` |
| block | `item` | **root only** | **requires `renderBlock`** plus `blocks` |
| inlineBlock | `item` | inline | **requires `renderInlineBlock`** plus `inlineBlocks` |

- The 6 default marks are `strong, code, emphasis, underline, strikethrough, highlight`. Plugins can add custom marks and paragraph/heading `style` values.
- `block` nodes cannot be nested in lists or blockquotes.

### Field types

Source: <https://www.datocms.com/docs/content-management-api/resources/field>. The GraphQL shapes come from the starter schemas.

| Field type | Delivered as | Ready renderer in react-datocms 8.1.2? |
|---|---|---|
| `structured_text` | `{ value, blocks, inlineBlocks, links }` | **Yes**: `<StructuredText>` plus `renderNodeRule` |
| `rich_text` (Modular Content) / `single_block` | union list / single union | No: needs a project `__typename` registry |
| `file` / `gallery` (images) | `FileField` → `responsiveImage{…}` | **Yes**: `<Image>` (client) and `<SRCImage>` (RSC) |
| `file` (uploaded video, Mux) | `FileField.video { muxPlaybackId, streamingUrl, mp4Url, thumbnailUrl, … }` | **Yes**: `<VideoPlayer>` / `useVideoPlayer` (Mux player; uses `muxPlaybackId` only) |
| `file` (other assets: PDF etc.) | `url`, `filename`, `mimeType`, `size` | No |
| `video` (external YouTube/Vimeo/Facebook) | `VideoField { provider, providerUid, url, thumbnailUrl, title, width, height }` | **No**: [LP] builds its own YouTube/Vimeo iframe (`components/VideoModal`) |
| `seo` | `SeoField`, plus the record's `_seoMetaTags` / `_site.faviconMetaTags` | **Yes**: `toNextMetadata`, `renderMetaTags`, `renderMetaTagsToString` (they work on `_seoMetaTags`, not on the raw `SeoField`) |
| `text` (editor: markdown / wysiwyg / textarea) | string; `field(markdown: true)` returns HTML | No: [LP]/[EC] depend on `react-markdown` |
| `lat_lon` | `LatLonField { latitude, longitude }` | No ([EC] links to Google Maps) |
| `color` | `ColorField { hex, cssRgb, red, green, blue, alpha }` | No (only a value) |
| `json` (plain, multi-select, checkbox group, or plugin editors such as a table) | `JsonField` | No |
| `link` / `links` | record(s) | No (URL builder is project code) |
| `string`, `slug`, `boolean`, `integer`, `float`, `date`, `date_time` | scalars | n/a |

Related renderer-side helpers in react-datocms: `useSiteSearch` (DatoCMS Site Search, a native feature and not a block), `useQuerySubscription` (real-time), `ContentLink` / `useContentLink` (visual editing), and `stripStega`.

---

## 4. Draft catalog vs official sources

Our draft catalog: rich text, image, gallery, embedded video, call to action, text+image, FAQ, Listing, Site search, Archive search, contact form.

### Already covered (mapping)

| Ours | Official equivalents |
|---|---|
| rich text | Structured Text field (native), not a block. [LP]/[EC] have no "rich text block". The recipes use ST fields inside blocks |
| image | SK ImageBlock, CT ImageBlock, LP ImageBlock, recipe `image` |
| gallery | SK ImageGalleryBlock, recipe `media_gallery`, LP AboutIntro.images |
| embedded video | ⚠️ Two different native sources exist. **Uploaded/Mux** (`file`): SK VideoBlock, recipe `video`. **External** (`video` field): LP VideoSection, WEB Video. Decide whether our block supports one or both |
| call to action | recipe `cta`, LP CtaButtonWithImage / AppCta, EC DividerSection |
| text+image | recipe `content_block`, LP DetailSection (with an `imagePosition` toggle) |
| FAQ | recipe `faq`, LP FaqSection + Question, EC FeaturedQuestionsSection + ProductQuestion |
| Listing | LP AllPostsSection (marker block) and FeaturedPostsSection (curated links), EC CollectionCardShowcase / MaterialShowcase |

### Official blocks not in our catalog

Ordered by how many official sources include them.

1. **Statistic / Stats**: recipes BP, CS, LP, and LP StatsSection.
2. **Testimonial / Social proof (reviews)**: recipes BP, CS, LP; LP ReviewSection; EC TestimonialSection.
3. **Button as a reusable nested block** (internal/external link, style): recipes BP, CS, LP, popup; LP Button; EC SimpleButton. It is used inside Hero, CTA and other blocks, and inline in ST.
4. **Hero**: LP HeroSection (5 variants), EC HeroSection, recipe LP (as page fields, not a block).
5. **Logo / Brand reel**: recipe LP `logo` + `logo_reel`, LP BrandSection.
6. **Feature list / grid**: LP FeatureListSection + Feature (5 variants).
7. **Newsletter signup**: recipe (as a model), LP NewsletterSubscription (ST block). It is a form-like block, related to our "contact form".
8. **Content grid** (a group of text+image blocks): recipe LP `content_grid`.
9. **Team**: LP TeamSection.
10. **Pricing**: LP PricingSection.
11. **Social link** (inline): recipes; LP/EC SocialMediaIcon (layout).
12. **Menu blocks** (MenuItem, MenuDropdown, footer columns): recipe Global Settings, LP, EC. These are navigation, not page body.
13. Popup / exit intent, cookie notice (EC single_block on Layout; recipe as a model).
14. Domain-specific or minor blocks: LP AppCta, ChangelogSection, RedirectSection, AboutIntro; EC DividerSection, ProductFeatureSection; WEB Table (JSON), Tabs, Code-embed.

### Ours, absent from all official sources

- **Site search**, **Archive search** and **contact form** have no official block.
- Site Search is a native DatoCMS feature with the `useSiteSearch` hook, but no starter models it as a block.
- The closest form in any starter is Newsletter (no backend in the starters).

### Inference (not stated by DatoCMS)

- There is no "complete set of DatoCMS base blocks" to cover. The realistic reference set is the **union of the six Schema Recipes and the [SK]/[LP] blocks**, because that is what DatoCMS itself calls "a solid base layer".
- Native **content shapes**, by contrast, are a closed and finite set: DAST nodes and field types. A "coverage tracker" can be exhaustive for those (§3), but only advisory for blocks (§4).
