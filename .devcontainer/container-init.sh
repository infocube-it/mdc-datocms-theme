#!/usr/bin/env bash
# Runs in the container on every start (postStartCommand).
set -euo pipefail

# Point this project's Claude memory at the host's, mounted on /mnt/claude-memory.
# The workspace has the host's path, so the slug matches the host's.
slug=$(pwd | sed 's/[^a-zA-Z0-9]/-/g')
mkdir -p "$HOME/.claude/projects/$slug"
ln -sfn /mnt/claude-memory "$HOME/.claude/projects/$slug/memory"

# Inside the container Claude Code works without permission prompts. This lives
# in the container's user settings, never in the repo, so the host keeps asking.
settings="$HOME/.claude/settings.json"
[ -f "$settings" ] || cat > "$settings" <<'JSON'
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
JSON

# Skip the first-run onboarding: login comes from CLAUDE_CODE_OAUTH_TOKEN.
[ -f "$HOME/.claude.json" ] || echo '{"hasCompletedOnboarding": true}' > "$HOME/.claude.json"
