# AGENTS.md

Repository operating rules for coding agents.

## 0. Prime Directive

- You may generate code quickly.
- You may not change architecture without explicit approval.
- If a requested change violates repository contracts, stop and ask for clarification.
- Prefer correctness and boundary integrity over speed.
- NEVER use emojis in code, commit messages, documentation, or any repository artifacts.

## 1. Required Repository Contracts

These artifacts must remain present:

- `AGENTS.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODEOWNERS`
- `docs/architecture.md`
- `docs/adr/`
- `.github/pull_request_template.md`

If a change introduces new public behavior or a new dependency, add an ADR.
Do not introduce or modify licensing terms without explicit maintainer approval.

## 1.1 Nested Agent Instructions Precedence

- Always discover and read any closer `AGENT.md` or `AGENTS.md` in the directory subtree you are changing.
- Treat the nearest inner agent-instructions file as authoritative for that subtree.
- Apply root `AGENTS.md` rules as defaults, and let inner rules refine or tighten behavior for local scope.
- If instructions conflict and cannot be safely reconciled, stop and ask the maintainer before proceeding.

## 2. Module Ownership and Boundaries

```
src/
  components/   — reusable UI primitives (no page-level state or routing)
  pages/        — route-level components (may compose components, own page state)
  lib/          — pure logic: IME engine, dictionary parsing, kana conversion
  types/        — shared TypeScript types and interfaces
  styles/       — global CSS and design tokens
```

Import rules:

- `lib/` must not import from `components/`, `pages/`, or `styles/`.
- `components/` must not import from `pages/`.
- `pages/` may import from `components/` and `lib/`.
- Side effects (DOM events, localStorage) belong in `pages/` or explicit hook modules, never in `lib/`.

## 3. Quality and Enforcement

### 3.0 Session Start — Docker and Runner Check (MANDATORY)

**Before doing any work**, verify Docker is running and the self-hosted CI runner is active.

Run this check at the start of every session:

```bash
# 1. Verify Docker is available
docker info > /dev/null 2>&1 || echo "DOCKER NOT RUNNING"

# 2. Check runner status
docker compose -f docker/docker-compose.yml --profile ci ps runner
```

**If Docker is not running:** STOP. Notify the user immediately:
> "Docker is not available. Please start Docker Desktop before proceeding.
> The CI runner and local quality gates require Docker to function."
> Do not commit, push, or open PRs until Docker is confirmed running.

**If the runner container is not up or not healthy:** start it automatically:

```bash
bash docker/scripts/setup_runner.sh
```

The runner must be active before any PR is opened. PRs opened without an active runner
will have their quality-gates jobs queued indefinitely until the runner comes online.

All quality checks run locally. GitHub Actions route to the self-hosted runner (zero billing).

**On every commit** — fast gate (format + lint + typecheck):

```bash
bash docker/scripts/ci_part.sh
```

If npm is not available on the host, this automatically delegates to the Docker CI container.
To force in-container execution explicitly:

```bash
docker compose -f docker/docker-compose.yml --profile ci run --rm ci bash docker/scripts/ci_part.sh
```

**Before every push and before opening a PR** — full gate (all checks including tests and build):

```bash
bash docker/scripts/ci_full.sh
```

To force in-container:

```bash
docker compose -f docker/docker-compose.yml --profile ci run --rm ci
```

Set `KANA_FORCE_DOCKER_CI=1` to force Docker delegation even when npm is available on the host.

The git hooks enforce these automatically after one-time setup:

```bash
bash scripts/setup_hooks.sh
```

- `pre-commit` runs `docker/scripts/ci_part.sh` (format + lint + typecheck) on every commit.
- `pre-push` runs `docker/scripts/ci_full.sh` (full gate) on every push.
- Skip with `--no-verify` only in genuine emergencies.

Do not bypass CI to force merge.
Do not remove tests to satisfy gates. Add or adjust tests for both success and failure paths.

### 3.1 Mandatory Adversarial Self-Review

For every implementation task, run an explicit adversarial pass before finalizing:

- Assume the current approach is wrong until falsified.
- Try to break it with malformed inputs and boundary values.
- Check for regressions in IME state, dictionary parsing, and kana conversion.
- Check for silent failure paths and misleading success states.

### 3.2 Mandatory PR Bug Sweep

For every pull request, perform a bug-focused review of all changed files:

- Inspect each changed file directly (do not sample a subset).
- Record findings by severity; if no findings exist, state that explicitly.
- Call out residual risk and test gaps, even when findings are empty.
- For every confirmed bug, add a regression test before merge.

## 4. Entropy Prevention

- No `utils` module names for new code.
- No `TODO` without issue reference (example: `TODO(#123): ...`).
- No new public API without docs and tests.
- Feature flags require an explicit removal plan.

## 5. ADR Discipline

Before non-trivial implementation, add or update an ADR under `docs/adr/` with:

- Problem
- Non-goals
- Public API or behavior contract
- Invariants
- Test plan

## 6. Completion Rule

After each completed prompt:

0. Confirm Docker is running and the CI runner is active (see section 3.0)
1. Implement
2. Validate — run `bash docker/scripts/ci_full.sh`; all checks must pass
3. Commit — pre-commit hook enforces format + lint + typecheck automatically
4. Push feature branch — pre-push hook enforces full gate automatically
5. Open PR to `develop`
6. Merge via PR after gate passes and template is valid

## 7. Branch and PR Discipline

This repository is PR-first and feature-branch-only for agent work:

- Always branch from latest `develop`.
- Never commit directly to `develop` or `main`.
- Keep changes isolated to one human-readable feature branch per task.
- After pushing, open or update a PR to `develop` and link the relevant issue URL.
- Every PR must include at least one explicit issue reference using a full URL
  (example: `https://github.com/shikarii/kana-site/issues/1`).
- Include a closing keyword plus issue URL when appropriate
  (example: `Closes https://github.com/shikarii/kana-site/issues/1`).
- Do not close implementation issues until the PR is merged.

## 8. Human-Facing Wording for Issues and PRs

When writing issue or PR text:

- Use human, specific language over boilerplate.
- Prefer concrete sentences about intent and impact.
- Link issues with full URLs, not just `#1`.
- State tradeoffs and test coverage explicitly.
- Never write literal `\n` sequences in GitHub issue/PR text. Use real line breaks
  and body files (`--body-file`) when scripting `gh` commands.

## 9. Issue Close-Out Summaries

When closing an issue, add a structured summary comment first:

- Include concrete artifacts (PR URLs, commit SHAs, tests executed).
- Keep closure evidence auditable.
- Never include secrets in issue comments.

## 10. Dependabot Handling

Treat Dependabot PRs as first-class maintenance work:

- Triage promptly.
- Auto-merge safe patch/minor updates only after checks pass.
- Manually review major/ambiguous updates.
- If checks fail, capture root cause and add compatibility coverage.

## 11. Software Design Principles

**Single Responsibility** — Every module has exactly one reason to change. Separate
IME logic, dictionary parsing, kana conversion, and UI into distinct files.

**Dependency Inversion** — Pure logic in `lib/` must not depend on UI or browser APIs.
Components depend on lib; lib does not depend on components.

**Idempotent Operations** — IME transformation functions must be pure: same input
produces the same output with no side effects. This makes them safe to test in isolation.

**Fail-Safe Defaults** — Dictionary lookups and kana conversions that find no result
must return an explicit empty or null value, never throw unexpectedly.

**Composability** — Build complex IME behavior from simple, independently testable
functions. Avoid monolithic state machines that mix input handling with rendering.

**Contract Payload Integrity** — Do not introduce mixed-type fields in any data contract.
A field must have exactly one type across all code paths.
