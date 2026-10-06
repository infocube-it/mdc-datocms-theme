# mdc-datocms-theme

The DatoCMS **Seed**: a Next.js 16 App Router codebase from which every Site is created. See `CONTEXT.md` for the vocabulary and `docs/adr/` for the main decisions.

To start a new Site from the Seed, follow [`docs/new-site.md`](docs/new-site.md).

## Layout

- `src/core/`: the **Core**, everything about DatoCMS. Its public interface is `src/core/index.ts` (and `src/core/testing/` for tests). Site code never imports other files from this folder; `tests/core/public-interface.test.ts` enforces it.
- `src/site/`: the Site's own code, starting with its **Site config** (`src/site/config.ts`).
- `src/app/`: Next.js routes. Every Path goes through the single `[locale]/[[...slug]]` route (ADR-0001).
- `migrations/`: versioned DatoCMS schema migrations.
- `tests/core/`: Vitest against the Core's public interface, with a fake content client.
- `tests/e2e/`: Playwright with axe against a production build connected to the DatoCMS test project.

## Development

Node tooling runs only in Docker (see `AGENTS.md`). Copy `.env.local.example` to `.env.local` and fill in the DatoCMS test project tokens, then:

```sh
docker compose run --rm app npm install
docker compose run --rm app npm run migrations:run -- --destination=<new-sandbox>  # or --in-place --source=<env>
docker compose run --rm app npm run generate-schema   # refresh schema.graphql and the gql.tada types
docker compose up app                                 # dev server on http://localhost:3000/it
docker compose run --rm app npm run typecheck
docker compose run --rm app npm test
docker compose run --rm app npm run build && docker compose run --rm playwright
```

## Deploy

Netlify builds with `netlify.toml`. Set `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN` in the Netlify site's environment variables; with no environment header, the deploy reads the DatoCMS primary environment. GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, Vitest and Playwright on every PR and needs the same token as a repository secret.
