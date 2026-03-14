import { eq, and, lte, sql } from 'drizzle-orm';
import { getDb, getRawDb } from '../db/client';
import { decks, cards, cardScheduling, reviews } from '../db/schema';
import { scheduleCard, newFsrsState, type Rating } from './fsrsService';
import type {
  Deck,
  Card,
  CardWithSchedule,
  DeckStats,
  CreateDeckRequest,
  CreateCardRequest,
  SubmitReviewRequest,
} from '../routes/types';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function toDeck(row: typeof decks.$inferSelect): Deck {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    createdAt: row.createdAt,
  };
}

function toCard(row: typeof cards.$inferSelect): Card {
  return {
    id: row.id,
    deckId: row.deckId,
    front: row.front,
    back: row.back,
    createdAt: row.createdAt,
  };
}

// ─── Deck CRUD ────────────────────────────────────────────────────────────────

export function listDecks(): Deck[] {
  const db = getDb();
  return db.select().from(decks).orderBy(decks.createdAt).all().map(toDeck);
}

export function createDeck({ name, description = '' }: CreateDeckRequest): Deck {
  const db = getDb();
  const now = Date.now();
  const inserted = db
    .insert(decks)
    .values({ name, description, createdAt: Math.floor(now / 1000) })
    .returning()
    .get();
  return toDeck(inserted);
}

export function deleteDeck(id: number): void {
  const db = getDb();
  db.delete(decks).where(eq(decks.id, id)).run();
}

// ─── Card CRUD ────────────────────────────────────────────────────────────────

export function listCards(deckId: number, limit = 50, offset = 0): { cards: Card[]; total: number } {
  const rawDb = getRawDb();
  const total = (
    rawDb.prepare('SELECT COUNT(*) as n FROM cards WHERE deck_id = ?').get(deckId) as { n: number }
  ).n;
  const rows = rawDb
    .prepare(
      'SELECT id, deck_id, front, back, created_at FROM cards WHERE deck_id = ? ORDER BY id LIMIT ? OFFSET ?',
    )
    .all(deckId, limit, offset) as Array<{
    id: number;
    deck_id: number;
    front: string;
    back: string;
    created_at: number;
  }>;
  return {
    cards: rows.map((r) => ({
      id: r.id,
      deckId: r.deck_id,
      front: r.front,
      back: r.back,
      createdAt: r.created_at,
    })),
    total,
  };
}

export function createCard(deckId: number, { front, back }: CreateCardRequest): Card {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const card = db
    .insert(cards)
    .values({ deckId, front, back, createdAt: now })
    .returning()
    .get();

  // Initialise scheduling row (state = 'new')
  const fsrsInit = newFsrsState(Date.now());
  db.insert(cardScheduling)
    .values({
      cardId: card.id,
      stability: fsrsInit.stability,
      difficulty: fsrsInit.difficulty,
      elapsedDays: fsrsInit.elapsedDays,
      scheduledDays: fsrsInit.scheduledDays,
      reps: fsrsInit.reps,
      lapses: fsrsInit.lapses,
      state: fsrsInit.state,
      dueAt: fsrsInit.dueAt,
      lastReviewAt: fsrsInit.lastReviewAt,
    })
    .run();

  return toCard(card);
}

export function deleteCard(id: number): void {
  const db = getDb();
  db.delete(cards).where(eq(cards.id, id)).run();
}

// ─── Review ───────────────────────────────────────────────────────────────────

export function nextDue(deckId: number): CardWithSchedule | null {
  const rawDb = getRawDb();
  const now = Date.now();
  const row = rawDb
    .prepare(
      `SELECT c.id, c.deck_id, c.front, c.back, c.created_at,
              s.card_id, s.stability, s.difficulty, s.elapsed_days,
              s.scheduled_days, s.reps, s.lapses, s.state, s.due_at, s.last_review_at
       FROM cards c
       JOIN card_scheduling s ON s.card_id = c.id
       WHERE c.deck_id = ? AND s.due_at <= ?
       ORDER BY s.due_at ASC
       LIMIT 1`,
    )
    .get(deckId, now) as
    | {
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
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    deckId: row.deck_id,
    front: row.front,
    back: row.back,
    createdAt: row.created_at,
    scheduling: {
      cardId: row.card_id,
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsed_days,
      scheduledDays: row.scheduled_days,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state as CardWithSchedule['scheduling']['state'],
      dueAt: row.due_at,
      lastReviewAt: row.last_review_at,
    },
  };
}

export function submitReview({ cardId, rating }: SubmitReviewRequest): CardWithSchedule {
  const db = getDb();
  const now = Date.now();

  const sched = db
    .select()
    .from(cardScheduling)
    .where(eq(cardScheduling.cardId, cardId))
    .get();

  if (!sched) throw new Error(`No scheduling row for card ${cardId}`);

  const currentState = {
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

  const next = scheduleCard(currentState, rating as Rating, now);

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
      state: currentState.state,
      dueAt: currentState.dueAt,
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
        `SELECT COUNT(*) as n FROM cards c
         JOIN card_scheduling s ON s.card_id = c.id
         WHERE c.deck_id = ? AND s.due_at <= ?`,
      )
      .get(deckId, now) as { n: number }
  ).n;

  const counts = rawDb
    .prepare(
      `SELECT s.state, COUNT(*) as n FROM cards c
       JOIN card_scheduling s ON s.card_id = c.id
       WHERE c.deck_id = ?
       GROUP BY s.state`,
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

// ─── Bulk import (used by text + anki import) ─────────────────────────────────

export function importCards(
  deckId: number,
  pairs: Array<{ front: string; back: string }>,
): number {
  let imported = 0;
  for (const { front, back } of pairs) {
    if (!front.trim()) continue;
    try {
      createCard(deckId, { front: front.trim(), back: back.trim() });
      imported++;
    } catch {
      // skip duplicates or constraint violations
    }
  }
  return imported;
}
