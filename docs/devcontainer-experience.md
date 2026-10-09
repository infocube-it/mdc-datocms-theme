# An AI agent that works without asking, inside a container

Field notes, October 2026. How we let an AI coding agent (Claude Code) work on its own without giving it access to the laptop it runs on: what worked, what is still exposed, and how to reuse the idea on other projects.

For the step-by-step setup, see [`.devcontainer/README.md`](../.devcontainer/README.md).

## 1. Context

We are building a "Seed", a reusable base for Next.js sites with content on DatoCMS and hosting on Netlify. An AI agent writes much of the code: it reads the tickets, writes tests and code, runs `npm install`, tests, builds and headless browsers, and commits.

An agent like this is only useful if it can **run commands**. That is where the problem starts.

## 2. The problem

We had two ways of working, and neither was good enough.

**Agent on the host, confirming every command.** Safe, but slow. Every `npm test`, every `grep` and every file write waits for a click. After a few dozen confirmations people approve without reading, and the safety becomes a formality.

**Agent on the host, without confirmations.** Fast, but the agent gets the same powers as the developer:

- every file in the home folder, including SSH keys, cloud credentials and other projects;
- the office or home network: NAS, router, internal services;
- production tokens, if they sit in some file;
- `git push` to the shared repository.

We also had an existing rule: **Node and npm never run on the host**. `npm install` runs third-party scripts, and we don't want them to run as our user.

> **Goal:** the agent works without confirmations inside a perimeter where even the worst case does limited, recoverable damage. The worst case is an agent that makes a mistake, or a malicious npm package.

## 3. How we got there

It didn't work the first time. The steps, rebuilt from the git history:

| Date | Step | What happened |
|---|---|---|
| 2 Oct | First Dev Container, with a domain allowlist | Based on Anthropic's reference container: a non-root user, and outbound traffic only to a list of domains (GitHub, npm, DatoCMS, Netlify, Anthropic…). |
| 5 Oct | The agent's login doesn't get through the firewall | Adding domains to the list didn't help. We fell back to Docker Compose: the agent went back to the host and only Node and Playwright ran in containers. The confirmation problem remained. |
| 7 Oct | Second Dev Container, with token login | A long-lived token, passed as an environment variable, replaces the interactive login. The agent, Node, tests and browsers share one container. The agent's memory is shared with the host. |
| 8 Oct | Hardening | The firewall is turned around: the internet is open, the host and the local network are blocked. The host's "trusted" files are read-only, VS Code settings close unneeded sharing, and external tokens get minimal privileges. |

**Lesson:** a domain allowlist is the strictest option, but it is fragile. Every tool has undocumented domains, and the first block comes at login. Blocking what is close (the host and the local network) and leaving the internet open turned out to be a more sustainable trade-off.

## 4. The solution

A **Dev Container** (the [containers.dev](https://containers.dev) standard, supported by VS Code and JetBrains) holds the whole development environment: Node, Next.js, tests, Playwright with its browsers, and the agent. Inside the container the agent doesn't ask for confirmation; on the host it still does.

A few versioned files in the repository describe all of it: `devcontainer.json`, a `Dockerfile` and three bash scripts, about 300 lines in total.

### The boundary: what crosses from the host to the container

| Host resource | Status | How |
|---|---|---|
| The repository's code | read-write | A bind mount at the same path as on the host. The agent works here. |
| Files the host runs or trusts: container config, `compose.yaml`, `.git/config`, `.git/hooks`, agent and IDE settings | read-only | Read-only mounts layered on top. The agent can only propose changes, which the developer applies from the host. |
| The agent's memory for this project | read-write | One mounted folder, so the agent on the host and the one in the container share the same notes. |
| Login token and git identity | environment variables | A file outside the repository (`~/.claude/devcontainer.env`, mode 600). |
| The internet | open | Needed for npm, the services' APIs and the agent itself. |
| The host and the local network | blocked | `iptables` rejects private addresses (10/8, 172.16/12, 192.168/16, link-local…) on every start. Only DNS stays open. |
| Docker socket, other folders, `~/.gitconfig`, git and Docker credentials | not mounted | The VS Code user settings on the host turn off automatic sharing. |
| Root privileges | denied | The user isn't in the sudo group. It can run only the firewall script as root, so it can't turn the firewall off. |
| The host's SSH agent, GPG agent and X11 display | exposed | VS Code forwards them into every Dev Container, and no setting turns this off. See [Current limitations](#5-current-limitations). |

### Who does what

**The agent, in the container:**

- writes code, tests and documentation;
- runs install, tests, builds and end-to-end tests;
- runs `git commit`;
- reads the CI status with a read-only GitHub token.

**The developer, on the host:**

- runs `git push`, which doesn't work from the container;
- before pushing, rereads the files that run with secrets outside the laptop: CI workflows, deploy config, `package.json` scripts;
- applies changes to the read-only files;
- rereads `.devcontainer/` before rebuilding the container, because one script runs on the host.

### Least-privilege tokens

Anything the container can read, the agent can use. So:

- the CMS token can write only to sandbox environments, with no token management and no promotion to production;
- the GitHub token is fine-grained, limited to one repository and "Actions: read", and expires soon;
- production secrets stay on Netlify and GitHub and never reach the laptop.

### The alternative without a Dev Container

Developers who don't use VS Code work on the host with `docker compose run --rm app npm …`. It is the same environment, without an autonomous agent. The instructions file for agents (`AGENTS.md`) tells the agent how to recognize which of the two environments it is in, through the `DEVCONTAINER` variable.

## 5. Current limitations

- **The host's SSH keys are reachable** (open). VS Code forwards the SSH agent's socket, and today the keys are loaded without confirmation. A process in the container could therefore authenticate to any server those keys can reach. The fix exists (`ssh-add -c`, or starting VS Code without `SSH_AUTH_SOCK`), but we postponed it to avoid touching the desktop setup. For now the only protection is the rule that nobody uses that socket.
- **The internet is open, so data can leave** (by choice). The code, `.env.local` and the agent's token can all be sent out. The defence is that they are worth little: sandbox tokens, read-only access, short expirations.
- **Code the agent writes runs elsewhere with real secrets** (by choice). CI workflows, build scripts and the Netlify config run where the production tokens are. The container can't protect them: the only barrier is a human review before pushing.
- **File ownership across the two environments** (friction). Different containers can write files as different users. We once had a `node_modules` owned by root that blocked `npm install` in the container, and it had to be fixed by hand from the host. Everything works only if every environment uses UID 1000.
- **Tools that fail silently** (friction). The agent's VS Code extension ignored the "no confirmations" mode when two machine-level settings were missing, and it gave no error. We only noticed because the confirmation prompts kept coming.
- **No Docker inside the container** (constraint). Docker-in-Docker needs a privileged container, which would undo the isolation. A project that needs a database or other services in containers must run them next to the Dev Container, not inside it.
- **Tied to VS Code and a personal account** (constraint). The setup assumes VS Code with the Dev Containers extension and a personal agent token. Every team member repeats the first-time setup, which is six documented steps.

## 6. Possible improvements

- **Close the SSH socket:** load keys with confirmation, or start VS Code without the SSH agent. This is the first thing to do.
- **An allowlist through a proxy:** instead of `iptables` rules on IP addresses, an HTTP proxy that logs and filters domains. Start in log-only mode to find out which domains are really needed, then close it.
- **Push safeguards:** a hook on the host, or a CODEOWNERS rule that requires an explicit review of the sensitive files (CI, deploy, scripts), so the review doesn't depend on the memory of whoever pushes.
- **Services next to the container:** use the Dev Containers Compose mode to run databases and other services as separate containers, without giving Docker to the agent.
- **Remote containers:** GitHub Codespaces or a dedicated VM take the problem off the laptop. There are no SSH keys, local network or other projects left to protect.
- **A shared template:** extract the firewall, the read-only mounts and the start scripts into a template shared by every project, leaving each one only its image and tools.

## 7. Applicability

The pattern doesn't depend on Next.js or Claude Code. It works with any toolchain that runs on Linux and with any agent that runs commands in a terminal.

**It fits well with:**

- web and backend work: Node, Python, Java, .NET, Go, PHP;
- projects with automated tests the agent can run on its own;
- teams that already have, or want, a reproducible development environment.

**It fits less well with:**

- native macOS and iOS apps (Xcode), or Windows desktop apps;
- development that needs physical devices: USB, embedded, local GPUs;
- projects that orchestrate many containers (see "No Docker inside the container").

### Getting started on another project

1. Pick a base image with your toolchain and a non-root user with UID 1000.
2. List the repository files the host runs or trusts (git hooks, IDE config, CI, the container config) and mount them read-only.
3. Block the host and the local network at start, with `NET_ADMIN` and a script that only root can run.
4. Pass the login and the git identity from a file outside the repository. No Docker socket, no extra folders, no `~/.gitconfig`.
5. Make the tokens the container can see weak: read-only or sandbox-only, with a short expiration.
6. Keep `git push` on the host, and decide which files must always be reread before pushing.
7. Explain in the agent's instructions file how to work in the container: which commands to use, what is read-only, what to ask the developer.

> **In one sentence:** you give the agent autonomy inside a perimeter, and that perimeter is made of weak tokens and a push that stays with a person as much as of containers and firewalls.

## References in this repository

- [`.devcontainer/README.md`](../.devcontainer/README.md): step-by-step setup
- [`.devcontainer/devcontainer.json`](../.devcontainer/devcontainer.json)
- [`.devcontainer/init-firewall.sh`](../.devcontainer/init-firewall.sh)
- [`AGENTS.md`](../AGENTS.md)
