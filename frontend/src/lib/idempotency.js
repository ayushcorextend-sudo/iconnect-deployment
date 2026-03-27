/**
 * idempotency.js — Client-side idempotency key management.
 *
 * Prevents duplicate submissions (double-click, network retry) using
 * a DB-level UNIQUE constraint on (user_id, endpoint, payload_hash).
 *
 * Strategy (atomic — eliminates TOCTOU race from Phase 1):
 *   1. Attempt INSERT idempotency key with ON CONFLICT DO NOTHING
 *   2. If 0 rows returned → duplicate; fetch and return cached result
 *   3. If 1 row returned → new request; perform actual insert, store result
 *
 * Usage:
 *   const result = await idempotentInsert('quiz_attempt', { quiz_id, user_id, score, ... });
 */
import { supabase } from './supabase';
import { dbRun, dbUpsert, dbSelect, dbUpdate } from './dbService';

/**
 * Compute a stable hash of the payload for duplicate detection.
 * Uses the Web Crypto API (SHA-256).
 * @param {object} payload
 * @returns {Promise<string>} hex string
 */
export async function hashPayload(payload) {
  try {
    const text = JSON.stringify(payload, Object.keys(payload).sort());
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple string hash if SubtleCrypto unavailable
    let hash = 0;
    const str = JSON.stringify(payload);
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Idempotent insert wrapper.
 *
 * @param {string} endpoint - Logical name e.g. 'quiz_attempt', 'exam_attempt'
 * @param {object} payload  - The data to insert
 * @param {{ table: string, returnColumns?: string }} options
 * @returns {Promise<{ data: any, error: any, isDuplicate: boolean }>}
 */
export async function idempotentInsert(endpoint, payload, { table, returnColumns = '*' } = {}) {
  const idempotencyKey = crypto.randomUUID();
  const payloadHash    = await hashPayload(payload);

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error('not_authenticated');

    // ── Step 1: Claim the idempotency slot atomically (ON CONFLICT DO NOTHING)
    // If the UNIQUE constraint (user_id, endpoint, payload_hash) fires, 0 rows are inserted.
    const { data: claimed } = await dbUpsert(
      'idempotency_keys',
      { key: idempotencyKey, userId, endpoint, payloadHash },
      {
        onConflict:       'user_id,endpoint,payload_hash',
        ignoreDuplicates: true,
        returning:        true,
        returnColumns:    'id',
      }
    );

    // ── Step 2: If 0 rows → duplicate detected → return cached result
    if (!claimed || claimed.length === 0) {
      console.info(`[idempotency] Duplicate ${endpoint} detected — returning cached result.`);
      const { data: existing } = await dbSelect('idempotency_keys', {
        columns:     'result',
        filters:     { user_id: userId, endpoint, payload_hash: payloadHash },
        maybeSingle: true,
      });
      return { data: existing?.result ?? null, error: null, isDuplicate: true };
    }

    // ── Step 3: New request — perform the actual insert
    const insertQuery = supabase.from(table).insert(payload).select(returnColumns).maybeSingle();
    const { data, error: insertErr, status: insertStatus } = await dbRun(insertQuery);

    if (insertStatus === 'error') {
      // Clean up the claimed idempotency slot so the user can retry
      await dbUpdate('idempotency_keys', { result: null }, {
        user_id: userId, endpoint, payload_hash: payloadHash,
      });
      return { data: null, error: insertErr, isDuplicate: false };
    }

    // ── Step 4: Persist result for future duplicate checks
    const { error: updateErr } = await dbUpdate(
      'idempotency_keys',
      { result: data },
      { user_id: userId, endpoint, payload_hash: payloadHash }
    );
    if (updateErr) console.warn('[idempotency] Failed to store result:', updateErr);

    return { data, error: null, isDuplicate: false };

  } catch (err) {
    // Idempotency layer unavailable — fall back to plain insert
    console.warn('[idempotency] Layer failed, falling back to plain insert:', err.message);
    const fallbackQuery = supabase.from(table).insert(payload).select(returnColumns).maybeSingle();
    const { data, error } = await dbRun(fallbackQuery);
    return { data, error, isDuplicate: false };
  }
}
