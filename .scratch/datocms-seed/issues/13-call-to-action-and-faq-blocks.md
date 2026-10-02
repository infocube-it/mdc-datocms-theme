# 13: Call to action and FAQ Blocks

**What to build:** Editors can add a Call to action, with buttons linking to any Routable model or an external URL, and an FAQ Block. Visitors get accessible markup for both.

See `spec.md` (Schema; Blocks stories) and `block-coverage.md`.

**Blocked by:** 10 (Block renderer and Structured Text)

**Status:** ready-for-agent

- [ ] Call to action Block with nested buttons (internal or external links). Internal links use the Path builder. Buttons are not a standalone Block.
- [ ] FAQ Block whose questions and answers are server-rendered and readable without JS.
- [ ] Both Blocks have migrations and the `dato-block` wrapper.
- [ ] Playwright with axe covers both Blocks.
- [ ] `block-coverage.md` is updated.
