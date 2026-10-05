## Development environment

Agents run on the host, but Node, npm, Next.js and Playwright run only in Docker, through `compose.yaml`. Never run `npm`, `npx` or `node` directly on the host. Examples:

- `docker compose run --rm app npm install`
- `docker compose up app` (dev server on http://localhost:3000)
- `docker compose run --rm playwright`

When you bump `@playwright/test`, update the `playwright` image tag in `compose.yaml` to the same version.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
