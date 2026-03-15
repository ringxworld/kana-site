import { eq } from 'drizzle-orm';
import { getDb, getRawDb } from '../db/client';
import { decks, cards, cardScheduling } from '../db/schema';
import { newFsrsState } from './fsrsService';
import type { Deck, Card, CreateDeckRequest, CreateCardRequest } from '../routes/types';

// ─── Row mappers ──────────────────────────────────────────────────────────────

export function toDeck(row: typeof decks.$inferSelect): Deck {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    createdAt: row.createdAt,
  };
}

export function toCard(
  row: Pick<typeof cards.$inferSelect, 'id' | 'deckId' | 'front' | 'back' | 'createdAt' | 'noteType' | 'tags' | 'extraFields'>
): Card {
  return {
    id: row.id,
    deckId: row.deckId,
    front: row.front,
    back: row.back,
    createdAt: row.createdAt,
    noteType: row.noteType ?? null,
    tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
    extraFields: row.extraFields ? (JSON.parse(row.extraFields) as Record<string, string>) : {},
  };
}

// ─── Deck CRUD ────────────────────────────────────────────────────────────────

export function listDecks(): Deck[] {
  return getDb().select().from(decks).orderBy(decks.createdAt).all().map(toDeck);
}

export function createDeck({ name, description = '' }: CreateDeckRequest): Deck {
  const inserted = getDb()
    .insert(decks)
    .values({ name, description, createdAt: Math.floor(Date.now() / 1000) })
    .returning()
    .get();
  return toDeck(inserted);
}

export function deleteDeck(id: number): void {
  getDb().delete(decks).where(eq(decks.id, id)).run();
}

// ─── Card CRUD ────────────────────────────────────────────────────────────────

export function listCards(
  deckId: number,
  limit = 50,
  offset = 0
): { cards: Card[]; total: number } {
  const rawDb = getRawDb();
  const total = (
    rawDb.prepare('SELECT COUNT(*) as n FROM cards WHERE deck_id = ?').get(deckId) as { n: number }
  ).n;
  const rows = rawDb
    .prepare(
      'SELECT id, deck_id, front, back, created_at, note_type, tags, extra_fields FROM cards WHERE deck_id = ? ORDER BY id LIMIT ? OFFSET ?'
    )
    .all(deckId, limit, offset) as Array<{
    id: number;
    deck_id: number;
    front: string;
    back: string;
    created_at: number;
    note_type: string | null;
    tags: string | null;
    extra_fields: string | null;
  }>;
  return {
    cards: rows.map((r) => ({
      id: r.id,
      deckId: r.deck_id,
      front: r.front,
      back: r.back,
      createdAt: r.created_at,
      noteType: r.note_type ?? null,
      tags: r.tags ? (JSON.parse(r.tags) as string[]) : [],
      extraFields: r.extra_fields ? (JSON.parse(r.extra_fields) as Record<string, string>) : {},
    })),
    total,
  };
}

export function createCard(
  deckId: number,
  { front, back, noteType, tags, extraFields }: CreateCardRequest,
): Card {
  const db = getDb();
  const card = db
    .insert(cards)
    .values({
      deckId,
      front,
      back,
      createdAt: Math.floor(Date.now() / 1000),
      noteType: noteType ?? null,
      tags: tags ? JSON.stringify(tags) : null,
      extraFields: extraFields ? JSON.stringify(extraFields) : null,
    })
    .returning()
    .get();
  const fsrs = newFsrsState(Date.now());
  db.insert(cardScheduling)
    .values({
      cardId: card.id,
      stability: fsrs.stability,
      difficulty: fsrs.difficulty,
      elapsedDays: fsrs.elapsedDays,
      scheduledDays: fsrs.scheduledDays,
      reps: fsrs.reps,
      lapses: fsrs.lapses,
      state: fsrs.state,
      dueAt: fsrs.dueAt,
      lastReviewAt: fsrs.lastReviewAt,
    })
    .run();
  return toCard(card);
}

export function deleteCard(id: number): void {
  getDb().delete(cards).where(eq(cards.id, id)).run();
}

// ─── Bulk import (used by text + anki import) ─────────────────────────────────

export function importCards(deckId: number, cards: CreateCardRequest[]): number {
  let imported = 0;
  for (const card of cards) {
    if (!card.front.trim()) continue;
    try {
      createCard(deckId, { ...card, front: card.front.trim(), back: card.back.trim() });
      imported++;
    } catch {
      // skip duplicates or constraint violations
    }
  }
  return imported;
}
