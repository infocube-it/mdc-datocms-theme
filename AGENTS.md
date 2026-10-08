## Development environment

Node, npm, Next.js and Playwright never run on the host. There are two ways to run them:

- **In the Dev Container** (`.devcontainer/`, the environment variable `DEVCONTAINER` is `true`): the agent runs inside it too, and runs `npm`, `npx` and `node` directly, e.g. `npm install`, `npm run dev`, `npm run test:e2e`. `git push` doesn't work there: the person pushes from the host. The files the host runs or trusts are read-only there (list in `.devcontainer/README.md`): to change one, write the new version in the scratchpad and ask the person to apply it from the host.
- **On the host**, through `compose.yaml`. Never run `npm`, `npx` or `node` directly on the host. Examples:
  - `docker compose run --rm app npm install`
  - `docker compose up app` (dev server on http://localhost:3000)
  - `docker compose run --rm playwright`

The manuals write commands in the `docker compose` form; in the Dev Container drop the `docker compose run --rm app` prefix, and run `npm run test:e2e` for `docker compose run --rm playwright`.

When you bump `@playwright/test`, update the Playwright image tag to the same version in `compose.yaml`, `.devcontainer/Dockerfile` and `.github/workflows/ci.yml`.

## New Sites

`docs/new-site.md` is the manual for starting a Site from the Seed. When asked to set up a new Site, follow it step by step and stop at every **[human]** step. When a change adds a setup step (a token, secret, environment variable, webhook, external service or DatoCMS setting), update the manual in the same change.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
