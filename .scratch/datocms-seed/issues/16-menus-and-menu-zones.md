# 16: Menus and Menu zones

**What to build:** Editors build Menus independently of the Page tree and assign one to each Menu zone (header, footer, top, mobile) in Site settings. The same Menu can fill several zones.

Menu items can be:
- a link to any Routable model
- an external link
- a group
- an automatic list of a Page's sub-pages

Menus have at most three levels.

Repeated layout parts are marked with `data-datocms-noindex`: header, footer, Menus, breadcrumb and the cookie banner slot.

See `spec.md` (Navigation, Schema, Block markup).

**Blocked by:** 05 (Routing rules and breadcrumbs), 03 (Logging adapter and Labels)

**Status:** ready-for-agent

- [ ] A migration adds the Menu model with nested item Blocks, plus one Menu link per zone in Site settings.
- [ ] Depth is limited to 3.
- [ ] Internal links use the Path builder. Automatic sub-pages follow the Page tree in the current locale.
- [ ] Zones render with `dato-menu dato-menu--<zone>` classes and the Site prefix setting.
- [ ] Sites can add a zone with a new Site settings field and a layout slot, without changing the Core.
- [ ] Header, footer, Menus, breadcrumb and the cookie banner slot carry `data-datocms-noindex`.
- [ ] Playwright with axe covers keyboard navigation of a three-level Menu.
