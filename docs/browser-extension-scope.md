# Browser Extension: Furigana Sentence Collector — Scope

A Chrome (MV3) extension that detects Japanese text on any webpage, injects
furigana annotations via the local kotoba-lab server, and lets users collect
JP+EN sentence pairs directly into their kotoba-lab database.

---

## Architecture

```
extension/
  manifest.json          MV3, host_permissions: [http://localhost:3001/*]
  background/
    service-worker.ts    API calls, tab messaging
  content/
    content.ts           DOM text detection, <ruby> injection, selection handler
  popup/
    index.html           Collection queue, server status, quick import
    index.tsx
  options/
    index.html           Server URL, default deck, furigana toggle
    index.tsx
  shared/
    parsePairs.ts        Shared copy of client/lib/reader.ts helpers
    api.ts               Typed wrapper for kotoba-lab REST API
  package.json
  vite.config.ts         @crxjs/vite-plugin (HMR-capable MV3 build)
  tsconfig.json
```

The extension is a **separate build unit** inside the monorepo — its own
`package.json` / Vite config. It shares logic (not source files) with the
main client: `parsePairs`, `hasJapaneseChars`, `looksEnglish` are copied into
`extension/shared/parsePairs.ts` and kept in sync.

---

## Phase 1 — Sentence Collection (MVP)

**Goal**: collect selected text from any page and send it to the sentence DB.

### Features
- **Context menu** — right-click any selection → "Add to kotoba-lab"
  - Uses the existing `POST /api/v1/sentences/import` endpoint
  - `source` field set to current tab URL
  - `parsePairs()` applied to selection: if JP + EN paragraph detected, both
    fields are populated; otherwise `english` is left blank
- **Toolbar popup**
  - Server status indicator (green/red based on `GET /api/v1/sentences`)
  - Last 5 imported sentences
  - Quick paste-and-import text box
  - "Send to deck" toggle: route to `POST /api/v1/decks/:id/cards` instead of
    sentence import (front = JP, back = EN)
- **Options page**
  - Server URL (default `http://localhost:3001`)
  - Target deck selector (populated from `GET /api/v1/decks`)
  - Enable/disable furigana overlay (Phase 2)

### Server changes — none
Uses the existing sentence import endpoint unchanged.

---

## Phase 2 — Furigana Overlay

**Goal**: inject `<ruby>` annotations above kanji on any page when enabled.

### New server endpoint

```
POST /api/v1/annotate
Body:    { text: string }
Response: { tokens: Array<{ surface: string; reading: string | null }> }
```

- Install `kuromoji` in `server/package.json` (server already loads it via
  `imeGlue.ts` at runtime; move to a proper server-side service)
- Return per-token `{ surface, reading }` — `reading` is null for non-kanji
  tokens (hiragana, romaji, punctuation)
- Extension calls this endpoint → builds `<ruby>` DOM nodes in-page

### Content script behaviour
- On page load (if overlay enabled in options): scan all visible `<p>`, `<li>`,
  `<span>`, `<td>` text nodes for Japanese characters
- Batch-send Japanese text nodes to `/api/v1/annotate` (deduplicated)
- Replace text node with `<ruby>` nodes: `<ruby>漢字<rt>かんじ</rt></ruby>`
- Toggle button injected into page (bottom-right corner): "あ↔漢" to show/hide

### Why delegate to server instead of bundling kuromoji
- kuromoji dictionary files are ~5 MB uncompressed; bundling them would make
  the extension impractical
- The extension already requires the local server to be running for collection
- Server has warm kuromoji instance shared with the IME; no extra cost

---

## Phase 3 — Smart Auto-Collection

**Goal**: scan a full page and auto-pair JP+EN paragraphs for bulk import.

### Features
- **"Collect all" button** in popup: scrapes the current tab DOM
  - Content script runs `document.querySelectorAll('p, li, .sentence, ...')`
  - Applies `hasJapaneseChars()` to filter JP paragraphs
  - Applies `looksEnglish()` to detect paired EN paragraphs (same
    adjacent-line pairing logic as `parsePairs()`)
- **Review queue**: shows extracted pairs in popup before committing
  - User can edit, discard individual pairs, or import all
- **Source tagging**: pairs imported with `source = page URL + title`

---

## Build / CI

```
extension/package.json   scripts: dev, build, typecheck, test
```

- `@crxjs/vite-plugin` for HMR during development (`npm run dev` loads unpacked
  extension with live reload)
- `npm run build` produces `extension/dist/` — load as unpacked extension in
  Chrome
- `npx tsc --noEmit` added to `.github/workflows/quality-gates.yml` as
  `extension-quality` job

### Loading for development
```bash
cd extension && npm run build
# Chrome → Extensions → Load unpacked → extension/dist/
```

---

## Key Constraints

| Constraint | Detail |
|---|---|
| Requires server | Extension needs `http://localhost:3001` running for Phase 1–3 |
| No offline furigana | Dict bundle too large; offline mode = text collection only |
| MV3 CSP | No inline scripts; all logic in bundled JS |
| CORS | Server must allow `chrome-extension://*` origin — add to `CORS_ORIGIN` env |
| Firefox | MV3 support is partial in Firefox; target Chrome only for v1 |

---

## File Summary

| File | Phase | Action |
|---|---|---|
| `extension/manifest.json` | 1 | CREATE |
| `extension/background/service-worker.ts` | 1 | CREATE |
| `extension/content/content.ts` | 1 | CREATE |
| `extension/popup/index.html` + `index.tsx` | 1 | CREATE |
| `extension/options/index.html` + `index.tsx` | 1 | CREATE |
| `extension/shared/parsePairs.ts` | 1 | CREATE (copy from client/lib/reader.ts) |
| `extension/shared/api.ts` | 1 | CREATE |
| `extension/package.json` + `vite.config.ts` + `tsconfig.json` | 1 | CREATE |
| `server/src/services/kuromojiService.ts` | 2 | CREATE |
| `server/src/routes/annotate.ts` | 2 | CREATE |
| `server/src/routes/index.ts` | 2 | MODIFY (mount annotate route) |
| `server/src/config/env.ts` | 1 | MODIFY (allow extension CORS origin) |
| `.github/workflows/quality-gates.yml` | 1 | MODIFY (add extension-quality job) |
| `AGENTS.md` | 1 | MODIFY (add extension/ section) |

---

## Verification

```bash
# Phase 1 — build and typecheck
cd extension && npm ci && npm run build && npx tsc --noEmit

# Phase 2 — server annotation endpoint
curl -s -X POST http://localhost:3001/api/v1/annotate \
  -H 'Content-Type: application/json' \
  -d '{"text":"私は学生です"}' | jq .
# → [{ surface: "私", reading: "わたし" }, ...]

# Manual: Load extension/dist/ as unpacked in Chrome
# → Browse https://www3.nhk.or.jp/news/easy/
# → Select a Japanese sentence, right-click → "Add to kotoba-lab"
# → Open popup → sentence appears in last-imports list
# → Phase 2: enable furigana overlay → ruby annotations appear on page
```
