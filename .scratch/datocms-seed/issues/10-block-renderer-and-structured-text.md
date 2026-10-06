# 10: Block renderer and Structured Text

**What to build:** Editors fill a Page's page-builder field with Blocks and Structured Text, and Visitors see them rendered as clean semantic HTML. Developers get speaking hooks on every Block. Editors in draft mode see a visible placeholder for Block types the Site can't render yet.

The ticket ships:
- the Block catalog, where Core and Site Blocks register the same way
- the wrapper markup (`dato-block` prefix, configurable in Site config)
- the Structured Text renderer, covering every node and mark, with links to records through the Path builder
- the Rich text Block

See `spec.md` (Rendering; Block markup stories).

**Blocked by:** 04 (Draft mode), 05 (Routing rules and breadcrumbs), 03 (Logging adapter and Labels)

**Status:** ready-for-agent

- [ ] Every Block has a wrapper with:
  - `class="<prefix> <prefix>--<kebab-type>"`
  - one `<prefix>--<kebab-type>--<variant>` class per Editor-chosen variant
  - `data-block-type="<api_key>"`
  - `data-block-id="<record id>"`
- [ ] The default prefix is `dato-block`, and Site config can change it.
- [ ] A Site can register its own Block without changing the Core.
- [ ] An unknown Block type renders nothing in production and a visible "not implemented" placeholder in draft mode, and is logged.
- [ ] Structured Text renders all native node types and marks as semantic HTML without classes. Inline records and links use the Path builder; embedded Blocks use the Block renderer.
- [ ] A coverage test fails if any native Structured Text node, mark or field type has no renderer.
- [ ] Rich text Block (migration and component). `block-coverage.md` is updated.
- [ ] Playwright with axe covers a Page using Rich text.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
