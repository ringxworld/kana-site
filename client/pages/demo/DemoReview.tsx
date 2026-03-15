import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_CARDS } from '../../lib/demoData';
import type { CardWithSchedule } from '../../types/api';
import '../../styles/review.css';

type Phase = 'question' | 'answer' | 'done';

const RATING_LABELS: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

export default function DemoReview() {
  const navigate = useNavigate();

  const [queue, setQueue] = useState<CardWithSchedule[]>([...DEMO_CARDS]);
  const [card, setCard] = useState<CardWithSchedule | null>(DEMO_CARDS[0] ?? null);
  const [phase, setPhase] = useState<Phase>(DEMO_CARDS.length > 0 ? 'question' : 'done');
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === 'question' && e.key === ' ') {
        e.preventDefault();
        setPhase('answer');
      }
      if (phase === 'answer') {
        const n = Number(e.key);
        if (n >= 1 && n <= 4) advance();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, queue]);

  function advance() {
    const next = queue.slice(1);
    setQueue(next);
    setReviewed((n) => n + 1);
    if (next.length === 0) {
      setPhase('done');
    } else {
      setCard(next[0]);
      setPhase('question');
    }
  }

  function restart() {
    setQueue([...DEMO_CARDS]);
    setCard(DEMO_CARDS[0] ?? null);
    setPhase(DEMO_CARDS.length > 0 ? 'question' : 'done');
    setReviewed(0);
  }

  return (
    <main className="review-page">
      <button className="review-back" onClick={() => navigate('/demo/decks')}>
        &larr; Demo decks
      </button>

      <p className="demo-banner">Demo — ratings are not saved</p>

      <div className="review-progress">Reviewed this session: {reviewed}</div>

      {phase === 'done' && (
        <div className="review-done">
          <h2>All done! (demo)</h2>
          <p>You reviewed {reviewed} cards.</p>
          <button className="btn-primary" onClick={restart}>
            Restart demo
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
                  <button key={r} className={`rating-btn rating-${r}`} onClick={advance}>
                    <span className="rating-label">{RATING_LABELS[r]}</span>
                    <span className="key-hint">[{r}]</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="review-meta">
            Card {reviewed + 1} of {DEMO_CARDS.length}
          </div>
        </div>
      )}
    </main>
  );
}
