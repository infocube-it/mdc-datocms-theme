#!/usr/bin/env bash
# Runs on the host before the Dev Container starts (initializeCommand).
set -euo pipefail

# Claude Code login token and git identity, passed to the container with
# --env-file. Created from the sample on the first run, outside the repository;
# fill it in as .devcontainer/README.md explains.
env_file="$HOME/.claude/devcontainer.env"
if [ ! -f "$env_file" ]; then
  mkdir -p "$(dirname "$env_file")"
  install -m 600 .devcontainer/devcontainer.env.example "$env_file"
  echo "Created $env_file: fill in the token and your git identity." >&2
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
