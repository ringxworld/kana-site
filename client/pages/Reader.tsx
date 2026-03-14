import React, { useEffect, useMemo, useState } from 'react';
import Nav from '../components/Nav';
import {
  parseFuriganaGroups,
  parsePairs,
  type FuriganaToken,
  type ReaderPair,
} from '../lib/reader';
import { useReaderPrefs, fontMap } from '../lib/useReaderPrefs';

function renderTokens(tokens: FuriganaToken[]) {
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
  const [pairs, setPairs] = useState<ReaderPair[]>([]);
  const [openStates, setOpenStates] = useState<boolean[]>([]);
  const {
    showFuri,
    setShowFuri,
    showAllEn,
    setShowAllEn,
    keepParens,
    setKeepParens,
    fontSelect,
    setFontSelect,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
  } = useReaderPrefs();

  useEffect(() => {
    document.body.classList.add('page-reader');
    return () => document.body.classList.remove('page-reader');
  }, []);

  useEffect(() => {
    if (!pairs.length) return;
    setOpenStates(pairs.map(() => showAllEn));
  }, [showAllEn, pairs]);

  const parsedOutput = useMemo(
    () =>
      pairs.map((pair) => ({ ...pair, tokens: parseFuriganaGroups(pair.jp || '', keepParens) })),
    [pairs, keepParens]
  );

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setInputText(text);
    const nextPairs = parsePairs(text);
    setPairs(nextPairs);
    setOpenStates(nextPairs.map(() => showAllEn));
  }

  function toggleEn(idx: number) {
    if (showAllEn) return;
    setOpenStates((prev) => prev.map((val, i) => (i === idx ? !val : val)));
  }

  return (
    <div className="page page-reader">
      <header className="app-header">
        <div className="app-shell header-row">
          <div className="brand">
            <p className="eyebrow">Furigana Reader</p>
            <h1>Japanese Furigana Reader</h1>
            <p className="sub">
              Input format (paired lines): JP then EN.
              <span className="pill">よくできた(作品 (さくひん))だ。</span>
              <span className="pill">It's a well-made piece of work.</span>
            </p>
          </div>
          <Nav />
        </div>
      </header>

      <main className="app-shell">
        <div className="controls card">
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
              <input
                type="checkbox"
                checked={showFuri}
                onChange={(e) => setShowFuri(e.target.checked)}
              />
              Show furigana
            </label>
            <label>
              <input
                type="checkbox"
                checked={showAllEn}
                onChange={(e) => setShowAllEn(e.target.checked)}
              />
              Show all English
            </label>
            <label>
              Font
              <select value={fontSelect} onChange={(e) => setFontSelect(e.target.value)}>
                {Object.keys(fontMap).map((k) => (
                  <option key={k} value={k}>
                    {k.replace(/_/g, ' ')}
                  </option>
                ))}
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
      </main>
    </div>
  );
}
