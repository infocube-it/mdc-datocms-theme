#!/usr/bin/env bash
# Runs on the host before the Dev Container starts (initializeCommand).
set -euo pipefail

# Claude Code login token, passed to the container with --env-file. Created
# empty on the first run; fill it in as .devcontainer/README.md explains.
env_file="$HOME/.claude/devcontainer.env"
if [ ! -f "$env_file" ]; then
  mkdir -p "$(dirname "$env_file")"
  printf 'CLAUDE_CODE_OAUTH_TOKEN=\n' > "$env_file"
  chmod 600 "$env_file"
  echo "Created $env_file: paste the token from 'claude setup-token' into it." >&2
fi

# Claude Code keeps a project's memory under ~/.claude/projects/<slug>/memory,
# where <slug> is the project path with every other character replaced by '-'.
slug=$(pwd | sed 's/[^a-zA-Z0-9]/-/g')
memory="$HOME/.claude/projects/$slug/memory"
mkdir -p "$memory"
ln -sfn "$memory" .devcontainer/.claude-memory

# Sources of the read-only mounts in devcontainer.json: a missing one stops
# the container from starting.
mkdir -p .claude/.cc-writes .vscode .idea
