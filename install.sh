#!/usr/bin/env bash
# ABOUTME: One-command installer for claude-kit: adds the marketplace, installs plugins, renders workflows.
# ABOUTME: Usage: curl -fsSL https://raw.githubusercontent.com/JNK234/claude-kit/main/install.sh | bash [-s -- plugin ...]
set -euo pipefail

REPO="JNK234/claude-kit"
KIT="${CLAUDE_KIT_DIR:-$HOME/.claude-kit}"
ENV_FILE="$HOME/.claude/claude-kit.env"
ALL_PLUGINS=(writing research-vault explainer-videos netlogo dev-tools life)
PLUGINS=("${@:-${ALL_PLUGINS[@]}}")

command -v claude >/dev/null || { echo "claude CLI not found. Install Claude Code first."; exit 1; }

# 1. Local clone (workflows read skill files from here)
if [ -d "$KIT/.git" ]; then git -C "$KIT" pull --ff-only -q; else git clone -q "https://github.com/$REPO.git" "$KIT"; fi

# 2. Marketplace + plugins
claude plugin marketplace add "$REPO" >/dev/null 2>&1 || claude plugin marketplace update claude-kit >/dev/null
for p in "${PLUGINS[@]}"; do
  claude plugin install "$p@claude-kit" && echo "installed $p"
done

# 3. Paths config (edit later in $ENV_FILE)
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<CONF
# Paths used by claude-kit skills and workflows. Edit, then re-run install.sh.
VAULT="$HOME/Obsidian/Brain"
ZK_DIR="$HOME/Developer/zettelkasten-auto"
CONF
  echo "wrote $ENV_FILE  (edit VAULT / ZK_DIR if you use the research-vault plugin)"
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

# 4. Workflows: render path tokens into ~/.claude/workflows (never overwrites unless FORCE=1)
mkdir -p "$HOME/.claude/workflows"
for f in "$KIT"/workflows/*.js; do
  dest="$HOME/.claude/workflows/$(basename "$f")"
  if [ -e "$dest" ] && [ "${FORCE:-0}" != 1 ]; then echo "skip $(basename "$f") (exists; FORCE=1 to overwrite)"; continue; fi
  sed -e "s#__VAULT__#$VAULT#g" -e "s#__ZK_DIR__#$ZK_DIR#g" -e "s#__KIT__#$KIT#g" "$f" > "$dest"
done

echo
echo "Done. Skills that use \$VAULT / \$ZK_DIR read them from your shell env."
echo "Add them to ~/.claude/settings.json under \"env\" so Claude Code sees them:"
echo "  \"env\": { \"VAULT\": \"$VAULT\", \"ZK_DIR\": \"$ZK_DIR\" }"
echo "Restart Claude Code to load the plugins."
