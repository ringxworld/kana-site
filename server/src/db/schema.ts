import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const sentences = sqliteTable('sentences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  japanese: text('japanese').notNull(),
  english: text('english').default(''),
  source: text('source').default(''),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export type SentenceRow = typeof sentences.$inferSelect;
export type NewSentence = typeof sentences.$inferInsert;

// ─── Flashcard SRS ────────────────────────────────────────────────────────────

export const decks = sqliteTable('decks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').default(''),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export type DeckRow = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;

export const cards = sqliteTable('cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deckId: integer('deck_id')
    .notNull()
    .references(() => decks.id, { onDelete: 'cascade' }),
  front: text('front').notNull(),
  back: text('back').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  translationModel: text('translation_model'),
  furiganaSource: text('furigana_source'),
  enrichedAt: integer('enriched_at'),
  // Anki note metadata — null for manually-created cards
  noteType: text('note_type'),
  tags: text('tags'),         // JSON string: string[]
  extraFields: text('extra_fields'), // JSON string: Record<string, string> — all named fields with raw HTML
});

export type CardRow = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;

export const cardScheduling = sqliteTable('card_scheduling', {
  cardId: integer('card_id')
    .primaryKey()
    .references(() => cards.id, { onDelete: 'cascade' }),
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  elapsedDays: integer('elapsed_days').notNull().default(0),
  scheduledDays: integer('scheduled_days').notNull().default(0),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  state: text('state').notNull().default('new'),
  dueAt: integer('due_at').notNull().default(0),
  lastReviewAt: integer('last_review_at'),
});

export type CardSchedulingRow = typeof cardScheduling.$inferSelect;

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardId: integer('card_id')
    .notNull()
    .references(() => cards.id),
  rating: integer('rating').notNull(),
  state: text('state').notNull(),
  dueAt: integer('due_at').notNull(),
  reviewedAt: integer('reviewed_at').notNull(),
  scheduledDays: integer('scheduled_days').notNull(),
});

export type ReviewRow = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
