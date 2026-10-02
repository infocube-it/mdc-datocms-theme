## Development environment

Work inside the devcontainer (`.devcontainer/`), never on the host. `DEVCONTAINER=true` is set inside it. Outbound network is allowlisted: if a download fails, the domain is probably not in `.devcontainer/init-firewall.sh`. Ask the user to add it rather than working around the firewall.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
