/* jp_reader.js
   Paired-line Japanese reader with furigana and per-sentence English reveal.

   Input formats supported:
   1) JP line then EN line (blank lines allowed between entries)
   2) JP line only (no EN). EN button is hidden for that sentence.
   Heuristic: if the next non-empty line contains Japanese characters, it is treated as the next JP (not EN).
*/

(() => {
  const FONT_KEY = "jp_reader_font";
  const FS_KEY = "jp_reader_fs";
  const LH_KEY = "jp_reader_lh";
  const FURI_KEY = "jp_reader_furi";
  const KEEP_PARENS_KEY = "jp_reader_keep_parens";
  const SHOW_ALL_EN_KEY = "jp_reader_show_all_en";

  const elFile = document.getElementById("file");
  const elRender = document.getElementById("renderBtn");
  const elClear = document.getElementById("clearBtn");
  const elInput = document.getElementById("input");
  const elOut = document.getElementById("output");

  const elToggleFuri = document.getElementById("toggleFuri");
  const elShowAllEn = document.getElementById("showAllEn");
  const elKeepParens = document.getElementById("keepParens");

  const elFontSelect = document.getElementById("fontSelect");
  const elFontSize = document.getElementById("fontSize");
  const elFontSizeVal = document.getElementById("fontSizeVal");
  const elLineHeight = document.getElementById("lineHeight");
  const elLineHeightVal = document.getElementById("lineHeightVal");

  if (
    !elFile ||
    !elRender ||
    !elClear ||
    !elInput ||
    !elOut ||
    !elToggleFuri ||
    !elShowAllEn ||
    !elKeepParens ||
    !elFontSelect ||
    !elFontSize ||
    !elFontSizeVal ||
    !elLineHeight ||
    !elLineHeightVal
  ) {
    return;
  }

  const fontMap = {
    yuji_mai:
      '"Yuji Mai","Hina Mincho","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
    serif: '"Noto Serif JP","Yu Mincho","MS Mincho",serif',
    sans: '"Noto Sans JP","Noto Sans","Yu Gothic","Meiryo",sans-serif',
    shippori: '"Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
    hina: '"Hina Mincho","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
    yuji: '"Yuji Syuku","Yuji Mai","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
    yusei: '"Yusei Magic","Noto Sans JP","Yu Gothic","Meiryo",sans-serif',
    kaisei_decol: '"Kaisei Decol","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
    zen_kurenaido: '"Zen Kurenaido","Noto Sans JP","Yu Gothic","Meiryo",sans-serif',
    zin_bokuryu:
      '"Zin Hena Bokuryu RCF","Yuji Mai","Hina Mincho","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
    zin_bokuryu_hard:
      '"Zin Hena Bokuryu RDF","Zin Hena Bokuryu RCF","Yuji Mai","Hina Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
    system_mincho: '"Yu Mincho","Hiragino Mincho ProN","MS Mincho",serif',
    system_gothic: '"Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif',
  };

  function escapeHtml(s) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Detect if a line is likely Japanese (hiragana, katakana, kanji).
  function hasJapaneseChars(line) {
    return /[\u3040-\u30ff\u3400-\u9fff]/.test(line);
  }

  // English heuristic: no Japanese chars and has some Latin letters.
  function looksEnglish(line) {
    const s = line.trim();
    if (!s) return false;
    if (hasJapaneseChars(s)) return false;

    const latin = (s.match(/[A-Za-z]/g) || []).length;
    if (latin >= 2) return true;

    // If it is mostly punctuation/numbers, do not treat as EN.
    return false;
  }

  // Parse input into pairs. If next non-empty line is not English, EN is missing.
  function parsePairs(input) {
    const lines = input.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
    const pairs = [];
    let i = 0;

    function nextNonEmpty(idx) {
      while (idx < lines.length && lines[idx].trim() === "") idx += 1;
      return idx;
    }

    while (i < lines.length) {
      i = nextNonEmpty(i);
      if (i >= lines.length) break;

      const jp = lines[i];
      i += 1;

      const j = nextNonEmpty(i);
      if (j >= lines.length) {
        pairs.push({ jp, en: "" });
        break;
      }

      const candidate = lines[j];

      if (looksEnglish(candidate)) {
        pairs.push({ jp, en: candidate });
        i = j + 1;
      } else {
        pairs.push({ jp, en: "" });
        i = j; // treat candidate as next JP
      }
    }

    return pairs;
  }

  // Parse explicit furigana groups: (BASE (READING))
  // Example: お(母 (かあ))さん and (作品 (さくひん))
  function parseFuriganaGroups(raw, keepParens) {
    const out = [];
    let i = 0;

    while (i < raw.length) {
      const ch = raw[i];
      if (ch !== "(") {
        out.push({ t: "text", v: raw[i] });
        i += 1;
        continue;
      }

      const start = i;
      i += 1;

      let base = "";
      let foundReadingStart = false;

      while (i < raw.length) {
        if (raw[i] === "(") {
          foundReadingStart = true;
          break;
        }
        base += raw[i];
        i += 1;
      }

      if (!foundReadingStart) {
        out.push({ t: "text", v: raw.slice(start, i) });
        continue;
      }

      i += 1; // consume "(" of reading

      let reading = "";
      let readingClosed = false;

      while (i < raw.length) {
        if (raw[i] === ")") {
          readingClosed = true;
          i += 1;
          break;
        }
        reading += raw[i];
        i += 1;
      }

      if (!readingClosed) {
        out.push({ t: "text", v: raw.slice(start, i) });
        continue;
      }

      // Expect closing ")" for outer group
      if (i >= raw.length || raw[i] !== ")") {
        out.push({ t: "text", v: raw.slice(start, i) });
        continue;
      }
      i += 1; // consume outer ")"

      const baseTrim = base.trim();
      const readingTrim = reading.trim();

      if (keepParens) out.push({ t: "text", v: "(" });
      out.push({ t: "furi", base: baseTrim, reading: readingTrim });
      if (keepParens) out.push({ t: "text", v: ")" });
    }

    return out;
  }

  function tokensToHtml(tokens) {
    let html = "";
    for (const tok of tokens) {
      if (tok.t === "text") {
        html += escapeHtml(tok.v);
      } else if (tok.t === "furi") {
        html +=
          '<span class="furi">' +
          `<span class="base">${escapeHtml(tok.base)}</span>` +
          `<span class="rt">${escapeHtml(tok.reading)}</span>` +
          "</span>";
      }
    }
    return html;
  }

  function applyFont(key) {
    const family = fontMap[key] || fontMap.yuji_mai;
    document.documentElement.style.setProperty("--jp-font", family);
  }

  function applyFuriganaVisibility() {
    elOut.classList.toggle("hide-furi", !elToggleFuri.checked);
  }

  function setFontSize(px) {
    document.documentElement.style.setProperty("--fs", px + "px");
    elFontSizeVal.textContent = px + "px";
  }

  function setLineHeight(v) {
    document.documentElement.style.setProperty("--lh", String(v));
    elLineHeightVal.textContent = String(v);
  }

  function saveState() {
    localStorage.setItem(FONT_KEY, elFontSelect.value);
    localStorage.setItem(FS_KEY, String(elFontSize.value));
    localStorage.setItem(LH_KEY, String(elLineHeight.value));
    localStorage.setItem(FURI_KEY, elToggleFuri.checked ? "1" : "0");
    localStorage.setItem(KEEP_PARENS_KEY, elKeepParens.checked ? "1" : "0");
    localStorage.setItem(SHOW_ALL_EN_KEY, elShowAllEn.checked ? "1" : "0");
  }

  function loadState() {
    const savedFont = localStorage.getItem(FONT_KEY);
    if (savedFont && fontMap[savedFont]) elFontSelect.value = savedFont;

    const fs = localStorage.getItem(FS_KEY);
    if (fs && !Number.isNaN(Number(fs))) elFontSize.value = fs;

    const lh = localStorage.getItem(LH_KEY);
    if (lh && !Number.isNaN(Number(lh))) elLineHeight.value = lh;

    const furi = localStorage.getItem(FURI_KEY);
    if (furi !== null) elToggleFuri.checked = furi === "1";

    const kp = localStorage.getItem(KEEP_PARENS_KEY);
    if (kp !== null) elKeepParens.checked = kp === "1";

    const sae = localStorage.getItem(SHOW_ALL_EN_KEY);
    if (sae !== null) elShowAllEn.checked = sae === "1";

    applyFont(elFontSelect.value);
    setFontSize(Number(elFontSize.value));
    setLineHeight(elLineHeight.value);
    applyFuriganaVisibility();
  }

  function render() {
    const keepParens = !!elKeepParens.checked;
    const showAllEn = !!elShowAllEn.checked;

    const pairs = parsePairs(elInput.value);

    elOut.innerHTML = "";
    applyFuriganaVisibility();

    for (let idx = 0; idx < pairs.length; idx++) {
      const { jp, en } = pairs[idx];

      const sentence = document.createElement("div");
      sentence.className = "sentence";

      const jpRow = document.createElement("div");
      jpRow.className = "jp-row";

      const jpDiv = document.createElement("div");
      jpDiv.className = "jp";
      // Small extra headroom so furigana does not kiss the card border.
      jpDiv.style.paddingTop = "0.15em";

      const tokens = parseFuriganaGroups(jp, keepParens);
      jpDiv.innerHTML = tokensToHtml(tokens);

      const btn = document.createElement("button");
      btn.className = "enbtn";
      btn.type = "button";
      btn.textContent = "EN";
      btn.setAttribute("aria-pressed", showAllEn ? "true" : "false");

      const enDiv = document.createElement("div");
      enDiv.className = "en" + (showAllEn ? "" : " hidden");
      enDiv.textContent = en || "";

      const hasEn = !!en && en.trim() !== "";
      if (!hasEn) {
        btn.style.display = "none";
        enDiv.classList.add("hidden");
      }

      btn.addEventListener("click", () => {
        const isHidden = enDiv.classList.contains("hidden");
        enDiv.classList.toggle("hidden", !isHidden);
        btn.setAttribute("aria-pressed", isHidden ? "true" : "false");
      });

      jpRow.appendChild(jpDiv);
      jpRow.appendChild(btn);

      sentence.appendChild(jpRow);
      sentence.appendChild(enDiv);

      elOut.appendChild(sentence);
    }
  }

  // Events
  elRender.addEventListener("click", () => {
    render();
    saveState();
  });

  elClear.addEventListener("click", () => {
    elInput.value = "";
    elOut.innerHTML = "";
    saveState();
  });

  elToggleFuri.addEventListener("change", () => {
    applyFuriganaVisibility();
    saveState();
  });

  elShowAllEn.addEventListener("change", () => {
    render();
    saveState();
  });

  elKeepParens.addEventListener("change", () => {
    render();
    saveState();
  });

  elFontSelect.addEventListener("change", () => {
    applyFont(elFontSelect.value);
    saveState();
  });

  elFontSize.addEventListener("input", () => {
    setFontSize(Number(elFontSize.value));
  });
  elFontSize.addEventListener("change", saveState);

  elLineHeight.addEventListener("input", () => {
    setLineHeight(elLineHeight.value);
  });
  elLineHeight.addEventListener("change", saveState);

  elFile.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const text = await file.text();
    elInput.value = text;
    render();
    saveState();
  });

  // Init
  loadState();
})();
