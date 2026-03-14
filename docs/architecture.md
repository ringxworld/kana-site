# Architecture

## Overview

kotoba-lab is a browser-based Japanese IME (Input Method Editor) built with React,
TypeScript, and Vite. It uses kuromoji for morphological analysis and an SKK dictionary
for kanji conversion.

## Module Layout

```
src/
  components/   Reusable UI primitives (no page-level state or routing)
  pages/        Route-level components; own page state, compose components
  lib/          Pure logic: IME engine, dictionary parsing, kana conversion
  types/        Shared TypeScript interfaces and type aliases
  styles/       Global CSS and design tokens
```

## Dependency Direction

```
pages  -->  components  -->  (none)
pages  -->  lib         -->  (none)
```

`lib/` is pure: no DOM, no React, no browser APIs. This makes it fully unit-testable
in a Node environment.

## Key Libraries

| Library           | Purpose                                 |
| ----------------- | --------------------------------------- |
| kuromoji          | Morphological analysis of Japanese text |
| wanakana          | Romaji to kana transliteration          |
| react-router-dom  | Client-side routing                     |
| Vite              | Build tool and dev server               |
| Vitest            | Unit test runner                        |
| ESLint + Prettier | Code quality and formatting             |

## Dictionary

The SKK-JISYO.L dictionary is fetched once via `npm run fetch:skk` and served as a
static asset. It is not committed to the repository.

## Build

```bash
npm run build   # outputs to dist/
npm run preview # serves dist/ locally
```

## ADRs

See `docs/adr/` for architectural decision records.
