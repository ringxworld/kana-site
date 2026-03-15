import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_DECK, DEMO_CARDS } from '../../lib/demoData';
import '../../styles/browse.css';

export default function DemoBrowse() {
  const navigate = useNavigate();

  return (
    <main className="browse-page">
      <button className="browse-back" onClick={() => navigate('/demo/decks')}>
        &larr; Demo decks
      </button>

      <p className="demo-banner">Demo — read-only</p>

      <header className="browse-header">
        <h1>{DEMO_DECK.name}</h1>
        <span className="browse-count">{DEMO_CARDS.length} cards</span>
      </header>

      <table className="card-table">
        <thead>
          <tr>
            <th>Front</th>
            <th>Back</th>
          </tr>
        </thead>
        <tbody>
          {DEMO_CARDS.map((card) => (
            <tr key={card.id}>
              <td className="card-front">{card.front}</td>
              <td className="card-back">{card.back}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
