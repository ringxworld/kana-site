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

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

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

export async function apiFetchSentences(query: ListSentencesQuery = {}): Promise<ListSentencesResponse> {
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
