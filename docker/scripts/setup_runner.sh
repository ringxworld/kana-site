#!/usr/bin/env bash
# docker/scripts/setup_runner.sh
#
# Generates a GitHub Actions runner registration token and starts the
# self-hosted runner container. Run this before opening PRs.
#
# Requires the repo owner account (shikarii) to be available in gh CLI.
# One-time setup: gh auth login  (add shikarii without removing other accounts)
#
# Usage:
#   bash docker/scripts/setup_runner.sh
#
# Stop when done coding:
#   docker compose -f docker/docker-compose.yml --profile ci stop runner

set -euo pipefail

REPO="shikarii/kana-site"
OWNER="shikarii"
GH_BIN=""

ensure_gh_cli() {
  if command -v gh &>/dev/null; then
    GH_BIN="$(command -v gh)"
    return 0
  fi
  if command -v gh.exe &>/dev/null; then
    GH_BIN="$(command -v gh.exe)"
    return 0
  fi

  for candidate in \
    "/c/Program Files/GitHub CLI/gh.exe" \
    "/mnt/c/Program Files/GitHub CLI/gh.exe" \
    "/c/ProgramData/chocolatey/bin/gh.exe" \
    "/mnt/c/ProgramData/chocolatey/bin/gh.exe"; do
    if [ -x "$candidate" ]; then
      GH_BIN="$candidate"
      return 0
    fi
  done

  return 1
}

if ! ensure_gh_cli; then
  echo "ERROR: gh CLI not found. Install from https://cli.github.com"
  exit 1
fi

CURRENT_USER="$("$GH_BIN" api user --jq '.login' 2>/dev/null || echo '')"
SWITCHED=0

generate_token() {
  "$GH_BIN" api -X POST "repos/${REPO}/actions/runners/registration-token" --jq '.token' 2>/dev/null
}

TOKEN="$(generate_token || true)"

if [ -z "$TOKEN" ]; then
  if "$GH_BIN" auth status -u "$OWNER" &>/dev/null 2>&1; then
    echo "Switching to ${OWNER} for token generation..."
    "$GH_BIN" auth switch -u "$OWNER"
    SWITCHED=1
    TOKEN="$(generate_token || true)"
  fi
fi

if [ -z "$TOKEN" ]; then
  echo ""
  echo "ERROR: Could not generate runner registration token."
  echo "  The owner account '${OWNER}' needs to be added to gh CLI."
  echo ""
  echo "Run once to add the owner account:"
  echo "  gh auth login"
  echo "  (choose github.com, then log in as ${OWNER})"
  echo ""
  echo "Alternatively, get a token from the GitHub UI and pass it directly:"
  echo "  https://github.com/${REPO}/settings/actions/runners/new"
  echo "  RUNNER_TOKEN=<token> docker compose -f docker/docker-compose.yml --profile ci up -d runner"
  exit 1
fi

if [ "$SWITCHED" -eq 1 ] && [ -n "$CURRENT_USER" ]; then
  "$GH_BIN" auth switch -u "$CURRENT_USER"
fi

export RUNNER_TOKEN="$TOKEN"

echo "Starting self-hosted runner..."
docker compose -f docker/docker-compose.yml --profile ci up -d runner

echo ""
echo "Runner started. It will appear at:"
echo "  https://github.com/${REPO}/settings/actions/runners"
echo ""
echo "PRs will now trigger quality-gates.yml on this runner (zero billing)."
echo "Stop when done: docker compose -f docker/docker-compose.yml --profile ci stop runner"
