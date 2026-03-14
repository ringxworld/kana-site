import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
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
