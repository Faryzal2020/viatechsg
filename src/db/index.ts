import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config/env.js';

// Ensure directory exists if DB path is in a subfolder
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(config.dbPath);

export function initDatabase(): void {
  // WAL mode for fast concurrency and reliability
  db.exec('PRAGMA journal_mode = WAL;');

  // Schema with explicit columns for submissions
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      country TEXT,
      phone_number TEXT,
      notes TEXT,
      raw_payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  console.log(`[Database] Initialized SQLite database at ${config.dbPath}`);
}
