/** Shared request/response types for the kana-site API.
 *  Mirror this file manually in client/types/api.ts for the frontend.
 *  The frontend must never import from server/. */

export interface Sentence {
  id: number;
  japanese: string;
  english: string;
  source: string;
  createdAt: number;
}

export interface ListSentencesQuery {
  q?: string;       // full-text search query
  source?: string;  // filter by source filename
  limit?: number;   // default 50, max 200
  offset?: number;  // default 0
}

export interface ListSentencesResponse {
  sentences: Sentence[];
  total: number;
  offset: number;
  limit: number;
}

export interface ImportRequest {
  text: string;       // raw .txt content (JP/EN paired lines)
  source?: string;    // optional label (e.g. filename)
}

export interface ImportResponse {
  imported: number;   // number of sentences inserted
  skipped: number;    // duplicates or unparseable lines skipped
  source: string;
}

export interface ErrorResponse {
  error: string;
}

// ─── Flashcard SRS ────────────────────────────────────────────────────────────

export interface Deck {
  id: number;
  name: string;
  description: string;
  createdAt: number;
}

export interface Card {
  id: number;
  deckId: number;
  front: string;
  back: string;
  createdAt: number;
}

export interface CardScheduling {
  cardId: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  dueAt: number;
  lastReviewAt: number | null;
}

export interface CardWithSchedule extends Card {
  scheduling: CardScheduling;
}

export interface DeckStats {
  total: number;
  due: number;
  newCount: number;
  learning: number;
  review: number;
}

export interface CreateDeckRequest {
  name: string;
  description?: string;
}

export interface CreateCardRequest {
  front: string;
  back: string;
}

export interface SubmitReviewRequest {
  cardId: number;
  rating: 1 | 2 | 3 | 4;
}

export interface AnkiImportResponse {
  deckId: number;
  imported: number;
  skipped: number;
}

// ─── Sentence enrichment ──────────────────────────────────────────────────────

export interface EnrichRequest {
  text: string;
}

export interface EnrichResponse {
  original: string;
  furigana: string;          // HTML ruby string
  translation: string;
  translationModel: string;  // e.g. 'qwen2.5:3b'
  furiganaSource: string;    // e.g. 'kuroshiro'
}

export interface CaptureRequest {
  text: string;
  deckId: number;
}

export interface CaptureResponse extends EnrichResponse {
  card: Card;
}
