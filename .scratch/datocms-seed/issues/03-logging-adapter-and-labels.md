# 03: Logging adapter and Labels

**What to build:** Interface text (Labels) appears in the Visitor's language, and the Core reports significant events to developers.

Labels:
- live in per-locale files in the Seed
- can be extended or overridden by the Site
- fall back to the default locale, with a logged warning, when a locale file or key is missing

Logging goes through a logging adapter. The default implementation writes to Netlify logs.

See `spec.md` (Consent, Labels, logging, performance).

**Blocked by:** 01 (Walking skeleton)

**Status:** resolved

- [x] The logging adapter interface accepts events with severity and context. The default implementation writes to Netlify logs, and the Site can swap it via Site config.
- [x] An in-memory fake logger exists. One shared contract suite runs against both implementations.
- [x] Labels are resolved per locale from Seed files merged with Site overrides; a Site override wins.
- [x] A missing locale file or key falls back to the default locale and logs a warning. The page `lang` stays the content's locale.
- [x] Vitest covers override, fallback and the logged warning.

## Answer

Implemented on `develop`. The logging adapter is `Logger` (`log({ severity, message, context })`); `createNetlifyLogger` writes one JSON line per event to the server console, which Netlify collects, and `SiteConfig.logger` replaces it. `createMemoryLogger` (in `@/core/testing`) is the fake; `tests/core/logger-contract.test.ts` runs the same suite against both. Loggers never throw: an unserializable context is replaced.

Labels live in `src/core/labels/seed/<locale>.ts`, merged with `SiteConfig.labels` (a Site override wins, and can add keys); the Site reads them with `core.labelsFor(locale)`. Decisions taken while implementing:
- each missing locale or Label is logged once per server process, not on every request;
- a Label missing in the default locale too shows its key and logs an error;
- a locale the Site doesn't offer (a 404 anyway) gets default-locale Labels without a warning, so bots don't flood the logs.

The first Label in use is the "skip to content" link in the layout; `lang` stays the content's locale. The test project has only `it` and `en`, both with Seed files, so the fallback with `lang` kept is covered by Vitest only. `labelsFor` queries the Site's locales on every call until caching lands (ticket 08). Vitest (28) and Playwright (9) pass on 2026-10-06.
