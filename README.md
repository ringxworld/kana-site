# Kana Converter — Romaji → ひらがな / カタカナ

A minimalist, offline-ready web app that converts romaji to Japanese kana instantly.  
Built as a single-file PWA — no dependencies, no frameworks, just pure HTML/CSS/JS.

🔗 **Live site:** [https://ringxworld.github.io/kana-site/](https://ringxworld.github.io/kana-site/)

---

## ✨ Features

- 🈶 **Romaji → Hiragana / Katakana conversion** (handles digraphs, っ, and ん)
- 🔊 **Text-to-speech** with adjustable rate, pitch, and voice selection
- 💾 **Offline PWA support** (installable on desktop/mobile)
- 📱 **Mobile-friendly design** with responsive layout and large touch targets
- 🧠 **Keyboard shortcuts** — <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Enter</kbd> to copy output

---

## 🧩 Usage

1. Open the [live site](https://ringxworld.github.io/kana-site/).
2. Type any romaji into the input box. Example:  
   `konnichiwa` → `こんにちは`  
   `ryokou` → `りょこう`
3. Toggle between **Hiragana**, **Katakana**, or **No conversion**.
4. Use **Download**, **Copy**, or **Speak** buttons as needed.
5. (Optional) **Install** it as a PWA for offline use.

---

## ⚙️ Local Development

You can open `index.html` directly in your browser — no server required.  
To run it locally:

```bash
git clone https://github.com/ringxworld/kana-site.git
cd kana-site
open index.html  # or double-click it
