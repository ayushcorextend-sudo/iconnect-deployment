/**
 * idempotency.js — Client-side idempotency key management.
 *
 * Generates a UUID key per mutation, stores it in idempotency_keys table,
 * and detects duplicate submissions (e.g. double-click, network retry).
 *
 * Usage:
 *   const result = await idempotentInsert('quiz_attempt', { quiz_id, user_id, score, ... });
 */
import { supabase } from './supabase';
import { dbRun, dbInsert } from './dbService';

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
    // Fallback: use a simple string hash if SubtleCrypto unavailable
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
 * - Generates a UUID idempotency key
 * - Checks if a matching key + payload_hash already exists (duplicate)
 * - On duplicate: returns the stored result instead of re-inserting
 * - On new: inserts the row, stores the idempotency key with result
 *
 * @param {string} endpoint - Logical name e.g. 'quiz_attempt', 'exam_attempt'
 * @param {object} payload  - The data to insert
 * @param {{ table: string, returnColumns?: string }} options
 * @returns {Promise<{ data: any, error: any, isDuplicate: boolean }>}
 */
export async function idempotentInsert(endpoint, payload, { table, returnColumns = '*' } = {}) {
  const idempotencyKey = crypto.randomUUID();
  const payloadHash    = await hashPayload(payload);

  // ── Check for existing duplicate (same endpoint + hash for this user, last 24h)
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error('not_authenticated');

    const existingQuery = supabase
      .from('idempotency_keys')
      .select('result')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('payload_hash', payloadHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    const { data: existing, status: existingStatus } = await dbRun(existingQuery);

    if (existingStatus === 'error') throw new Error('Idempotency check query failed');

    if (existing?.result) {
      console.info(`[idempotency] Duplicate ${endpoint} detected — returning cached result.`);
      return { data: existing.result, error: null, isDuplicate: true };
    }

    // ── Perform the actual insert (dbRun for consistent error shape)
    const insertQuery = supabase
      .from(table)
      .insert(payload)
      .select(returnColumns)
      .maybeSingle();
    const { data, error: insertErr, status: insertStatus } = await dbRun(insertQuery);

    if (insertStatus === 'error') return { data: null, error: insertErr, isDuplicate: false };

    // ── Store idempotency key — awaited, no longer fire-and-forget (IDEM-2)
    const { error: keyErr } = await dbInsert('idempotency_keys', {
      key:         idempotencyKey,
      endpoint,
      userId,
      payloadHash,
      result:      data,
    });
    if (keyErr) console.warn('[idempotency] Failed to store idempotency key:', keyErr);

    return { data, error: null, isDuplicate: false };

  } catch (err) {
    // Fall back to a plain insert if idempotency layer fails
    console.warn('[idempotency] Idempotency check failed, falling back to plain insert:', err.message);
    const fallbackQuery = supabase.from(table).insert(payload).select(returnColumns).maybeSingle();
    const { data, error } = await dbRun(fallbackQuery);
    return { data, error, isDuplicate: false };
  }
}
