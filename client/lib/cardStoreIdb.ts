/**
 * IndexedDB-backed CardStore implementation (offline mode).
 *
 * Uses the `idb` library for typed IndexedDB access.
 * FSRS scheduling runs entirely in-browser via client/lib/fsrs.ts.
 * No server imports allowed in this file.
 */

import { openDB, type IDBPDatabase } from 'idb';
import { scheduleCard, newFsrsState, type FsrsState } from './fsrs';
import type { CardStore } from './cardStore';
import type { Card, CardWithSchedule, Deck } from '../types/api';

interface IdbDeck {
  id?: number;
  name: string;
  description: string;
  createdAt: number;
}

interface IdbCard {
  id?: number;
  deckId: number;
  front: string;
  back: string;
  createdAt: number;
}

interface IdbScheduling extends FsrsState {
  cardId: number;
}

const DB_NAME = 'kotoba-flashcards';
const DB_VERSION = 1;

async function openKanaDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const deckStore = db.createObjectStore('decks', { keyPath: 'id', autoIncrement: true });
      deckStore.createIndex('createdAt', 'createdAt');

      const cardStore = db.createObjectStore('cards', { keyPath: 'id', autoIncrement: true });
      cardStore.createIndex('deckId', 'deckId');

      db.createObjectStore('scheduling', { keyPath: 'cardId' });

      const reviewStore = db.createObjectStore('reviews', { keyPath: 'id', autoIncrement: true });
      reviewStore.createIndex('cardId', 'cardId');
    },
  });
}

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (!_db) _db = await openKanaDb();
  return _db;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function toDeck(row: IdbDeck & { id: number }): Deck {
  return { id: row.id, name: row.name, description: row.description, createdAt: row.createdAt };
}

function toCard(row: IdbCard & { id: number }): Card {
  return {
    id: row.id,
    deckId: row.deckId,
    front: row.front,
    back: row.back,
    createdAt: row.createdAt,
  };
}

function toCardWithSchedule(card: Card, sched: IdbScheduling): CardWithSchedule {
  return {
    ...card,
    scheduling: {
      cardId: sched.cardId,
      stability: sched.stability,
      difficulty: sched.difficulty,
      elapsedDays: sched.elapsedDays,
      scheduledDays: sched.scheduledDays,
      reps: sched.reps,
      lapses: sched.lapses,
      state: sched.state,
      dueAt: sched.dueAt,
      lastReviewAt: sched.lastReviewAt,
    },
  };
}

// ─── Store implementation ─────────────────────────────────────────────────────

export function createIdbCardStore(): CardStore {
  return {
    async listDecks() {
      const db = await getDb();
      const rows = (await db.getAll('decks')) as Array<IdbDeck & { id: number }>;
      return rows.sort((a, b) => a.createdAt - b.createdAt).map(toDeck);
    },

    async createDeck(name, description = '') {
      const db = await getDb();
      const now = Date.now();
      const id = await db.add('decks', { name, description, createdAt: now });
      return { id: id as number, name, description, createdAt: now };
    },

    async deleteDeck(id) {
      const db = await getDb();
      const tx = db.transaction(['decks', 'cards', 'scheduling', 'reviews'], 'readwrite');
      const cardIds = (await tx.objectStore('cards').index('deckId').getAllKeys(id)) as number[];
      for (const cid of cardIds) {
        await tx.objectStore('scheduling').delete(cid);
        const reviewKeys = await tx.objectStore('reviews').index('cardId').getAllKeys(cid);
        for (const rk of reviewKeys) await tx.objectStore('reviews').delete(rk);
        await tx.objectStore('cards').delete(cid);
      }
      await tx.objectStore('decks').delete(id);
      await tx.done;
    },

    async listCards(deckId, limit = 50, offset = 0) {
      const db = await getDb();
      const all = (await db.getAllFromIndex('cards', 'deckId', deckId)) as Array<
        IdbCard & { id: number }
      >;
      const sorted = all.sort((a, b) => a.id - b.id);
      return { cards: sorted.slice(offset, offset + limit).map(toCard), total: sorted.length };
    },

    async addCard(deckId, front, back) {
      const db = await getDb();
      const now = Date.now();
      const id = await db.add('cards', { deckId, front, back, createdAt: now });
      const cardId = id as number;
      const fsrsInit = newFsrsState(now);
      await db.put('scheduling', { cardId, ...fsrsInit });
      return { id: cardId, deckId, front, back, createdAt: now };
    },

    async deleteCard(_deckId, cardId) {
      const db = await getDb();
      const tx = db.transaction(['cards', 'scheduling', 'reviews'], 'readwrite');
      await tx.objectStore('scheduling').delete(cardId);
      const reviewKeys = await tx.objectStore('reviews').index('cardId').getAllKeys(cardId);
      for (const rk of reviewKeys) await tx.objectStore('reviews').delete(rk);
      await tx.objectStore('cards').delete(cardId);
      await tx.done;
    },

    async nextDue(deckId) {
      const db = await getDb();
      const now = Date.now();
      const cardIds = (await db.getAllKeysFromIndex('cards', 'deckId', deckId)) as number[];
      let earliest: CardWithSchedule | null = null;
      for (const cid of cardIds) {
        const sched = (await db.get('scheduling', cid)) as IdbScheduling | undefined;
        if (!sched || sched.dueAt > now) continue;
        if (!earliest || sched.dueAt < earliest.scheduling.dueAt) {
          const card = (await db.get('cards', cid)) as (IdbCard & { id: number }) | undefined;
          if (card) earliest = toCardWithSchedule(toCard(card), sched);
        }
      }
      return earliest;
    },

    async submitReview(_deckId, cardId, rating) {
      const db = await getDb();
      const now = Date.now();
      const sched = (await db.get('scheduling', cardId)) as IdbScheduling | undefined;
      if (!sched) throw new Error(`No scheduling for card ${cardId}`);

      const next = scheduleCard(sched, rating, now);
      const nextSched: IdbScheduling = { cardId, ...next };
      await db.put('scheduling', nextSched);
      await db.add('reviews', {
        cardId,
        rating,
        state: sched.state,
        dueAt: sched.dueAt,
        reviewedAt: now,
        scheduledDays: next.scheduledDays,
      });

      const card = (await db.get('cards', cardId)) as IdbCard & { id: number };
      return toCardWithSchedule(toCard(card), nextSched);
    },

    async importPairs(deckId, pairs) {
      let count = 0;
      for (const { front, back } of pairs) {
        if (!front.trim()) continue;
        try {
          await this.addCard(deckId, front.trim(), back.trim());
          count++;
        } catch {
          // skip
        }
      }
      return count;
    },

    async deckStats(deckId) {
      const db = await getDb();
      const now = Date.now();
      const cardIds = (await db.getAllKeysFromIndex('cards', 'deckId', deckId)) as number[];
      let due = 0;
      const stateCounts: Record<string, number> = {};
      for (const cid of cardIds) {
        const sched = (await db.get('scheduling', cid)) as IdbScheduling | undefined;
        if (!sched) continue;
        stateCounts[sched.state] = (stateCounts[sched.state] ?? 0) + 1;
        if (sched.dueAt <= now) due++;
      }
      return {
        total: cardIds.length,
        due,
        newCount: stateCounts['new'] ?? 0,
        learning: (stateCounts['learning'] ?? 0) + (stateCounts['relearning'] ?? 0),
        review: stateCounts['review'] ?? 0,
      };
    },
  };
}
