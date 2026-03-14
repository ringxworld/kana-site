import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCardStore } from '../lib/cardStore';
import type { CardWithSchedule } from '../types/api';
import '../styles/review.css';

type Phase = 'loading' | 'question' | 'answer' | 'done';

const RATING_LABELS: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

export default function Review() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const store = useCardStore();

  const [phase, setPhase] = useState<Phase>('loading');
  const [card, setCard] = useState<CardWithSchedule | null>(null);
  const [reviewed, setReviewed] = useState(0);

  const loadNext = useCallback(async () => {
    setPhase('loading');
    const next = await store.nextDue(Number(deckId));
    if (!next) {
      setPhase('done');
    } else {
      setCard(next);
      setPhase('question');
    }
  }, [store, deckId]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === 'question' && e.key === ' ') {
        e.preventDefault();
        setPhase('answer');
      }
      if (phase === 'answer') {
        const n = Number(e.key);
        if (n >= 1 && n <= 4) {
          void handleRate(n as 1 | 2 | 3 | 4);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, card]);

  async function handleRate(rating: 1 | 2 | 3 | 4) {
    if (!card) return;
    await store.submitReview(Number(deckId), card.id, rating);
    setReviewed((n) => n + 1);
    await loadNext();
  }

  return (
    <main className="review-page">
      <button className="review-back" onClick={() => navigate('/decks')}>
        &larr; Decks
      </button>

      <div className="review-progress">Reviewed this session: {reviewed}</div>

      {phase === 'loading' && <p className="review-status">Loading...</p>}

      {phase === 'done' && (
        <div className="review-done">
          <h2>All done!</h2>
          <p>You reviewed {reviewed} cards this session.</p>
          <button className="btn-primary" onClick={() => navigate('/decks')}>
            Back to decks
          </button>
        </div>
      )}

      {(phase === 'question' || phase === 'answer') && card && (
        <div className="review-card">
          <div className="review-front">{card.front}</div>

          {phase === 'question' && (
            <button className="btn-secondary review-flip" onClick={() => setPhase('answer')}>
              Show answer <span className="key-hint">[Space]</span>
            </button>
          )}

          {phase === 'answer' && (
            <>
              <div className="review-back">{card.back}</div>
              <div className="review-ratings">
                {([1, 2, 3, 4] as const).map((r) => (
                  <button
                    key={r}
                    className={`rating-btn rating-${r}`}
                    onClick={() => handleRate(r)}
                  >
                    <span className="rating-label">{RATING_LABELS[r]}</span>
                    <span className="key-hint">[{r}]</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="review-meta">
            State: {card.scheduling.state} &middot; Reps: {card.scheduling.reps}
          </div>
        </div>
      )}
    </main>
  );
}
