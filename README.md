# kana-site

[![Quality Gates](https://github.com/shikarii/kana-site/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/shikarii/kana-site/actions/workflows/quality-gates.yml)
[![Deploy Pages](https://github.com/shikarii/kana-site/actions/workflows/deploy.yml/badge.svg)](https://github.com/shikarii/kana-site/actions/workflows/deploy.yml)

Browser-based Japanese IME practice tool. Type romaji and get real-time hiragana/katakana
conversion, kanji suggestions via SKK dictionary, furigana rendering, and text-to-speech.

Live site: **https://shikarii.github.io/kana-site/**

---

## Features

| Feature           | Description                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Romaji → Kana     | Type `nihongo` → `にほんご` or `ニホンゴ`. Switches between hiragana and katakana at any time, including re-converting existing text. |
| Kanji suggestions | SKK dictionary lookup via a background web worker. Arrow keys navigate suggestions; Enter commits; Escape dismisses.                  |
| Text-to-Speech    | Japanese voice playback via Web Speech API.                                                                                           |
| Furigana Reader   | Paste paired JP/EN lines; renders inline furigana with per-sentence English reveal.                                                   |

---

## Getting started

```bash
git clone https://github.com/shikarii/kana-site
cd kana-site
npm install
npm run setup          # sync kuromoji/ipadic vendor assets and fetch SKK dictionary
bash scripts/setup_hooks.sh   # install git hooks (one-time)
npm run dev            # start Vite dev server at http://localhost:5173
```

---

## Architecture

```
src/
  lib/       pure logic — kana conversion, furigana parser, IME glue, TTS hook
  pages/     route-level components — Romaji.tsx, Reader.tsx
  components reusable UI primitives
  types/     shared TypeScript interfaces
public/
  js/        ime-worker.js  (SKK + kuromoji web worker)
  dict/      SKK-JISYO.L    (fetched by npm run setup)
  vendor/    kuromoji + ipadic (synced by npm run setup)
```

Import rules enforced by `AGENTS.md`:

- `lib/` must not import from `components/`, `pages/`, or `styles/`
- `components/` must not import from `pages/`

---

## Development commands

```bash
npm run dev            # Vite dev server
npm run test           # Vitest in watch mode
npm run test:run       # run tests once
npm run typecheck      # tsc --noEmit
npm run lint:check     # ESLint
npm run format         # Prettier
npm run build          # production build → dist/
```

---

## Quality gates

Pre-commit and pre-push hooks enforce quality automatically after `bash scripts/setup_hooks.sh`.

| Gate                              | Command                          | When                   |
| --------------------------------- | -------------------------------- | ---------------------- |
| Fast (format + lint + typecheck)  | `bash docker/scripts/ci_part.sh` | every commit           |
| Full (all checks + tests + build) | `bash docker/scripts/ci_full.sh` | every push / before PR |

A self-hosted GitHub Actions runner executes the same gates on every PR. See `AGENTS.md` for
Docker runner setup instructions.

---

## Deployment

GitHub Actions deploys to GitHub Pages automatically on push to `main`. The `dist/` directory
is never committed directly.

---

## Contributing

See `CONTRIBUTING.md` for setup steps, branch rules, and PR requirements.
