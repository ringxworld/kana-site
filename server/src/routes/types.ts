/** Shared request/response types for the kana-site API.
 *  Mirror this file manually in src/types/api.ts for the frontend.
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
