# Dev Container

One container for the whole dev runtime: Node, Next.js, Vitest, Playwright with its browsers, and Claude Code. Inside it Claude Code runs without permission prompts (`bypassPermissions`), because the worst it can reach is the container.

What the container can reach on the host:

- the repository, read-write (git is the safety net);
- this project's Claude memory folder, read-write, so memory is shared with Claude Code on the host;
- `~/.claude/devcontainer.env`, as environment variables.

It gets no Docker socket, no SSH agent and no other host folders. `git commit` works in the container; `git push` works only from the host.

## First start

1. On the host, create a long-lived Claude Code token (needs a Claude subscription):

   ```sh
   claude setup-token
   ```

2. Save it in `~/.claude/devcontainer.env`, readable only by you. Never commit the token or paste it into chats.

   ```sh
   printf 'CLAUDE_CODE_OAUTH_TOKEN=%s\n' '<token>' > ~/.claude/devcontainer.env
   chmod 600 ~/.claude/devcontainer.env
   ```

3. Open the repository in VS Code and run **Dev Containers: Reopen in Container**. To change the token later, edit the file and run **Dev Containers: Rebuild Container**.

If the Claude Code panel still asks you to log in, log in once from it: the login is kept in a Docker volume and survives rebuilds.

## Daily use

Run project commands directly in the container's terminal: `npm install`, `npm run dev`, `npm test`, `npm run build && npm run test:e2e`. VS Code forwards port 3000 to the host.

When you bump `@playwright/test`, update the image tag in `.devcontainer/Dockerfile` to the same version and rebuild the container.
