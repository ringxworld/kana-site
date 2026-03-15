import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { createDeck, importCards } from './deckService';
import type { AnkiImportResponse, CreateCardRequest } from '../routes/types';

interface AnkiNote {
  mid: number;
  tags: string;
  flds: string;
}

interface AnkiModel {
  name: string;
  flds: Array<{ name: string }>;
}

/**
 * Import an Anki .apkg file into a new deck.
 *
 * An .apkg is a ZIP containing collection.anki2 (SQLite).
 * - notes.flds: \x1f-delimited field values
 * - notes.mid:  model (note type) ID
 * - notes.tags: space-separated tag string
 * - col.models: JSON blob mapping model ID → { name, flds: [{name}] }
 *
 * front/back are the stripped-text versions of fields[0] and fields[1].
 * extraFields stores all named fields with their raw HTML values.
 */
export function importApkg(buffer: Buffer, deckName: string): AnkiImportResponse {
  const zip = new AdmZip(buffer);

  const entry =
    zip.getEntry('collection.anki2') ??
    zip.getEntry('collection.anki21');

  if (!entry) {
    throw new Error('Invalid .apkg: no collection.anki2 found');
  }

  const sqliteBuffer = entry.getData();
  const anki = new Database(sqliteBuffer);

  let notes: AnkiNote[];
  let models: Record<string, AnkiModel>;
  try {
    notes = anki.prepare('SELECT mid, tags, flds FROM notes').all() as AnkiNote[];
    const colRow = anki.prepare('SELECT models FROM col').get() as { models: string };
    models = JSON.parse(colRow.models) as Record<string, AnkiModel>;
  } finally {
    anki.close();
  }

  const deck = createDeck({ name: deckName });

  const cards: CreateCardRequest[] = notes.flatMap((note) => {
    const fields = note.flds.split('\x1f');
    const front = fields[0]?.trim() ?? '';
    if (!front) return [];

    const model = models[String(note.mid)];
    const fieldNames = model?.flds.map((f) => f.name) ?? [];
    const extraFields: Record<string, string> = {};
    for (let i = 0; i < fields.length; i++) {
      extraFields[fieldNames[i] ?? `Field ${i + 1}`] = fields[i] ?? '';
    }

    const tags = note.tags
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    return [
      {
        front,
        back: fields[1]?.trim() ?? '',
        noteType: model?.name ?? null,
        tags,
        extraFields,
      } satisfies CreateCardRequest,
    ];
  });

  const imported = importCards(deck.id, cards);
  const skipped = cards.length - imported;

  return { deckId: deck.id, imported, skipped };
}
