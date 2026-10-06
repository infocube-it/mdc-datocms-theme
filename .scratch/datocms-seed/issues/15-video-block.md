# 15: Video Block

**What to build:** Editors add a video either as an upload (Mux) or as a YouTube/Vimeo link.

For external videos, Visitors see a preview with a "load video" button until they accept the related category. After that, the video loads, through `youtube-nocookie` for YouTube.

See `spec.md` (Rendering; Blocks stories).

**Blocked by:** 11 (Image Block and alt text), 14 (Consent adapter)

**Status:** ready-for-agent

- [ ] Video Block migration with an upload field and an external video field.
- [ ] An uploaded video renders with the react-datocms video player.
- [ ] Before consent, an external video renders a preview image (with alt rules) and a "load video" button with a Label. No third-party request is made.
- [ ] After consent, the external embed loads. YouTube uses `youtube-nocookie`.
- [ ] Playwright checks there are no third-party requests before consent. axe passes on both states.
- [ ] `block-coverage.md` is updated.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
