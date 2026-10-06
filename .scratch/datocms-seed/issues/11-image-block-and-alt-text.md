# 11: Image Block and alt text

**What to build:** Editors place images with a "decorative" flag on the Block. Visitors get responsive, modern-format images whose alt text is correct for assistive technology. Editors are warned in draft mode when a meaningful image has no alt text.

See `spec.md` (Rendering; Images and accessibility stories).

**Blocked by:** 10 (Block renderer and Structured Text)

**Status:** ready-for-agent

- [ ] Image Block (migration and component) using react-datocms `<Image>`, with a "decorative" boolean.
- [ ] Decorative → `alt=""`.
- [ ] Not decorative with an alt text → that alt text, in the current locale.
- [ ] Not decorative with no alt text:
  - production renders `alt=""` and logs the event
  - draft mode shows a visible warning to the Editor
- [ ] The decorative/alt logic is shared, so every later image-using Block reuses it.
- [ ] axe fails on a test page with a missing, non-decorative alt.
- [ ] `block-coverage.md` is updated.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
