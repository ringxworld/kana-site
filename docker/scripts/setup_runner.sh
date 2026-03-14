#!/usr/bin/env bash
# docker/scripts/setup_runner.sh
#
# Starts self-hosted GitHub Actions runners for all shikarii repos.
# Each runner auto-registers using ACCESS_TOKEN — no stale tokens,
# no manual re-setup required after container restarts or recreations.
#
# Prerequisites (one-time):
#   1. Create a GitHub PAT at https://github.com/settings/tokens/new
#      Scopes needed:  repo  (or "public_repo" if all repos are public)
#   2. Add it to docker/.env (gitignored):
#        echo "GH_PAT=ghp_xxxx" >> docker/.env
#      (See docker/.env.example for a template.)
#
# To add a new repo: copy a runner block in docker/docker-compose.yml,
# set a unique RUNNER_NAME and REPO_URL, then re-run this script.
#
# Usage:
#   bash docker/scripts/setup_runner.sh
#
# Stop when done coding:
#   docker compose -f docker/docker-compose.yml --profile ci stop

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/../docker-compose.yml"
# docker/.env is in the project directory for docker-compose (next to the compose file).
ENV_FILE="${SCRIPT_DIR}/../.env"

# ── Verify GH_PAT is available ────────────────────────────────────────────────

if [ -z "${GH_PAT:-}" ]; then
  if [ -f "$ENV_FILE" ] && grep -q "^GH_PAT=" "$ENV_FILE"; then
    # shellcheck source=/dev/null
    set -o allexport
    source "$ENV_FILE"
    set +o allexport
  fi
fi

if [ -z "${GH_PAT:-}" ]; then
  echo ""
  echo "ERROR: GH_PAT is not set."
  echo ""
  echo "Create a GitHub Personal Access Token with 'repo' scope:"
  echo "  https://github.com/settings/tokens/new"
  echo ""
  echo "Then add it to docker/.env:"
  echo "  echo \"GH_PAT=ghp_xxxx\" >> docker/.env"
  echo ""
  echo "See docker/.env.example for a template."
  exit 1
fi

# ── Start all runners ─────────────────────────────────────────────────────────

echo "Starting self-hosted runners (one per repo)..."
docker compose -f "$COMPOSE_FILE" --profile ci up -d runner-kana runner-atitd

echo ""
echo "Runners started. They will appear at:"
echo "  https://github.com/shikarii/kana-site/settings/actions/runners"
echo "  https://github.com/shikarii/AtitdScripts/settings/actions/runners"
echo ""
echo "Any workflow using  runs-on: self-hosted  will route to this machine."
echo ""
echo "Stop when done: docker compose -f docker/docker-compose.yml --profile ci stop"
