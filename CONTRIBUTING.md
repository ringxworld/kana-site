# Contributing

## Setup

```bash
git clone https://github.com/shikarii/kotoba-lab
cd kotoba-lab
npm install
npm run setup          # sync vendor assets and fetch SKK dictionary
bash scripts/setup_hooks.sh   # install git hooks (one-time)
bash docker/scripts/setup_runner.sh  # start local CI runner (requires Docker)
```

## Development

```bash
npm run dev            # start Vite dev server
npm run test           # run tests in watch mode
npm run test:run       # run tests once
npm run typecheck      # TypeScript type check
npm run lint:check     # ESLint check
npm run format         # format with Prettier
```

## Quality Gates

Pre-commit and pre-push hooks enforce quality gates automatically after running
`bash scripts/setup_hooks.sh`.

Run manually:

```bash
bash docker/scripts/ci_part.sh   # fast: format + lint + typecheck
bash docker/scripts/ci_full.sh   # full: all checks + tests + build
```

## Branches and PRs

- Branch from `develop`.
- Never push directly to `develop` or `main`.
- Open a PR with a linked issue URL.
- Fill out the pull request template completely.

See `AGENTS.md` for full agent and contributor rules.
