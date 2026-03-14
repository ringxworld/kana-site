import { eq, like, count, sql } from 'drizzle-orm';
import { getDb, getRawDb } from '../db/client';
import { sentences, type NewSentence } from '../db/schema';
import type {
  Sentence,
  ListSentencesQuery,
  ListSentencesResponse,
  ImportRequest,
  ImportResponse,
} from '../routes/types';

// ---------------------------------------------------------------------------
// Pair parsing — faithful copy of src/lib/reader.ts parsePairs + helpers.
// Do NOT diverge from the frontend's parsing logic.
// ---------------------------------------------------------------------------

function hasJapaneseChars(line: string) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(line);
}

function looksEnglish(line: string) {
  const s = line.trim();
  if (!s) return false;
  if (hasJapaneseChars(s)) return false;
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  return latin >= 2;
}

function parsePairs(input: string): Array<{ jp: string; en: string }> {
  const lines = input.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const pairs: Array<{ jp: string; en: string }> = [];
  let i = 0;

  function nextNonEmpty(idx: number) {
    while (idx < lines.length && lines[idx].trim() === '') idx += 1;
    return idx;
  }

  while (i < lines.length) {
    i = nextNonEmpty(i);
    if (i >= lines.length) break;

    const jp = lines[i];
    i += 1;

    const j = nextNonEmpty(i);
    if (j >= lines.length) {
      pairs.push({ jp, en: '' });
      break;
    }

    const candidate = lines[j];
    if (looksEnglish(candidate)) {
      pairs.push({ jp, en: candidate });
      i = j + 1;
    } else {
      pairs.push({ jp, en: '' });
      i = j;
    }
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function toSentence(row: { id: number; japanese: string; english: string | null; source: string | null; created_at: number }): Sentence {
  return {
    id: row.id,
    japanese: row.japanese,
    english: row.english ?? '',
    source: row.source ?? '',
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

export function importSentences({ text, source = '' }: ImportRequest): ImportResponse {
  const pairs = parsePairs(text);
  const db = getDb();
  let imported = 0;
  let skipped = 0;

  for (const { jp, en } of pairs) {
    if (!jp.trim()) { skipped++; continue; }
    try {
      db.insert(sentences).values({ japanese: jp.trim(), english: en.trim(), source }).run();
      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped, source };
}

export function listSentences(query: ListSentencesQuery): ListSentencesResponse {
  const limit = Math.min(query.limit ?? 50, 200);
  const offset = query.offset ?? 0;

  if (query.q && query.q.trim()) {
    return searchSentences(query.q.trim(), limit, offset, query.source);
  }

  const rawDb = getRawDb();

  let countSql = 'SELECT COUNT(*) as n FROM sentences WHERE 1=1';
  let listSql = 'SELECT id, japanese, english, source, created_at FROM sentences WHERE 1=1';
  const params: unknown[] = [];

  if (query.source) {
    countSql += ' AND source = ?';
    listSql += ' AND source = ?';
    params.push(query.source);
  }

  listSql += ' ORDER BY id DESC LIMIT ? OFFSET ?';

  const total = (rawDb.prepare(countSql).get(...params) as { n: number }).n;
  const rows = rawDb.prepare(listSql).all(...params, limit, offset) as Array<{
    id: number; japanese: string; english: string; source: string; created_at: number;
  }>;

  return { sentences: rows.map(toSentence), total, offset, limit };
}

function searchSentences(q: string, limit: number, offset: number, source?: string): ListSentencesResponse {
  const rawDb = getRawDb();

  let countSql = `
    SELECT COUNT(*) as n
    FROM sentences_fts
    JOIN sentences ON sentences.id = sentences_fts.rowid
    WHERE sentences_fts MATCH ?
  `;
  let listSql = `
    SELECT sentences.id, sentences.japanese, sentences.english, sentences.source, sentences.created_at
    FROM sentences_fts
    JOIN sentences ON sentences.id = sentences_fts.rowid
    WHERE sentences_fts MATCH ?
  `;
  const params: unknown[] = [q];

  if (source) {
    countSql += ' AND sentences.source = ?';
    listSql += ' AND sentences.source = ?';
    params.push(source);
  }

  listSql += ' ORDER BY rank LIMIT ? OFFSET ?';

  try {
    const total = (rawDb.prepare(countSql).get(...params) as { n: number }).n;
    const rows = rawDb.prepare(listSql).all(...params, limit, offset) as Array<{
      id: number; japanese: string; english: string; source: string; created_at: number;
    }>;
    return { sentences: rows.map(toSentence), total, offset, limit };
  } catch {
    // FTS MATCH syntax error — return empty
    return { sentences: [], total: 0, offset, limit };
  }
}
