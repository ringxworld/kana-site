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

    CREATE TABLE IF NOT EXISTS decks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS cards (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id    INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      front      TEXT    NOT NULL,
      back       TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS card_scheduling (
      card_id        INTEGER PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
      stability      REAL    NOT NULL DEFAULT 0,
      difficulty     REAL    NOT NULL DEFAULT 0,
      elapsed_days   INTEGER NOT NULL DEFAULT 0,
      scheduled_days INTEGER NOT NULL DEFAULT 0,
      reps           INTEGER NOT NULL DEFAULT 0,
      lapses         INTEGER NOT NULL DEFAULT 0,
      state          TEXT    NOT NULL DEFAULT 'new',
      due_at         INTEGER NOT NULL DEFAULT 0,
      last_review_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id        INTEGER NOT NULL REFERENCES cards(id),
      rating         INTEGER NOT NULL,
      state          TEXT    NOT NULL,
      due_at         INTEGER NOT NULL,
      reviewed_at    INTEGER NOT NULL,
      scheduled_days INTEGER NOT NULL
    );
  `);
}
