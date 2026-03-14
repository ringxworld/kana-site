#!/usr/bin/env bash
# docker/scripts/ci_part.sh
#
# Fast partial quality gate — format and lint only (no tests, no build).
# Completes in seconds; safe to run on every commit.
#
# Host:
#   If npm is unavailable, automatically delegates to Docker so Linux
#   platform packages never contaminate the checkout.
#
#   bash docker/scripts/ci_part.sh
#
# Inside Docker CI container (Linux):
#   Runs checks natively.
#
#   docker compose -f docker/docker-compose.yml --profile ci run --rm ci bash docker/scripts/ci_part.sh
#
# Called automatically by .githooks/pre-commit (git commit).
# For the full gate including tests, see docker/scripts/ci_full.sh.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo /app)"

is_ci_container() {
  [[ "${KANA_CI_CONTAINER:-0}" == "1" || -f "/.dockerenv" ]]
}

delegate_to_docker() {
  echo ""
  echo "==> ci_part: npm not found on host; delegating to Docker CI container"
  echo "    (prevents Linux platform packages from contaminating host checkout)"
  echo ""
  cd "$ROOT"
  exec env MSYS_NO_PATHCONV=1 docker compose -f docker/docker-compose.yml --profile ci run --rm -w /app ci bash /app/docker/scripts/ci_part.sh
}

if ! is_ci_container; then
  if [[ "${KANA_FORCE_DOCKER_CI:-0}" == "1" ]]; then
    delegate_to_docker
  fi

  if ! command -v npm >/dev/null 2>&1; then
    if ! command -v docker >/dev/null 2>&1; then
      echo "ci_part: npm not found and docker is not available."
      exit 1
    fi
    delegate_to_docker
  fi
fi

cd "$ROOT"

echo ""
echo "==> ci_part: format + lint check"
echo ""

echo "[ts] format check..."
npm run format -- --check

echo "[ts] lint check..."
npm run lint:check

echo "[ts] typecheck..."
npm run typecheck

echo ""
echo "==> ci_part: all format + lint checks passed."
echo ""
