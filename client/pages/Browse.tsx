import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCardStore } from '../lib/cardStore';
import type { Card } from '../types/api';
import '../styles/browse.css';

const PAGE_SIZE = 50;

export default function Browse() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const store = useCardStore();

  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  async function load(off = offset) {
    const result = await store.listCards(Number(deckId), PAGE_SIZE, off);
    setCards(result.cards);
    setTotal(result.total);
    setOffset(off);
  }

  useEffect(() => { void load(0); }, [deckId]);

  const filtered = search
    ? cards.filter(
        (c) =>
          c.front.includes(search) ||
          c.back.toLowerCase().includes(search.toLowerCase()),
      )
    : cards;

  async function handleDelete(cardId: number) {
    if (!confirm('Delete this card?')) return;
    await store.deleteCard(Number(deckId), cardId);
    await load(offset);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    await store.addCard(Number(deckId), newFront.trim(), newBack.trim());
    setNewFront('');
    setNewBack('');
    setShowAdd(false);
    await load(offset);
  }

  return (
    <main className="browse-page">
      <header className="browse-header">
        <button className="browse-back" onClick={() => navigate('/decks')}>
          &larr; Decks
        </button>
        <h1>Browse cards</h1>
        <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Cancel' : '+ Add card'}
        </button>
      </header>

      {showAdd && (
        <form className="browse-add-form" onSubmit={handleAdd}>
          <input
            value={newFront}
            onChange={(e) => setNewFront(e.target.value)}
            placeholder="Front (Japanese)"
            required
          />
          <input
            value={newBack}
            onChange={(e) => setNewBack(e.target.value)}
            placeholder="Back (English / reading)"
            required
          />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      )}

      <input
        className="browse-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cards..."
      />

      <p className="browse-count">
        {total} card{total !== 1 ? 's' : ''} total
        {search && ` (${filtered.length} matching)`}
      </p>

      <table className="browse-table">
        <thead>
          <tr>
            <th>Front</th>
            <th>Back</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.id}>
              <td className="card-front">{c.front}</td>
              <td className="card-back">{c.back}</td>
              <td>
                <button className="btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="browse-pagination">
        <button
          className="btn-secondary"
          disabled={offset === 0}
          onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
        >
          Previous
        </button>
        <span>
          {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
        </span>
        <button
          className="btn-secondary"
          disabled={offset + PAGE_SIZE >= total}
          onClick={() => load(offset + PAGE_SIZE)}
        >
          Next
        </button>
      </div>
    </main>
  );
}
