import { eq } from 'drizzle-orm';
import { getDb, getRawDb } from '../db/client';
import { cards, cardScheduling, reviews } from '../db/schema';
import { scheduleCard, type Rating } from './fsrsService';
import type { CardWithSchedule, DeckStats, SubmitReviewRequest } from '../routes/types';

// ─── Next due card ────────────────────────────────────────────────────────────

type RawScheduledRow = {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  created_at: number;
  card_id: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: string;
  due_at: number;
  last_review_at: number | null;
};

export function nextDue(deckId: number): CardWithSchedule | null {
  const row = getRawDb()
    .prepare(
      `SELECT c.id, c.deck_id, c.front, c.back, c.created_at,
              s.card_id, s.stability, s.difficulty, s.elapsed_days,
              s.scheduled_days, s.reps, s.lapses, s.state, s.due_at, s.last_review_at
       FROM cards c
       JOIN card_scheduling s ON s.card_id = c.id
       WHERE c.deck_id = ? AND s.due_at <= ?
       ORDER BY s.due_at ASC LIMIT 1`
    )
    .get(deckId, Date.now()) as RawScheduledRow | undefined;

  if (!row) return null;
  return rowToCardWithSchedule(row);
}

function rowToCardWithSchedule(r: RawScheduledRow): CardWithSchedule {
  return {
    id: r.id,
    deckId: r.deck_id,
    front: r.front,
    back: r.back,
    createdAt: r.created_at,
    scheduling: {
      cardId: r.card_id,
      stability: r.stability,
      difficulty: r.difficulty,
      elapsedDays: r.elapsed_days,
      scheduledDays: r.scheduled_days,
      reps: r.reps,
      lapses: r.lapses,
      state: r.state as CardWithSchedule['scheduling']['state'],
      dueAt: r.due_at,
      lastReviewAt: r.last_review_at,
    },
  };
}

// ─── Submit review ────────────────────────────────────────────────────────────

export function submitReview({ cardId, rating }: SubmitReviewRequest): CardWithSchedule {
  const db = getDb();
  const now = Date.now();
  const sched = db.select().from(cardScheduling).where(eq(cardScheduling.cardId, cardId)).get();
  if (!sched) throw new Error(`No scheduling row for card ${cardId}`);

  const current = {
    stability: sched.stability,
    difficulty: sched.difficulty,
    elapsedDays: sched.elapsedDays,
    scheduledDays: sched.scheduledDays,
    reps: sched.reps,
    lapses: sched.lapses,
    state: sched.state as 'new' | 'learning' | 'review' | 'relearning',
    dueAt: sched.dueAt,
    lastReviewAt: sched.lastReviewAt,
  };

  const next = scheduleCard(current, rating as Rating, now);

  db.update(cardScheduling)
    .set({
      stability: next.stability,
      difficulty: next.difficulty,
      elapsedDays: Math.round(next.elapsedDays),
      scheduledDays: next.scheduledDays,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      dueAt: next.dueAt,
      lastReviewAt: next.lastReviewAt,
    })
    .where(eq(cardScheduling.cardId, cardId))
    .run();

  db.insert(reviews)
    .values({
      cardId,
      rating,
      state: current.state,
      dueAt: current.dueAt,
      reviewedAt: now,
      scheduledDays: next.scheduledDays,
    })
    .run();

  const card = db.select().from(cards).where(eq(cards.id, cardId)).get()!;
  return {
    id: card.id,
    deckId: card.deckId,
    front: card.front,
    back: card.back,
    createdAt: card.createdAt,
    scheduling: {
      cardId,
      stability: next.stability,
      difficulty: next.difficulty,
      elapsedDays: Math.round(next.elapsedDays),
      scheduledDays: next.scheduledDays,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      dueAt: next.dueAt,
      lastReviewAt: next.lastReviewAt,
    },
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function deckStats(deckId: number): DeckStats {
  const rawDb = getRawDb();
  const now = Date.now();
  const total = (
    rawDb.prepare('SELECT COUNT(*) as n FROM cards WHERE deck_id = ?').get(deckId) as { n: number }
  ).n;
  const due = (
    rawDb
      .prepare(
        'SELECT COUNT(*) as n FROM cards c JOIN card_scheduling s ON s.card_id = c.id WHERE c.deck_id = ? AND s.due_at <= ?'
      )
      .get(deckId, now) as { n: number }
  ).n;
  const counts = rawDb
    .prepare(
      'SELECT s.state, COUNT(*) as n FROM cards c JOIN card_scheduling s ON s.card_id = c.id WHERE c.deck_id = ? GROUP BY s.state'
    )
    .all(deckId) as Array<{ state: string; n: number }>;
  const byState = Object.fromEntries(counts.map((r) => [r.state, r.n]));
  return {
    total,
    due,
    newCount: byState['new'] ?? 0,
    learning: (byState['learning'] ?? 0) + (byState['relearning'] ?? 0),
    review: byState['review'] ?? 0,
  };
}
