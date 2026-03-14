import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { createDeck, importCards } from './deckService';
import type { AnkiImportResponse } from '../routes/types';

interface AnkiNote {
  flds: string;
}

/**
 * Import an Anki .apkg file into a new deck.
 *
 * An .apkg is a ZIP containing collection.anki2 (SQLite).
 * Notes table: flds column is \x1f-delimited; field[0]=front, field[1]=back.
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
  try {
    notes = anki.prepare('SELECT flds FROM notes').all() as AnkiNote[];
  } finally {
    anki.close();
  }

  const deck = createDeck({ name: deckName });
  const pairs = notes.flatMap((note) => {
    const fields = note.flds.split('\x1f');
    const front = fields[0]?.trim() ?? '';
    const back = fields[1]?.trim() ?? '';
    if (!front) return [];
    return [{ front, back }];
  });

  const imported = importCards(deck.id, pairs);
  const skipped = pairs.length - imported;

  return { deckId: deck.id, imported, skipped };
}
