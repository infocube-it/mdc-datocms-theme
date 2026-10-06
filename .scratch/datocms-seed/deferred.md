# Deferred ideas

Ideas raised during design and deliberately left out of the first version of the Seed. Carry them into the spec's "Out of scope" section.

- **Automatic redirects on Path change.** When an Editor changes a slug, moves or renames a Page, or changes a Main page's prefix, generate 301 Redirects automatically, descendants included. Deferred because old Paths must be stored somewhere and redirect chains need handling. The first version ships a manual Redirect model only.
- **Path collision check on publish (DatoCMS side).** Detect two records of different models claiming the same Path and warn the Editor. The first version's resolver serves the first match in a fixed model order.
- **Visual Editing / Content Link.** Excluded: the user dislikes it and it adds weight; stega-encoded strings are a bug risk with CMS-driven Paths.
- **Netlify Database index-store adapter.** Only the Turso adapter is implemented now (ADR-0002).
- **Label dictionary in DatoCMS.** A DatoCMS model (key + localized value) so Editors can translate Labels. The first version keeps Labels in per-locale files in the Seed, extendable per Site.
- **Algolia adapter for Site search / Archive search.** The Core defines the search adapter interface; DatoCMS Site Search is the first Site search implementation. Algolia comes later as an adapter or a dedicated Block.

- **Forms beyond contact** (newsletter, bookings): out of the Core for now; usually external services linked or embedded.
- **Front-end users** (registration, login, profile editing, password recovery): the Core must be able to host them later; not addressed now because Capodimonte doesn't need them.
- **E-commerce**: likely a separate "Commerce" Seed built as an extension of the Core, not part of the Core itself.

## Change requests to review when this version is done

Raised while implementing the tickets. Review them once every ticket of this version is resolved: later tickets may make some of them obsolete.

- **Misleading URL preview on the Page slug field** (raised during ticket 02). The DatoCMS slug field shows a fixed "URL prefix" plus the slug (e.g. `https://example.com/mia-pagina`). It ignores the locale and the Page tree, so the URL shown is a 404: the real Path is `/it/pagina-parent/mia-pagina`. Possible fix: a migration that removes the URL prefix and adds a hint explaining how the Path is built. The preview links planned in the spec, built by the Path builder, may make this unnecessary.
