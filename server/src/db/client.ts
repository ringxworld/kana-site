import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sqlite: Database.Database | null = null;

export function getDb(path?: string) {
  if (_db) return _db;
  _sqlite = new Database(path ?? ':memory:');
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('foreign_keys = ON');
  _db = drizzle(_sqlite, { schema });
  return _db;
}

export function getRawDb(): Database.Database {
  if (!_sqlite) throw new Error('Database not initialized. Call getDb() first.');
  return _sqlite;
}

/** For tests: reset the singleton so each test can use a fresh in-memory DB. */
export function resetDb() {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
  }
  _db = null;
}
