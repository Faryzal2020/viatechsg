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

  // Migration: Automatically add any missing columns if table was created in an older version
  const tableInfo = db.prepare('PRAGMA table_info(submissions)').all() as unknown as { name: string }[];
  const existingCols = new Set(tableInfo.map((col) => col.name));

  const requiredColumns = [
    { name: 'first_name', definition: 'TEXT NOT NULL DEFAULT ""' },
    { name: 'last_name', definition: 'TEXT NOT NULL DEFAULT ""' },
    { name: 'email', definition: 'TEXT NOT NULL DEFAULT ""' },
    { name: 'company', definition: 'TEXT' },
    { name: 'country', definition: 'TEXT' },
    { name: 'phone_number', definition: 'TEXT' },
    { name: 'notes', definition: 'TEXT' },
    { name: 'raw_payload', definition: 'TEXT' },
  ];

  for (const col of requiredColumns) {
    if (!existingCols.has(col.name)) {
      console.log(`[Database Migration] Adding missing column: ${col.name}`);
      db.exec(`ALTER TABLE submissions ADD COLUMN ${col.name} ${col.definition};`);
    }
  }

  console.log(`[Database] Initialized SQLite database at ${config.dbPath}`);
}
