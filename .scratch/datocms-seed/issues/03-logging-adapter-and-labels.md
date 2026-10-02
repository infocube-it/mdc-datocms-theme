# 03: Logging adapter and Labels

**What to build:** Interface text (Labels) appears in the Visitor's language, and the Core reports significant events to developers.

Labels:
- live in per-locale files in the Seed
- can be extended or overridden by the Site
- fall back to the default locale, with a logged warning, when a locale file or key is missing

Logging goes through a logging adapter. The default implementation writes to Netlify logs.

See `spec.md` (Consent, Labels, logging, performance).

**Blocked by:** 01 (Walking skeleton)

**Status:** ready-for-agent

- [ ] The logging adapter interface accepts events with severity and context. The default implementation writes to Netlify logs, and the Site can swap it via Site config.
- [ ] An in-memory fake logger exists. One shared contract suite runs against both implementations.
- [ ] Labels are resolved per locale from Seed files merged with Site overrides; a Site override wins.
- [ ] A missing locale file or key falls back to the default locale and logs a warning. The page `lang` stays the content's locale.
- [ ] Vitest covers override, fallback and the logged warning.
