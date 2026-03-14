#!/usr/bin/env bash
# scripts/setup_hooks.sh
#
# One-time setup: registers .githooks/ as the git hooks directory.
# Run once after cloning or when hooks change:
#
#   bash scripts/setup_hooks.sh
#
# Hooks installed:
#   pre-commit  — fast format + lint + typecheck (ci_part.sh)
#   pre-push    — full quality gate including tests and build (ci_full.sh)
#
# Skip a single operation:
#   git commit --no-verify
#   git push   --no-verify

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/pre-push

echo "Git hooks configured."
echo "  pre-commit : format + lint + typecheck  (git commit --no-verify to skip)"
echo "  pre-push   : full quality gate           (git push   --no-verify to skip)"
