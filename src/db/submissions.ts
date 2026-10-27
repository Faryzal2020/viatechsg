import { db } from './index.js';

export interface SubmissionRecord {
  id: number | bigint;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface RawDbRow {
  id: number | bigint;
  payload: string;
  created_at: string;
}

/**
 * Save incoming payload into the SQLite database.
 * The payload is stored as JSON so any field structure works immediately.
 * 
 * NOTE FOR LATER: When you finalize your fields (e.g. name, email, message),
 * you can add dedicated columns to the SQLite table in `src/db/index.ts`
 * and map them here.
 */
export function saveSubmission(payload: Record<string, unknown>): SubmissionRecord {
  const serialized = JSON.stringify(payload);
  const stmt = db.prepare('INSERT INTO submissions (payload) VALUES (?)');
  const result = stmt.run(serialized);

  const id = result.lastInsertRowid;
  const selectStmt = db.prepare('SELECT id, payload, created_at FROM submissions WHERE id = ?');
  const row = selectStmt.get(id) as unknown as RawDbRow | undefined;

  return {
    id,
    payload,
    createdAt: row ? row.created_at : new Date().toISOString(),
  };
}

/**
 * Retrieve a submission by ID.
 */
export function getSubmissionById(id: number | bigint): SubmissionRecord | null {
  const selectStmt = db.prepare('SELECT id, payload, created_at FROM submissions WHERE id = ?');
  const row = selectStmt.get(id) as unknown as RawDbRow | undefined;

  if (!row) {
    return null;
  }

  let parsedPayload: Record<string, unknown> = {};
  try {
    parsedPayload = JSON.parse(row.payload);
  } catch {
    parsedPayload = { raw: row.payload };
  }

  return {
    id: row.id,
    payload: parsedPayload,
    createdAt: row.created_at,
  };
}

/**
 * List recent submissions (defaults to last 50).
 */
export function listSubmissions(limit = 50): SubmissionRecord[] {
  const selectStmt = db.prepare('SELECT id, payload, created_at FROM submissions ORDER BY id DESC LIMIT ?');
  const rows = selectStmt.all(limit) as unknown as RawDbRow[];

  return rows.map((row) => {
    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(row.payload);
    } catch {
      parsedPayload = { raw: row.payload };
    }

    return {
      id: row.id,
      payload: parsedPayload,
      createdAt: row.created_at,
    };
  });
}
