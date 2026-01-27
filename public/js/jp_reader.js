/* Japanese Furigana Reader
   Renders explicit format: (BASE (READING))
   Example: (作品 (さくひん)) and お(母 (かあ))さん
*/

(function () {
  const FONT_KEY = "jp_reader_font";
  const KEEP_PARENS_KEY = "jp_reader_keep_parens";
  const SHOW_FURI_KEY = "jp_reader_show_furi";
  const FONT_SIZE_KEY = "jp_reader_font_size";
  const LINE_HEIGHT_KEY = "jp_reader_line_height";

  const fontMap = {
    serif:
      '"Noto Serif JP","Shippori Mincho","Yu Mincho","Hiragino Mincho ProN","MS Mincho",serif',
    sans:
      '"Noto Sans JP","Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif',
    shippori:
      '"Shippori Mincho","Noto Serif JP","Yu Mincho","Hiragino Mincho ProN","MS Mincho",serif',
    hina:
      '"Hina Mincho","Shippori Mincho","Noto Serif JP","Yu Mincho","Hiragino Mincho ProN","MS Mincho",serif',
    yuji:
      '"Yuji Syuku","Hina Mincho","Shippori Mincho","Noto Serif JP","Yu Mincho","Hiragino Mincho ProN","MS Mincho",serif',
    system_mincho: '"Yu Mincho","Hiragino Mincho ProN","MS Mincho",serif',
    system_gothic: '"Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif',
    yuji_mai:
  '"Yuji Mai","Yuji Syuku","Hina Mincho","Shippori Mincho","Noto Serif JP","Yu Mincho","Hiragino Mincho ProN","MS Mincho",serif',
yusei:
  '"Yusei Magic","Zen Kurenaido","Noto Sans JP","Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif',
kaisei_decol:
  '"Kaisei Decol","Shippori Mincho","Noto Serif JP","Yu Mincho","Hiragino Mincho ProN","MS Mincho",serif',
zen_kurenaido:
  '"Zen Kurenaido","Yusei Magic","Noto Sans JP","Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif',
zin_bokuryu:
  '"Zin Hena Bokuryu RCF","Yuji Mai","Hina Mincho","Noto Serif JP","Yu Mincho",serif',

zin_bokuryu_hard:
  '"Zin Hena Bokuryu RDF","Zin Hena Bokuryu RCF","Yuji Mai","Noto Serif JP","Yu Mincho",serif',
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Convert "(BASE (READING))" into a furigana span.
  // If keepOuterParens is true, output "(<span class=furi>..</span>)", otherwise output just the span.
  function toFuriSpans(htmlEscapedText, keepOuterParens) {
    // Match: ( BASE ( READING ) )
    // BASE/READING are "no parentheses" runs. Spaces around tokens are allowed.
    const re = /\(\s*([^()]+?)\s*\(\s*([^()]+?)\s*\)\s*\)/g;

    return htmlEscapedText.replace(re, (m, base, reading) => {
      const span =
        '<span class="furi">' +
        `<span class="rt">${reading}</span>` +
        `<span class="base">${base}</span>` +
        "</span>";
      return keepOuterParens ? `(${span})` : span;
    });
  }

  function render() {
    const inputEl = $("input");
    const outEl = $("output");
    const keepParensEl = $("keepParens");

    if (!inputEl || !outEl || !keepParensEl) return;

    const keepParens = keepParensEl.checked;
    const escaped = escapeHtml(inputEl.value);
    outEl.innerHTML = toFuriSpans(escaped, keepParens);
  }

  function setCssVar(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  function applyFont(key) {
    const stack = fontMap[key] || fontMap.serif;
    setCssVar("--jp-font", stack);
  }

  function applyShowFurigana(show) {
    const outEl = $("output");
    if (!outEl) return;
    outEl.classList.toggle("hide-furi", !show);
  }

  function init() {
    const fileEl = $("file");
    const renderBtn = $("renderBtn");
    const clearBtn = $("clearBtn");
    const toggleFuri = $("toggleFuri");
    const fontSelect = $("fontSelect");
    const fontSize = $("fontSize");
    const fontSizeVal = $("fontSizeVal");
    const lineHeight = $("lineHeight");
    const lineHeightVal = $("lineHeightVal");
    const keepParens = $("keepParens");

    if (
      !fileEl ||
      !renderBtn ||
      !clearBtn ||
      !toggleFuri ||
      !fontSelect ||
      !fontSize ||
      !fontSizeVal ||
      !lineHeight ||
      !lineHeightVal ||
      !keepParens
    ) {
      return;
    }

    // Restore settings
    const savedFont = localStorage.getItem(FONT_KEY);

if (savedFont && fontMap[savedFont]) {
  fontSelect.value = savedFont;
}

applyFont(fontSelect.value);

    const savedKeepParens = localStorage.getItem(KEEP_PARENS_KEY);
    if (savedKeepParens === "1") keepParens.checked = true;

    const savedShowFuri = localStorage.getItem(SHOW_FURI_KEY);
    if (savedShowFuri === "0") toggleFuri.checked = false;
    applyShowFurigana(toggleFuri.checked);

    const savedFs = localStorage.getItem(FONT_SIZE_KEY);
    if (savedFs) {
      const v = Number(savedFs);
      if (!Number.isNaN(v)) fontSize.value = String(v);
    }
    setCssVar("--fs", fontSize.value + "px");
    fontSizeVal.textContent = fontSize.value + "px";

    const savedLh = localStorage.getItem(LINE_HEIGHT_KEY);
    if (savedLh) {
      const v = Number(savedLh);
      if (!Number.isNaN(v)) lineHeight.value = String(v);
    }
    setCssVar("--lh", lineHeight.value);
    lineHeightVal.textContent = lineHeight.value;

    // Wire events
    renderBtn.addEventListener("click", render);

    clearBtn.addEventListener("click", () => {
      $("input").value = "";
      $("output").innerHTML = "";
    });

    toggleFuri.addEventListener("change", () => {
      applyShowFurigana(toggleFuri.checked);
      localStorage.setItem(SHOW_FURI_KEY, toggleFuri.checked ? "1" : "0");
    });

    fontSelect.addEventListener("change", () => {
      applyFont(fontSelect.value);
      localStorage.setItem(FONT_KEY, fontSelect.value);
    });

    fontSize.addEventListener("input", () => {
      setCssVar("--fs", fontSize.value + "px");
      fontSizeVal.textContent = fontSize.value + "px";
      localStorage.setItem(FONT_SIZE_KEY, fontSize.value);
    });

    lineHeight.addEventListener("input", () => {
      setCssVar("--lh", lineHeight.value);
      lineHeightVal.textContent = lineHeight.value;
      localStorage.setItem(LINE_HEIGHT_KEY, lineHeight.value);
    });

    keepParens.addEventListener("change", () => {
      localStorage.setItem(KEEP_PARENS_KEY, keepParens.checked ? "1" : "0");
      render();
    });

    fileEl.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const text = await file.text();
      $("input").value = text;
      render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
