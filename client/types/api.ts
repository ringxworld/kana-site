/** API types mirrored from server/src/routes/types.ts.
 *  Keep in sync manually. Never import from server/. */

export interface Sentence {
  id: number;
  japanese: string;
  english: string;
  source: string;
  createdAt: number;
}

export interface ListSentencesQuery {
  q?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface ListSentencesResponse {
  sentences: Sentence[];
  total: number;
  offset: number;
  limit: number;
}

export interface ImportRequest {
  text: string;
  source?: string;
}

export interface ImportResponse {
  imported: number;
  skipped: number;
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
  noteType: string | null;
  tags: string[];
  extraFields: Record<string, string>;
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
  noteType?: string;
  tags?: string[];
  extraFields?: Record<string, string>;
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

export const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function apiImport(req: ImportRequest): Promise<ImportResponse> {
  const res = await fetch(`${API_BASE}/api/v1/sentences/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as ErrorResponse;
    throw new Error(err.error);
  }
  return res.json() as Promise<ImportResponse>;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as ErrorResponse;
    throw new Error(err.error);
  }
  return res.json() as Promise<T>;
}

// ─── Deck API helpers ─────────────────────────────────────────────────────────

export function apiListDecks(): Promise<Deck[]> {
  return apiJson(`${API_BASE}/api/v1/decks`);
}

export function apiCreateDeck(req: CreateDeckRequest): Promise<Deck> {
  return apiJson(`${API_BASE}/api/v1/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export function apiDeleteDeck(id: number): Promise<void> {
  return fetch(`${API_BASE}/api/v1/decks/${id}`, { method: 'DELETE' }).then(() => undefined);
}

export function apiListCards(
  deckId: number,
  limit = 50,
  offset = 0
): Promise<{ cards: Card[]; total: number }> {
  return apiJson(`${API_BASE}/api/v1/decks/${deckId}/cards?limit=${limit}&offset=${offset}`);
}

export function apiCreateCard(deckId: number, req: CreateCardRequest): Promise<Card> {
  return apiJson(`${API_BASE}/api/v1/decks/${deckId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export function apiDeleteCard(deckId: number, cardId: number): Promise<void> {
  return fetch(`${API_BASE}/api/v1/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' }).then(
    () => undefined
  );
}

export async function apiNextDue(deckId: number): Promise<CardWithSchedule | null> {
  const res = await fetch(`${API_BASE}/api/v1/decks/${deckId}/review`);
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<CardWithSchedule>;
}

export function apiSubmitReview(
  deckId: number,
  req: SubmitReviewRequest
): Promise<CardWithSchedule> {
  return apiJson(`${API_BASE}/api/v1/decks/${deckId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export function apiDeckStats(deckId: number): Promise<DeckStats> {
  return apiJson(`${API_BASE}/api/v1/decks/${deckId}/stats`);
}

// ─── Sentence API helpers ─────────────────────────────────────────────────────

export async function apiFetchSentences(
  query: ListSentencesQuery = {}
): Promise<ListSentencesResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.source) params.set('source', query.source);
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.offset != null) params.set('offset', String(query.offset));

  const res = await fetch(`${API_BASE}/api/v1/sentences?${params}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as ErrorResponse;
    throw new Error(err.error);
  }
  return res.json() as Promise<ListSentencesResponse>;
}
