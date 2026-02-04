import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Nav from '../components/Nav.jsx';
import { convertKana } from '../lib/kana.js';
import { initIme } from '../lib/imeGlue.js';
import { useTts } from '../lib/useTts.js';

export default function Home() {
  const [mode, setMode] = useState('hiragana');
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const isComposingRef = useRef(false);
  const selectionRef = useRef(null);
  const imeRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('page-home');
    return () => document.body.classList.remove('page-home');
  }, []);

  useEffect(() => {
    if (!inputRef.current) return;
    const ime = initIme({
      textarea: inputRef.current,
      baseUrl: import.meta.env.BASE_URL,
    });
    imeRef.current = ime;
    return () => {
      imeRef.current = null;
      ime?.cleanup?.();
    };
  }, []);

  const {
    status: ttsStatus,
    voices,
    selectedVoice,
    setSelectedVoice,
    init: initTts,
    speak,
    ready: ttsReady,
  } = useTts();

  useLayoutEffect(() => {
    if (!selectionRef.current || !inputRef.current) return;
    const { start, end } = selectionRef.current;
    try {
      inputRef.current.setSelectionRange(start, end);
    } catch {}
    selectionRef.current = null;
  }, [text]);

  function convertAll(value, nextMode = mode) {
    if (nextMode === 'none') return value;
    return convertKana(value, { mode: nextMode });
  }

  function prefLen(value, cursor, nextMode = mode) {
    return convertAll(value.slice(0, cursor), nextMode).length;
  }

  function applyConversion(value, nextMode = mode) {
    const el = inputRef.current;
    if (!el) return;

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    const converted = convertAll(value, nextMode);

    if (converted !== value) {
      const nextStart = prefLen(value, start, nextMode);
      const nextEnd = prefLen(value, end, nextMode);
      selectionRef.current = { start: nextStart, end: nextEnd };
      setText(converted);
      imeRef.current?.requestSuggest?.(converted);
    } else {
      setText(value);
      imeRef.current?.requestSuggest?.(value);
    }
  }

  function handleInput(e) {
    const value = e.target.value;
    const isComposing = e.nativeEvent?.isComposing || isComposingRef.current;
    if (isComposing) {
      setText(value);
      return;
    }
    if (isComposingRef.current) isComposingRef.current = false;
    applyConversion(value);
  }

  function handleModeChange(e) {
    const nextMode = e.target.value;
    setMode(nextMode);
    const current = inputRef.current?.value ?? text;
    applyConversion(current, nextMode);
  }

  function handleCompositionStart() {
    isComposingRef.current = true;
  }

  function handleCompositionEnd(e) {
    isComposingRef.current = false;
    applyConversion(e.target.value);
  }

  function handlePaste() {
    setTimeout(() => {
      const value = inputRef.current?.value ?? '';
      applyConversion(value);
    }, 0);
  }

  function handleBlur() {
    isComposingRef.current = false;
  }

  const ttsLabel =
    ttsStatus === 'unsupported'
      ? 'Speech: Not available'
      : ttsStatus === 'ready'
        ? 'Speech: Ready'
        : ttsStatus === 'error'
          ? 'Speech: Playback error'
          : 'Speech: Locked (tap Enable)';

  return (
    <div className="page page-home">
      <header className="home-header">
        <div className="home-header-row">
          <h1>Romaji → ひらがな / カタカナ</h1>
          <span className="badge">Kanji Suggestions Patch</span>
          <Nav />
        </div>
      </header>

      <div className="home-container">
        <p className="home-lead">Inline conversion (same textbox). TTS included</p>

        <div className="home-row">
          <label htmlFor="mode" className="hint">
            Mode
          </label>
          <select id="mode" value={mode} onChange={handleModeChange} aria-label="Conversion mode">
            <option value="hiragana">Hiragana</option>
            <option value="katakana">Katakana</option>
            <option value="none">None</option>
          </select>
          <button className="primary" onClick={initTts} disabled={ttsStatus === 'unsupported' || ttsReady}>
            {ttsReady ? 'Speech Ready ✓' : 'Enable Speech'}
          </button>
          <button onClick={() => speak(text)} disabled={!ttsReady || !text.trim()}>
            Speak
          </button>
          <select
            aria-label="Voice"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            style={{ maxWidth: '50ch' }}
          >
            {voices.length === 0 && <option value="">Voices loading...</option>}
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} {voice.lang ? `(${voice.lang})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="status">{ttsLabel}</div>

        <textarea
          ref={inputRef}
          id="input"
          className="home-input jp-ime"
          placeholder="Type romaji here..."
          value={text}
          onChange={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onPaste={handlePaste}
          onBlur={handleBlur}
        />

        <div className="hint">
          Tips: double consonants → っ, 'n' before non-vowel → ん, digraphs like sha/kyo/chu supported.
        </div>
      </div>
    </div>
  );
}
