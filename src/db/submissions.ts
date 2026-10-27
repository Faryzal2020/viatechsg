import { db } from './index.js';

export interface SubmissionInput {
  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  country?: string | null;
  phoneNumber?: string | null;
  notes?: string | null;
  rawPayload?: Record<string, unknown>;
}

export interface SubmissionRecord {
  id: number | bigint;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  country: string | null;
  phoneNumber: string | null;
  notes: string | null;
  createdAt: string;
  rawPayload?: Record<string, unknown>;
}

interface RawDbRow {
  id: number | bigint;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  country: string | null;
  phone_number: string | null;
  notes: string | null;
  raw_payload: string | null;
  created_at: string;
}

/**
 * Normalizes input from various casing conventions (camelCase, snake_case, spaces).
 */
export function normalizeSubmissionInput(body: Record<string, unknown>): SubmissionInput {
  const getField = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      if (body[key] !== undefined && body[key] !== null) {
        return String(body[key]).trim();
      }
    }
    return undefined;
  };

  return {
    firstName: getField('firstName', 'first_name', 'firstName', 'first name') || '',
    lastName: getField('lastName', 'last_name', 'lastName', 'last name') || '',
    email: getField('email', 'emailAddress', 'email_address', 'email address', 'email adress') || '',
    company: getField('company', 'companyName', 'company_name') || null,
    country: getField('country') || null,
    phoneNumber: getField('phoneNumber', 'phone_number', 'phone', 'phoneNumber', 'phone number') || null,
    notes: getField('notes', 'note', 'message', 'comment') || null,
    rawPayload: body,
  };
}

/**
 * Save a new submission to the SQLite database.
 */
export function saveSubmission(input: SubmissionInput): SubmissionRecord {
  const stmt = db.prepare(`
    INSERT INTO submissions (
      first_name,
      last_name,
      email,
      company,
      country,
      phone_number,
      notes,
      raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const serializedRaw = input.rawPayload ? JSON.stringify(input.rawPayload) : null;

  const result = stmt.run(
    input.firstName,
    input.lastName,
    input.email,
    input.company ?? null,
    input.country ?? null,
    input.phoneNumber ?? null,
    input.notes ?? null,
    serializedRaw
  );

  const id = result.lastInsertRowid;
  const selectStmt = db.prepare(`
    SELECT id, first_name, last_name, email, company, country, phone_number, notes, raw_payload, created_at
    FROM submissions WHERE id = ?
  `);
  const row = selectStmt.get(id) as unknown as RawDbRow | undefined;

  return {
    id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    company: input.company ?? null,
    country: input.country ?? null,
    phoneNumber: input.phoneNumber ?? null,
    notes: input.notes ?? null,
    createdAt: row ? row.created_at : new Date().toISOString(),
    rawPayload: input.rawPayload,
  };
}

/**
 * Retrieve a submission by ID.
 */
export function getSubmissionById(id: number | bigint): SubmissionRecord | null {
  const selectStmt = db.prepare(`
    SELECT id, first_name, last_name, email, company, country, phone_number, notes, raw_payload, created_at
    FROM submissions WHERE id = ?
  `);
  const row = selectStmt.get(id) as unknown as RawDbRow | undefined;

  if (!row) {
    return null;
  }

  return mapRowToRecord(row);
}

/**
 * List recent submissions (defaults to last 50).
 */
export function listSubmissions(limit = 50): SubmissionRecord[] {
  const selectStmt = db.prepare(`
    SELECT id, first_name, last_name, email, company, country, phone_number, notes, raw_payload, created_at
    FROM submissions ORDER BY id DESC LIMIT ?
  `);
  const rows = selectStmt.all(limit) as unknown as RawDbRow[];

  return rows.map(mapRowToRecord);
}

function mapRowToRecord(row: RawDbRow): SubmissionRecord {
  let parsedPayload: Record<string, unknown> | undefined = undefined;
  if (row.raw_payload) {
    try {
      parsedPayload = JSON.parse(row.raw_payload);
    } catch {
      parsedPayload = undefined;
    }
  }

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    company: row.company,
    country: row.country,
    phoneNumber: row.phone_number,
    notes: row.notes,
    createdAt: row.created_at,
    rawPayload: parsedPayload,
  };
}
