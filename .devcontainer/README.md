# Dev Container

One container for the whole dev runtime: Node, Next.js, Vitest, Playwright with its browsers, and Claude Code. Inside it Claude Code runs without permission prompts (`bypassPermissions`). That is safe only when the container can't reach the host, so the setup below closes what it can and the person closes the rest on the host.

## What the container can reach on the host

- **The repository, read-write**, except the files that something on the host runs or trusts. These are mounted read-only: `.devcontainer/`, `compose.yaml`, `.git/config`, `.git/hooks/`, `.claude/` (except `.claude/.cc-writes/`), `.vscode/` and `.idea/`. To change one of them, edit it on the host.
- **This project's Claude memory folder, read-write**, so memory is shared with Claude Code on the host.
- **`~/.claude/devcontainer.env`**, as environment variables.
- **The internet, but not the host or the local network.** `init-firewall.sh` blocks private addresses at every start, except DNS to the configured resolver.
- **The sockets VS Code forwards into every Dev Container.** No setting turns them off, so their keys must be protected on the host (see below):
  - the host's SSH agent, in `/tmp/vscode-ssh-auth-*.sock`;
  - the host's GPG agent;
  - the host's X11 display.

The container gets no Docker socket and no other host folders. The remote user can't become root: `sudo` only runs `init-firewall.sh`. `git commit` works in the container; `git push` works only from the host.

## First start

1. On the host, create a long-lived Claude Code token (needs a Claude subscription):

   ```sh
   claude setup-token
   ```

2. Create `~/.claude/devcontainer.env` from the sample, readable only by you. It lives outside the repository: never commit it or paste the token into chats. `host-init.sh` creates it on the first start if it's missing.

   ```sh
   install -m 600 .devcontainer/devcontainer.env.example ~/.claude/devcontainer.env
   ```

   Fill in `CLAUDE_CODE_OAUTH_TOKEN` with the token, and uncomment the `GIT_AUTHOR_*` and `GIT_COMMITTER_*` lines with your name and email. Without them, `git commit` fails in the container, where `.git/config` is read-only and `~/.gitconfig` isn't copied.

3. Add these to your **user** settings in VS Code on the host (**Preferences: Open User Settings (JSON)**). They must not live in the repository, where the container could change them.

   ```jsonc
   {
     // Don't copy ~/.gitconfig, or its credential helpers, into containers.
     "dev.containers.copyGitConfig": false,
     // Don't give containers your git HTTPS credentials.
     "dev.containers.gitCredentialHelperConfigLocation": "none",
     // Don't give containers your Docker registry logins.
     "dev.containers.dockerCredentialHelper": false,
     // Don't mount your Wayland display.
     "dev.containers.mountWaylandSocket": false
   }
   ```

4. Protect the keys that the forwarded sockets expose:
   - **SSH**: load your keys with confirmation, so every use asks you on the host: `ssh-add -c ~/.ssh/<key>`. Refuse any request you didn't start. If your desktop loads keys automatically, remove them first with `ssh-add -D`, then add them again with `-c`.
   - **GPG**: if you sign commits, keep a passphrase on the key and a short cache in `~/.gnupg/gpg-agent.conf` (`default-cache-ttl 60`).
   - **X11**: prefer a Wayland session on the host, where the container only sees apps running through XWayland.

5. In `.env.local`, use DatoCMS tokens that can't harm production. The container reads the file:
   - `DATOCMS_CMA_TOKEN`: a token with the sandbox-only role described in `docs/new-site.md` (step 2): sandbox environments only, no token management, no promotion, and a record rule for each sandbox the agent works in. Promote a sandbox to primary from the DatoCMS dashboard.
   - `DRAFT_MODE_SECRET`: a different value from the one in Netlify.
   - Production tokens stay in Netlify and GitHub only.

6. Open the repository in VS Code and run **Dev Containers: Reopen in Container**. To change the token or the git identity later, edit `~/.claude/devcontainer.env` and run **Dev Containers: Rebuild Container**.

If the Claude Code panel still asks you to log in, log in once from it: the login is kept in a Docker volume and survives rebuilds.

## Daily use

Run project commands directly in the container's terminal: `npm install`, `npm run dev`, `npm test`, `npm run build && npm run test:e2e`. VS Code forwards port 3000 to the host.

Before pushing from the host, read the diff of the files that run with secrets outside your machine: `.github/`, `netlify.toml` and the `scripts` in `package.json`. Also read changes to `AGENTS.md` and `.agents/skills/`, which steer Claude Code on the host. After a change to `.devcontainer/`, read it before **Rebuild Container**: `host-init.sh` runs on the host.

When you bump `@playwright/test`, update the image tag in `.devcontainer/Dockerfile` to the same version and rebuild the container.
