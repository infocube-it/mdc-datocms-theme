# 20: robots.txt and non-production guards

**What to build:** The Core generates robots.txt from three sources:
- code rules (Seed defaults plus Site rules)
- the AI crawler policy (allow all / block training crawlers / block all, default allow all)
- a free-text field in Site settings, appended last

Lines that would block DatoCMS's search crawler, or are syntactically invalid, are dropped and logged. Blocking the whole Site is allowed on purpose.

Outside production, robots.txt disallows every crawler except DatoCMS's, and every response carries `X-Robots-Tag: noindex`.

See `spec.md` (SEO and indexing).

**Blocked by:** 01 (Walking skeleton), 03 (Logging adapter and Labels)

**Status:** ready-for-agent

- [ ] A migration adds the extra robots.txt rules and the AI crawler policy to Site settings.
- [ ] In production, the output order is: Seed defaults, Site config rules, AI crawler policy group, Editor text.
- [ ] Only lines blocking "DatoCmsSearchBot" or with invalid syntax are dropped, and each is logged. `Disallow: /` for everyone else is kept.
- [ ] The AI crawler policy never blocks DatoCMS's search crawler.
- [ ] Non-production deploy contexts, detected from Netlify and not configurable, get:
  - robots.txt that disallows everyone except DatoCMS's crawler
  - `X-Robots-Tag: noindex` on every response
- [ ] Vitest covers the generator for each context and each policy, plus the dropped lines.
- [ ] `docs/new-site.md` covers every setup step this ticket adds (tokens, secrets, environment variables, webhooks, external services, DatoCMS settings), or this ticket adds none.
