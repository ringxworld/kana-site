import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { getDb, resetDb } from '../src/db/client';
import { setupDatabase } from '../src/db/setup';
import { app } from '../src/routes/index';

function initDb() {
  getDb(':memory:');
  setupDatabase();
}

beforeEach(() => {
  initDb();
});

afterEach(() => {
  resetDb();
});

// ---------------------------------------------------------------------------
// Import endpoint
// ---------------------------------------------------------------------------

describe('POST /api/v1/sentences/import', () => {
  it('imports JP/EN pairs from plain text', async () => {
    const text = [
      'よくできた(作品 (さくひん))だ。',
      "It's a well-made piece of work.",
      '',
      '(何 (なに))も(言 (い))う(事 (こと))はないな。',
      "There's nothing more to say.",
    ].join('\n');

    const res = await app.request('/api/v1/sentences/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: 'lesson1.txt' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { imported: number; skipped: number; source: string };
    expect(body.imported).toBe(2);
    expect(body.skipped).toBe(0);
    expect(body.source).toBe('lesson1.txt');
  });

  it('handles JP-only lines (no English pair)', async () => {
    const text = 'あの(人 (ひと))すごいね。\n\nもう(少 (すこ))しで(事故 (じこ))が(起 (お))こるところだった。';
    const res = await app.request('/api/v1/sentences/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { imported: number };
    expect(body.imported).toBe(2);
  });

  it('returns 400 for missing text field', async () => {
    const res = await app.request('/api/v1/sentences/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// List endpoint
// ---------------------------------------------------------------------------

describe('GET /api/v1/sentences', () => {
  async function seed() {
    const text = [
      '(日本 (にほん))語が(好 (す))きです。',
      'I like Japanese.',
      '',
      '(本 (ほん))を(読 (よ))むのに(眼鏡 (めがね))を(買 (か))った。',
      'I bought glasses to read books.',
    ].join('\n');
    await app.request('/api/v1/sentences/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: 'test.txt' }),
    });
  }

  it('returns all sentences', async () => {
    await seed();
    const res = await app.request('/api/v1/sentences');
    expect(res.status).toBe(200);
    const body = await res.json() as { sentences: unknown[]; total: number };
    expect(body.total).toBe(2);
    expect(body.sentences).toHaveLength(2);
  });

  it('searches by Japanese text', async () => {
    await seed();
    const res = await app.request('/api/v1/sentences?q=%E6%9C%AC');  // 本
    expect(res.status).toBe(200);
    const body = await res.json() as { sentences: Array<{ japanese: string }> };
    expect(body.sentences.some((s) => s.japanese.includes('本'))).toBe(true);
  });

  it('searches by English text', async () => {
    await seed();
    const res = await app.request('/api/v1/sentences?q=glasses');
    expect(res.status).toBe(200);
    const body = await res.json() as { sentences: Array<{ english: string }> };
    expect(body.sentences.some((s) => s.english.includes('glasses'))).toBe(true);
  });

  it('respects limit and offset', async () => {
    await seed();
    const res = await app.request('/api/v1/sentences?limit=1&offset=0');
    expect(res.status).toBe(200);
    const body = await res.json() as { sentences: unknown[]; limit: number; offset: number };
    expect(body.sentences).toHaveLength(1);
    expect(body.limit).toBe(1);
    expect(body.offset).toBe(0);
  });

  it('filters by source', async () => {
    await seed();
    // Import a second batch with different source
    await app.request('/api/v1/sentences/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'こんにちは。\nHello.', source: 'other.txt' }),
    });
    const res = await app.request('/api/v1/sentences?source=test.txt');
    expect(res.status).toBe(200);
    const body = await res.json() as { sentences: Array<{ source: string }> };
    expect(body.sentences.every((s) => s.source === 'test.txt')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
