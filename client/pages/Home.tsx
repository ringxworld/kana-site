import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav';

export default function Home() {
  useEffect(() => {
    document.body.classList.add('page-tools');
    return () => document.body.classList.remove('page-tools');
  }, []);

  return (
    <div className="page page-tools">
      <header className="app-header">
        <div className="app-shell header-row">
          <div className="brand">
            <p className="eyebrow">Kana Site</p>
            <h1>Japanese typing tools</h1>
            <p className="sub">
              Pick a tool to start practicing conversion, reading, or pronunciation.
            </p>
          </div>
          <Nav />
        </div>
      </header>

      <main className="app-shell">
        <section className="tool-grid">
          <Link className="tool-card" to="/romaji">
            <div className="tool-card-header">
              <h2>Romaji → Kana</h2>
              <span className="tag">IME</span>
            </div>
            <p>Inline conversion with kanji suggestions and text-to-speech.</p>
            <span className="tool-cta">Open tool</span>
          </Link>

          <Link className="tool-card" to="/reader">
            <div className="tool-card-header">
              <h2>Furigana Reader</h2>
              <span className="tag">Reader</span>
            </div>
            <p>Paste paired JP/EN lines, render furigana, and reveal translations per sentence.</p>
            <span className="tool-cta">Open tool</span>
          </Link>

          <Link className="tool-card" to="/demo/decks">
            <div className="tool-card-header">
              <h2>Flashcards</h2>
              <span className="tag tag-demo">Demo</span>
            </div>
            <p>FSRS spaced-repetition flashcards — try the demo deck of basic Japanese phrases.</p>
            <span className="tool-cta">Open demo</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
