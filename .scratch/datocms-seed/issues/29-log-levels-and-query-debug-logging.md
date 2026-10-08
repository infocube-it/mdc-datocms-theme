# 29: Log levels and debug logging of DatoCMS queries

**What to build:** A developer can switch on detailed logs while investigating a problem, and keep production logs quiet the rest of the time.

The logging adapter accepts every severity (`debug`, `info`, `warning`, `error`), but nothing filters them and nothing logs at `debug` yet. This ticket adds a minimum level and uses `debug` to show what the Site asks DatoCMS and when the cache is invalidated.

What the Core can and can't see about the cache:
- When the Netlify CDN or Next.js serves a cached page, no Site code runs and no query is sent. A query in the log therefore means the page was (re)generated.
- When Next.js answers a single `force-cache` fetch from its data cache, the Content client gets no signal, so the Core can't log cache hits. Next.js's `logging.fetches` shows hits and misses in `next dev` only.
- Invalidation is fully visible to the Core: the webhook received, the tag revalidated, the flush after a deploy.

See `spec.md` (Consent, Labels, logging, performance) and ticket 08.

**Blocked by:** 03 (Logging adapter and Labels), 08 (Global cache invalidation and deploy contexts)

**Status:** ready-for-agent

- [ ] An environment variable (e.g. `LOG_LEVEL`) sets the minimum severity written by the default logger. Unset means `info`, so `debug` events stay out of production logs. An unknown value falls back to `info` and logs a warning once.
- [ ] The level applies to the default logger only. A Site logger set in Site config gets every event and filters on its own.
- [ ] Each Content client query logs a `debug` event with the GraphQL operation name, the variables, the DatoCMS environment, whether draft mode is on, the duration and the response size. A failed query logs the same data at `error`.
- [ ] Responses aren't logged in full. If a developer needs them, a separate opt-in variable (e.g. `LOG_DATOCMS_RESPONSES`) adds the response body to the `debug` event. Without it, nothing is added.
- [ ] Tokens and secrets never appear in log events.
- [ ] The cache webhook and the flush endpoint log at `debug` when they accept a request: which endpoint, which tag was revalidated and, for the DatoCMS webhook, how many cache tags it reported.
- [ ] `next.config.ts` enables `logging.fetches` so `next dev` shows fetch cache hits and misses.
- [ ] Vitest covers the level threshold, the default, an unknown value, the query `debug` event with and without response bodies, and the invalidation `debug` events.
- [ ] `docs/new-site.md` and `.env.local.example` document the new variables: how to turn on `debug` locally and on Netlify, and that it should be turned off again.
