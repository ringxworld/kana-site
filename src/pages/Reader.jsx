import React, { useEffect, useMemo, useState } from 'react';
import Nav from '../components/Nav.jsx';

const FONT_KEY = 'jp_reader_font';
const FS_KEY = 'jp_reader_fs';
const LH_KEY = 'jp_reader_lh';
const FURI_KEY = 'jp_reader_furi';
const KEEP_PARENS_KEY = 'jp_reader_keep_parens';
const SHOW_ALL_EN_KEY = 'jp_reader_show_all_en';

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

function hasJapaneseChars(line) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(line);
}

function looksEnglish(line) {
  const s = line.trim();
  if (!s) return false;
  if (hasJapaneseChars(s)) return false;
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  if (latin >= 2) return true;
  return false;
}

function parsePairs(input) {
  const lines = input.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const pairs = [];
  let i = 0;

  function nextNonEmpty(idx) {
    while (idx < lines.length && lines[idx].trim() === '') idx += 1;
    return idx;
  }

  while (i < lines.length) {
    i = nextNonEmpty(i);
    if (i >= lines.length) break;

    const jp = lines[i];
    i += 1;

    const j = nextNonEmpty(i);
    if (j >= lines.length) {
      pairs.push({ jp, en: '' });
      break;
    }

    const candidate = lines[j];

    if (looksEnglish(candidate)) {
      pairs.push({ jp, en: candidate });
      i = j + 1;
    } else {
      pairs.push({ jp, en: '' });
      i = j;
    }
  }

  return pairs;
}

function parseFuriganaGroups(raw, keepParens) {
  const out = [];
  let i = 0;

  while (i < raw.length) {
    if (raw[i] !== '(') {
      out.push({ t: 'text', v: raw[i] });
      i += 1;
      continue;
    }

    const start = i;
    i += 1;

    let base = '';
    let foundReadingStart = false;

    while (i < raw.length) {
      if (raw[i] === '(') {
        foundReadingStart = true;
        break;
      }
      base += raw[i];
      i += 1;
    }

    if (!foundReadingStart) {
      out.push({ t: 'text', v: raw.slice(start, i) });
      continue;
    }

    i += 1;

    let reading = '';
    let readingClosed = false;

    while (i < raw.length) {
      if (raw[i] === ')') {
        readingClosed = true;
        i += 1;
        break;
      }
      reading += raw[i];
      i += 1;
    }

    if (!readingClosed) {
      out.push({ t: 'text', v: raw.slice(start, i) });
      continue;
    }

    if (i >= raw.length || raw[i] !== ')') {
      out.push({ t: 'text', v: raw.slice(start, i) });
      continue;
    }
    i += 1;

    const baseTrim = base.trim();
    const readingTrim = reading.trim();

    if (keepParens) out.push({ t: 'text', v: '(' });
    out.push({ t: 'furi', base: baseTrim, reading: readingTrim });
    if (keepParens) out.push({ t: 'text', v: ')' });
  }

  return out;
}

function renderTokens(tokens) {
  return tokens.map((tok, idx) => {
    if (tok.t === 'text') return <React.Fragment key={idx}>{tok.v}</React.Fragment>;
    return (
      <span className="furi" key={idx}>
        <span className="base">{tok.base}</span>
        <span className="rt">{tok.reading}</span>
      </span>
    );
  });
}

export default function Reader() {
  const [inputText, setInputText] = useState('');
  const [pairs, setPairs] = useState([]);
  const [openStates, setOpenStates] = useState([]);
  const [showFuri, setShowFuri] = useState(true);
  const [showAllEn, setShowAllEn] = useState(false);
  const [keepParens, setKeepParens] = useState(false);
  const [fontSelect, setFontSelect] = useState('yuji_mai');
  const [fontSize, setFontSize] = useState(20);
  const [lineHeight, setLineHeight] = useState(1.9);

  useEffect(() => {
    document.body.classList.add('page-reader');
    return () => document.body.classList.remove('page-reader');
  }, []);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    const styleId = 'reader-fonts';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
@font-face {
  font-family: "Zin Hena Bokuryu RCF";
  src: url("${base}fonts/ZinHenaBokuryu-RCF.otf") format("opentype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Zin Hena Bokuryu RDF";
  src: url("${base}fonts/ZinHenaBokuryu-RDF.otf") format("opentype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
`;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    const savedFont = localStorage.getItem(FONT_KEY);
    if (savedFont && fontMap[savedFont]) setFontSelect(savedFont);

    const fs = localStorage.getItem(FS_KEY);
    if (fs && !Number.isNaN(Number(fs))) setFontSize(Number(fs));

    const lh = localStorage.getItem(LH_KEY);
    if (lh && !Number.isNaN(Number(lh))) setLineHeight(Number(lh));

    const furi = localStorage.getItem(FURI_KEY);
    if (furi !== null) setShowFuri(furi === '1');

    const kp = localStorage.getItem(KEEP_PARENS_KEY);
    if (kp !== null) setKeepParens(kp === '1');

    const sae = localStorage.getItem(SHOW_ALL_EN_KEY);
    if (sae !== null) setShowAllEn(sae === '1');
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--jp-font', fontMap[fontSelect] || fontMap.yuji_mai);
  }, [fontSelect]);

  useEffect(() => {
    document.documentElement.style.setProperty('--fs', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--lh', String(lineHeight));
  }, [lineHeight]);

  useEffect(() => {
    localStorage.setItem(FONT_KEY, fontSelect);
    localStorage.setItem(FS_KEY, String(fontSize));
    localStorage.setItem(LH_KEY, String(lineHeight));
    localStorage.setItem(FURI_KEY, showFuri ? '1' : '0');
    localStorage.setItem(KEEP_PARENS_KEY, keepParens ? '1' : '0');
    localStorage.setItem(SHOW_ALL_EN_KEY, showAllEn ? '1' : '0');
  }, [fontSelect, fontSize, lineHeight, showFuri, keepParens, showAllEn]);

  useEffect(() => {
    if (!pairs.length) return;
    setOpenStates(pairs.map(() => showAllEn));
  }, [showAllEn]);

  const parsedOutput = useMemo(() => {
    return pairs.map((pair) => ({
      ...pair,
      tokens: parseFuriganaGroups(pair.jp || '', keepParens),
    }));
  }, [pairs, keepParens]);

  function handleRender() {
    const nextPairs = parsePairs(inputText);
    setPairs(nextPairs);
    setOpenStates(nextPairs.map(() => showAllEn));
  }

  function handleClear() {
    setInputText('');
    setPairs([]);
    setOpenStates([]);
  }

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setInputText(text);
    const nextPairs = parsePairs(text);
    setPairs(nextPairs);
    setOpenStates(nextPairs.map(() => showAllEn));
  }

  function toggleEn(idx) {
    if (showAllEn) return;
    setOpenStates((prev) => prev.map((val, i) => (i === idx ? !val : val)));
  }

  return (
    <div className="page page-reader">
      <header className="reader-header">
        <div className="reader-wrap">
          <div className="topline">
            <h1>Japanese Furigana Reader</h1>
            <Nav />
          </div>
          <div className="sub">
            Input format (paired lines): JP then EN. Example:
            <span className="pill">よくできた(作品 (さくひん))だ。</span>
            <span className="pill">It’s a well-made piece of work.</span>
          </div>
        </div>
      </header>

      <div className="reader-wrap">
        <div className="controls">
          <div className="row">
            <input type="file" accept=".txt,.md,.text" onChange={handleFile} />
            <button type="button" onClick={handleRender}>
              Render
            </button>
            <button type="button" onClick={handleClear}>
              Clear
            </button>
            <span className="pill">JP line then EN line. Blank lines allowed.</span>
          </div>

          <div className="row">
            <label>
              <input type="checkbox" checked={showFuri} onChange={(e) => setShowFuri(e.target.checked)} />
              Show furigana
            </label>

            <label>
              <input type="checkbox" checked={showAllEn} onChange={(e) => setShowAllEn(e.target.checked)} />
              Show all English
            </label>

            <label>
              Font
              <select value={fontSelect} onChange={(e) => setFontSelect(e.target.value)}>
                <option value="yuji_mai">Yuji Mai (default)</option>
                <option value="serif">Noto Serif JP (normal)</option>
                <option value="sans">Noto Sans JP (clean)</option>
                <option value="shippori">Shippori Mincho (literary)</option>
                <option value="hina">Hina Mincho (handwritten-ish)</option>
                <option value="yuji">Yuji Syuku (brush-ish)</option>
                <option value="yusei">Yusei Magic (marker handwritten)</option>
                <option value="kaisei_decol">Kaisei Decol (decorative)</option>
                <option value="zen_kurenaido">Zen Kurenaido (handwritten quirky)</option>
                <option value="zin_bokuryu">Zin Hena Bokuryu (free brush)</option>
                <option value="zin_bokuryu_hard">Zin Hena Bokuryu RDF (very hard)</option>
                <option value="system_mincho">System Mincho</option>
                <option value="system_gothic">System Gothic</option>
              </select>
            </label>

            <label>
              Font size
              <input
                type="range"
                min="16"
                max="52"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <span className="pill">{fontSize}px</span>
            </label>

            <label>
              Line height
              <input
                type="range"
                min="1.4"
                max="2.4"
                step="0.05"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
              />
              <span className="pill">{lineHeight}</span>
            </label>

            <label>
              Preserve outer parentheses
              <input
                type="checkbox"
                checked={keepParens}
                onChange={(e) => setKeepParens(e.target.checked)}
              />
            </label>
          </div>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste paired lines here:
JP sentence
English translation

JP sentence
English translation"
        />

        <div className="reader">
          <div className={`content ${showFuri ? '' : 'hide-furi'}`}>
            {parsedOutput.map((pair, idx) => {
              const hasEn = !!pair.en && pair.en.trim() !== '';
              const isOpen = showAllEn ? true : !!openStates[idx];
              return (
                <div className="sentence" key={`${idx}-${pair.jp.slice(0, 8)}`}>
                  <div className="jp-row">
                    <div className="jp">{renderTokens(pair.tokens)}</div>
                    {hasEn && (
                      <button
                        className="enbtn"
                        type="button"
                        aria-pressed={isOpen}
                        onClick={() => toggleEn(idx)}
                        disabled={showAllEn}
                      >
                        EN
                      </button>
                    )}
                  </div>
                  {hasEn && <div className={`en ${isOpen ? '' : 'hidden'}`}>{pair.en}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
