# MDC DatoCMS Theme

A reusable seed for building multilingual, accessible websites with DatoCMS as the content backend. It hides DatoCMS behind a small set of conventions so UI work can start without re-solving content plumbing.

## Language

### Project

**Seed**:
The reusable starting codebase from which every Site is created.
_Avoid_: Theme, starter, template, boilerplate

**Site**:
A single client website created from a copy of the Seed, with its own DatoCMS project.
_Avoid_: Project, tenant, instance

**Core**:
The part of the Seed that deals with DatoCMS (fetching, caching, routing, SEO, Block rendering), kept apart from the UI so it can later become a shared package.
_Avoid_: Engine, lib, framework

### People

**Editor**:
A person who manages content in DatoCMS and always sees the latest drafts on the Site.
_Avoid_: Operator, author, redattore, user

**Visitor**:
A member of the public reading the published Site, who may briefly see a previous version of the content.
_Avoid_: User, reader

### Content

**Block**:
A reusable content unit placed inside a record's page-builder field, named as in DatoCMS.
_Avoid_: Widget, component, section

**Routable model**:
A DatoCMS model whose records each have their own URL on the Site.
_Avoid_: Page type, content type

**Page**:
The generic Routable model that Editors arrange in a tree to form the structure of the Site.
_Avoid_: Node, section

**Home page**:
The Page currently designated as the Site's root, served at each locale's root Path. Any Page can become the Home page, so Editors can prepare and swap alternatives (e.g. a Christmas home).
_Avoid_: Homepage model, index

**Main page**:
The Page that acts as the home of another Routable model's records, typically listing them, and stands as their parent in navigation and breadcrumbs.
_Avoid_: Landing page, index page, hub, pagina di raccordo

**Routing rule**:
The per-model setting, kept in DatoCMS, that names a Routable model's Main page and the localized prefix of its records' Paths.
_Avoid_: Route config, permalink pattern, model mapping

**Path**:
The localized URL of a record. A Page's Path follows the Page tree; other Routable models' Paths follow their Routing rule's prefix, or their Main page's Path when the prefix is empty.
_Avoid_: Permalink, route, URL slug

**Listing**:
A Block that shows records of one Routable model, with filters, order and pinned items fixed by the Editor.
_Avoid_: Archive, feed, collection block

**Site search**:
A Visitor's free-text search across the whole Site, optionally narrowed to some Routable models.
_Avoid_: Global search, full-text search

**Archive search**:
A Visitor's exploration of one Routable model's records through filters specific to that model, such as author, style and type for artworks.
_Avoid_: Catalog search, faceted listing, advanced search

**Label**:
A short piece of interface text that isn't content, such as "Send" or "Confirm", translated per locale.
_Avoid_: String, microcopy, dictionary entry

### Navigation

**Menu**:
An Editor-curated list of links, managed independently of the Page tree.
_Avoid_: Navigation, nav tree

**Menu zone**:
A place in the layout where a Menu is shown. The Seed defines header, footer, top and mobile; a Site may add more. The same Menu may fill several zones.
_Avoid_: Menu position, slot, area

### Configuration

**Site settings**:
The single DatoCMS record holding Site-wide choices, such as which Page is the Home page and which Menu fills each Menu zone.
_Avoid_: Global settings, config page, layout

**Site config**:
The developer-owned choices of a Site, kept in its code rather than in DatoCMS, such as which models are excluded from indexing and which filters each Archive search offers.
_Avoid_: Settings, options, env
