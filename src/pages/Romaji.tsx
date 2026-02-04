import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Nav from '../components/Nav';
import { convertKana } from '../lib/kana';
import { initIme } from '../lib/imeGlue';
import { useTts } from '../lib/useTts';

export default function Romaji() {
  const [mode, setMode] = useState<'hiragana' | 'katakana' | 'none'>('hiragana');
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const isComposingRef = useRef(false);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const imeRef = useRef<ReturnType<typeof initIme> | null>(null);

  useEffect(() => {
    document.body.classList.add('page-romaji');
    return () => document.body.classList.remove('page-romaji');
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

  function convertAll(value: string, nextMode: typeof mode = mode) {
    if (nextMode === 'none') return value;
    return convertKana(value, { mode: nextMode });
  }

  function prefLen(value: string, cursor: number, nextMode: typeof mode = mode) {
    return convertAll(value.slice(0, cursor), nextMode).length;
  }

  function applyConversion(value: string, nextMode: typeof mode = mode) {
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

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const nativeEvent = e.nativeEvent as InputEvent | undefined;
    const isComposing = nativeEvent?.isComposing || isComposingRef.current;
    if (isComposing) {
      setText(value);
      return;
    }
    if (isComposingRef.current) isComposingRef.current = false;
    applyConversion(value);
  }

  function handleModeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextMode = e.target.value as typeof mode;
    setMode(nextMode);
    const current = inputRef.current?.value ?? text;
    applyConversion(current, nextMode);
  }

  function handleCompositionStart() {
    isComposingRef.current = true;
  }

  function handleCompositionEnd(e: React.CompositionEvent<HTMLTextAreaElement>) {
    isComposingRef.current = false;
    applyConversion(e.currentTarget.value);
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
    <div className="page page-romaji">
      <header className="app-header">
        <div className="app-shell header-row">
          <div className="brand">
            <p className="eyebrow">Romaji → Kana</p>
            <h1>Inline IME conversion</h1>
            <p className="sub">Type romaji and convert to hiragana or katakana with suggestions.</p>
          </div>
          <Nav />
        </div>
      </header>

      <main className="app-shell">
        <div className="card">
          <div className="toolbar">
            <label className="control">
              <span className="control-label">Mode</span>
              <select value={mode} onChange={handleModeChange} aria-label="Conversion mode">
                <option value="hiragana">Hiragana</option>
                <option value="katakana">Katakana</option>
                <option value="none">None</option>
              </select>
            </label>

            <button className="btn primary" onClick={initTts} disabled={ttsStatus === 'unsupported' || ttsReady}>
              {ttsReady ? 'Speech Ready ✓' : 'Enable Speech'}
            </button>

            <button className="btn" onClick={() => speak(text)} disabled={!ttsReady || !text.trim()}>
              Speak
            </button>

            <label className="control">
              <span className="control-label">Voice</span>
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
            </label>
          </div>

          <div className="status">{ttsLabel}</div>

          <textarea
            ref={inputRef}
            id="input"
            className="input input-lg"
            placeholder="Type romaji here..."
            value={text}
            onChange={handleInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onPaste={handlePaste}
            onBlur={handleBlur}
          />

          <p className="hint">
            Tips: double consonants → っ, 'n' before non-vowel → ん, digraphs like sha/kyo/chu supported.
          </p>
        </div>
      </main>
    </div>
  );
}
