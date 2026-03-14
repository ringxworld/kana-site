import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardStore } from '../lib/cardStore';
import { parsePairs } from '../lib/reader';
import type { Deck, DeckStats } from '../types/api';
import '../styles/decks.css';

interface DeckEntry {
  deck: Deck;
  stats: DeckStats | null;
}

export default function Decks() {
  const store = useCardStore();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<DeckEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [importText, setImportText] = useState('');
  const [importDeckId, setImportDeckId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const apkgRef = useRef<HTMLInputElement>(null);

  async function load() {
    const decks = await store.listDecks();
    const withStats = await Promise.all(
      decks.map(async (deck) => ({
        deck,
        stats: await store.deckStats(deck.id).catch(() => null),
      })),
    );
    setEntries(withStats);
  }

  useEffect(() => { void load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await store.createDeck(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this deck and all its cards?')) return;
    await store.deleteDeck(id);
    await load();
  }

  async function handleTextImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importDeckId || !importText.trim()) return;
    const pairs = parsePairs(importText).map((p) => ({ front: p.jp, back: p.en }));
    const count = await store.importPairs(importDeckId, pairs);
    setStatus(`Imported ${count} cards.`);
    setImportText('');
    setImportDeckId(null);
    await load();
  }

  async function handleApkgImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const deckName = file.name.replace(/\.apkg$/i, '').trim() || 'Imported';
    const deck = await store.createDeck(deckName);
    const buf = await file.arrayBuffer();

    // Dynamic imports so sql.js WASM and fflate only load when needed
    const [fflateModule, { default: initSqlJs }] = await Promise.all([
      import('fflate'),
      import('sql.js'),
    ]);

    const bytes = new Uint8Array(buf);
    const unzipped = fflateModule.unzipSync(bytes);
    const dbBytes = unzipped['collection.anki2'] ?? unzipped['collection.anki21'];
    if (!dbBytes) {
      setStatus('Invalid .apkg: collection.anki2 not found.');
      return;
    }

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBytes);
    const result = db.exec('SELECT flds FROM notes');
    db.close();

    const pairs = (result[0]?.values ?? []).flatMap((row: (string | number | null | Uint8Array)[]) => {
      const flds = row[0] as string;
      const fields = flds.split('\x1f');
      const front = fields[0]?.trim() ?? '';
      const back = fields[1]?.trim() ?? '';
      if (!front) return [];
      return [{ front, back }];
    });

    const count = await store.importPairs(deck.id, pairs);
    setStatus(`Imported ${count} cards from ${file.name}.`);
    if (apkgRef.current) apkgRef.current.value = '';
    await load();
  }

  return (
    <main className="decks-page">
      <header className="decks-header">
        <h1>Flashcard Decks</h1>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : '+ New deck'}
        </button>
      </header>

      {showCreate && (
        <form className="deck-create-form" onSubmit={handleCreate}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Deck name"
            required
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
          />
          <button type="submit" className="btn-primary">Create</button>
        </form>
      )}

      {status && <p className="deck-status">{status}</p>}

      {entries.length === 0 && (
        <p className="decks-empty">No decks yet. Create one or import an .apkg file.</p>
      )}

      <ul className="deck-list">
        {entries.map(({ deck, stats }) => (
          <li key={deck.id} className="deck-card">
            <div className="deck-info">
              <strong>{deck.name}</strong>
              {deck.description && <span className="deck-desc">{deck.description}</span>}
              {stats && (
                <span className="deck-stats">
                  {stats.total} cards &middot; {stats.due} due
                </span>
              )}
            </div>
            <div className="deck-actions">
              <button
                className="btn-primary"
                onClick={() => navigate(`/decks/${deck.id}/review`)}
                disabled={stats?.due === 0}
              >
                Review
              </button>
              <button
                className="btn-secondary"
                onClick={() => navigate(`/decks/${deck.id}/browse`)}
              >
                Browse
              </button>
              <button
                className="btn-secondary"
                onClick={() => setImportDeckId(deck.id)}
              >
                Import text
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deck.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {importDeckId !== null && (
        <div className="deck-import-overlay">
          <form className="deck-import-form" onSubmit={handleTextImport}>
            <h2>Import sentences into deck</h2>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              placeholder="Paste JP/EN paired lines here..."
            />
            <div className="import-actions">
              <button type="submit" className="btn-primary">Import</button>
              <button type="button" className="btn-secondary" onClick={() => setImportDeckId(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="apkg-import">
        <h2>Import Anki deck (.apkg)</h2>
        <input
          ref={apkgRef}
          type="file"
          accept=".apkg"
          onChange={handleApkgImport}
        />
      </section>
    </main>
  );
}
