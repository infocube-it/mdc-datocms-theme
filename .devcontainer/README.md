# Devcontainer

All development, including AI agents such as Claude Code, runs inside this container, not on the host. The container is a sandbox: it limits what a command can reach on your machine and on the network.

## What the sandbox allows

- **Files**: only this repository, mounted at `/workspace`. Your home directory, SSH keys and other projects are not visible.
- **User**: `node`, without root. Its only `sudo` right is to run `init-firewall.sh`.
- **Network**: denied by default. Outbound traffic only reaches GitHub, npm, DatoCMS, Netlify, Playwright downloads, Anthropic and VS Code services (see `ALLOWED_DOMAINS` in `init-firewall.sh`). The Docker host and IPv6 are blocked.
- **Docker**: the Docker socket is not mounted, so nothing inside can start containers or reach the host through Docker.

## Usage

1. In VS Code, run **Dev Containers: Reopen in Container**.
2. On first start, sign in to Claude Code again: its configuration lives in a container volume, separate from the host's `~/.claude`.
3. Put DatoCMS and Netlify tokens in `.env.local`, which is git-ignored. Use test-project tokens with minimal permissions: anything inside the sandbox can read them.

If an allowlisted domain stops working (its CDN IPs rotated), re-run `sudo /usr/local/bin/init-firewall.sh`.

## Keeping the sandbox closed

- Review every change to `.devcontainer/` before rebuilding. The firewall script and the image are built from these files, so an edit made inside the sandbox only takes effect after you rebuild.
- Never add the Docker socket, `--privileged`, or host directories beyond the workspace to `compose.yaml`.
- VS Code forwards your host git credential helper into the container by default, so `git push` works from inside. To block that, set `"dev.containers.gitCredentialHelperConfigLocation": "none"` in your VS Code user settings.
- To allow a new domain, add it to `ALLOWED_DOMAINS` and rebuild.
