# 19: llms.txt

**What to build:** AI assistants get an llms.txt index of the Site's non-excluded records. A record flagged "exclude from llms.txt only" stays indexable by search engines but is left out of llms.txt. Sites can opt in to per-page Markdown versions.

See `spec.md` (SEO and indexing).

**Blocked by:** 18 (Exclusion rule and sitemap)

**Status:** ready-for-agent

- [ ] llms.txt lists non-excluded records with their Paths from the Path builder.
- [ ] "Exclude from llms.txt only" removes a record from llms.txt and nowhere else.
- [ ] When the Site config opt-in is on, each listed record has a Markdown version.
- [ ] Vitest covers inclusion and exclusion. Playwright fetches llms.txt.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
