import React from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../../components/Nav';
import { DEMO_DECK, DEMO_CARDS } from '../../lib/demoData';
import '../../styles/decks.css';

export default function DemoDecks() {
  const navigate = useNavigate();
  const total = DEMO_CARDS.length;

  return (
    <main className="decks-page">
      <Nav />
      <p className="demo-banner">Demo — data is not saved</p>

      <header className="decks-header">
        <h1>Flashcard Decks</h1>
      </header>

      <ul className="deck-list">
        <li className="deck-card">
          <div className="deck-info">
            <strong>{DEMO_DECK.name}</strong>
            {DEMO_DECK.description && <span className="deck-desc">{DEMO_DECK.description}</span>}
            <span className="deck-stats">
              {total} cards &middot; {total} due
            </span>
          </div>
          <div className="deck-actions">
            <button className="btn-primary" onClick={() => navigate('/demo/decks/1/review')}>
              Review
            </button>
            <button className="btn-secondary" onClick={() => navigate('/demo/decks/1/browse')}>
              Browse
            </button>
          </div>
        </li>
      </ul>
    </main>
  );
}
