#!/usr/bin/env bash
# docker/scripts/ci_full.sh
#
# Full local quality gate — mirrors the GitHub Actions quality-gates.yml job.
#
# Host:
#   If npm is unavailable, automatically delegates to Docker so Linux
#   platform packages never contaminate the checkout.
#
#   bash docker/scripts/ci_full.sh
#
# Inside Docker CI container (Linux):
#   Runs all checks natively.
#
#   docker compose -f docker/docker-compose.yml --profile ci run --rm ci
#
# Called automatically by .githooks/pre-push (git push).
# For fast format+lint only, see docker/scripts/ci_part.sh.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo /app)"

is_ci_container() {
  [[ "${KANA_CI_CONTAINER:-0}" == "1" || -f "/.dockerenv" ]]
}

delegate_to_docker() {
  echo ""
  echo "==> ci_full: npm not found on host; delegating to Docker CI container"
  echo "    (prevents Linux platform packages from contaminating host checkout)"
  echo ""
  cd "$ROOT"
  exec env MSYS_NO_PATHCONV=1 docker compose -f docker/docker-compose.yml --profile ci run --rm -w /app ci bash /app/docker/scripts/ci_full.sh
}

if ! is_ci_container; then
  if [[ "${KANA_FORCE_DOCKER_CI:-0}" == "1" ]]; then
    delegate_to_docker
  fi

  if ! command -v npm >/dev/null 2>&1; then
    if ! command -v docker >/dev/null 2>&1; then
      echo "ci_full: npm not found and docker is not available."
      exit 1
    fi
    delegate_to_docker
  fi
fi

cd "$ROOT"

echo ""
echo "==> ci_full: full quality gate"
echo ""

echo "[1/6] format check..."
npm run format -- --check

echo "[2/6] lint check..."
npm run lint:check

echo "[3/6] typecheck..."
npm run typecheck

echo "[4/6] LOC limits (AGENTS.md §11.5)..."
FAIL=0
while IFS= read -r -d '' f; do
  lines=$(wc -l < "$f")
  if (( lines > 300 )); then
    echo "  FAIL: $f has $lines lines (limit 300)"
    FAIL=1
  fi
done < <(find client server/src -name '*.ts' -o -name '*.tsx' | tr '\n' '\0')
while IFS= read -r -d '' f; do
  lines=$(wc -l < "$f")
  if (( lines > 200 )); then
    echo "  FAIL: $f has $lines lines (server service limit 200)"
    FAIL=1
  fi
done < <(find server/src/services -name '*.ts' | tr '\n' '\0')
while IFS= read -r -d '' f; do
  lines=$(wc -l < "$f")
  if (( lines > 100 )); then
    echo "  FAIL: $f has $lines lines (route handler limit 100)"
    FAIL=1
  fi
done < <(find server/src/routes -name '*.ts' ! -name 'types.ts' ! -name 'index.ts' | tr '\n' '\0')
if (( FAIL )); then
  echo "LOC check failed. See AGENTS.md §11.5."
  exit 1
fi

echo "[5/6] install deps and run client tests..."
npm ci
npm run test:run

echo "[6/6] install server deps and run server tests..."
cd "$ROOT/server"
npm ci
npm run test
cd "$ROOT"

echo ""
echo "==> ci_full: build..."
npm run build

echo ""
echo "==> ci_full: all checks passed."
echo ""
