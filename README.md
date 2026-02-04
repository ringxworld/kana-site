# Kana Site

[![Deploy Pages](https://github.com/ringxworld/kana-site/actions/workflows/deploy.yml/badge.svg)](https://github.com/ringxworld/kana-site/actions/workflows/deploy.yml)
[![CI](https://github.com/ringxworld/kana-site/actions/workflows/ci.yml/badge.svg)](https://github.com/ringxworld/kana-site/actions/workflows/ci.yml)

A simple, self-contained web app for practicing Japanese typing and conversions.
It takes romaji input and converts it to hiragana, katakana, or kanji suggestions — just like an IME, but in your browser.

Live links:
- **App**: https://ringxworld.github.io/kana-site/
- **Reader**: https://ringxworld.github.io/kana-site/#/reader

---

## Features

- **Romaji → Kana conversion**
  Type naturally (e.g. `nihongo`) and it instantly converts to `にほんご` or `ニホンゴ`.

- **Kanji suggestions**
  Shows matching words like `日本語` for `にほんご`.
  You can toggle or accept suggestions just like a normal IME.

- **Text-to-Speech (TTS)**
  Hear your text spoken with a Japanese voice — great for quick pronunciation checks.

- **Furigana reader**
  Paste paired JP/EN lines and render furigana with per-sentence English reveal.

- **Single-page app**
  Lightweight, client-only app built with React + Vite.

---

## Usage

1. Type in romaji (e.g. `nihongo`).
2. The text area updates in real time.
3. Toggle between:
   - Hiragana
   - Katakana
   - None
4. Kanji suggestions appear for trailing hiragana.
5. Optionally use the **Speak** button to hear the text.

---

## Deployment (GitHub Pages)

This repo uses a GitHub Actions workflow that builds and deploys the site to GitHub Pages.

Recommended Pages settings:
- Source: **GitHub Actions**

Notes:
- Do not commit `dist/` to `main`.
- The workflow publishes `dist/` automatically.

Manual build:
- `npm run build`
