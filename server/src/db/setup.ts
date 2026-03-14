import { getRawDb } from './client';

export function setupDatabase() {
  const db = getRawDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS sentences (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      japanese   TEXT    NOT NULL,
      english    TEXT    NOT NULL DEFAULT '',
      source     TEXT    NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS sentences_fts USING fts5(
      japanese,
      english,
      content='sentences',
      content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS sentences_ai AFTER INSERT ON sentences BEGIN
      INSERT INTO sentences_fts(rowid, japanese, english)
      VALUES (new.id, new.japanese, new.english);
    END;

    CREATE TRIGGER IF NOT EXISTS sentences_ad AFTER DELETE ON sentences BEGIN
      INSERT INTO sentences_fts(sentences_fts, rowid, japanese, english)
      VALUES ('delete', old.id, old.japanese, old.english);
    END;

    CREATE TRIGGER IF NOT EXISTS sentences_au AFTER UPDATE ON sentences BEGIN
      INSERT INTO sentences_fts(sentences_fts, rowid, japanese, english)
      VALUES ('delete', old.id, old.japanese, old.english);
      INSERT INTO sentences_fts(rowid, japanese, english)
      VALUES (new.id, new.japanese, new.english);
    END;
  `);
}
