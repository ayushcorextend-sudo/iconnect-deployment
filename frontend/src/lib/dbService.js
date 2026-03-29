/**
 * dbService.js — Centralized data access layer for all Supabase queries.
 *
 * ARCHITECTURE:
 *   Component → dbService → camelCase↔snake_case transform
 *                         → AbortController attachment
 *                         → try/catch with structured error return
 *                         → Supabase call
 *                         → Response normalization
 *
 * RETURN SHAPE (always):
 *   { data: T | null, error: string | null, status: 'ok' | 'error' | 'aborted' }
 *
 * Never throws. Never swallows. Every caller gets a clean object to inspect.
 *
 * Kills: BUG-G (54 direct calls), BUG-E (camelCase→snake_case NULL inserts),
 *        BUG-K (uncancelled requests), Disease 1 (absent service layer).
 */
import { supabase } from './supabase';

// ── Case Transformers ─────────────────────────────────────────────────────────

function _keyToSnake(key) {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function _keyToCamel(key) {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively convert all object keys from camelCase to snake_case.
 * Used for all DB writes. Arrays are handled transparently.
 * @param {*} obj
 * @returns {*}
 */
export function toSnake(obj) {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [_keyToSnake(k), toSnake(v)])
    );
  }
  return obj;
}

/**
 * Recursively convert all object keys from snake_case to camelCase.
 * Used for all DB reads. Arrays are handled transparently.
 * @param {*} obj
 * @returns {*}
 */
export function toCamel(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [_keyToCamel(k), toCamel(v)])
    );
  }
  return obj;
}

// ── Result Normalizer ─────────────────────────────────────────────────────────

/**
 * Normalize a Supabase { data, error } result into the standard service shape.
 * @param {*} data
 * @param {object|null} error - Supabase error object
 * @param {boolean} [camelizeResult=true] - Convert response keys to camelCase
 * @returns {{ data: *, error: string|null, status: 'ok'|'error' }}
 */
function _normalize(data, error, camelizeResult = true) {
  if (error) {
    return { data: null, error: error.message || String(error), status: 'error' };
  }
  return {
    data: camelizeResult && data !== null && data !== undefined ? toCamel(data) : data,
    error: null,
    status: 'ok',
  };
}

/**
 * Handle an AbortError or generic thrown exception.
 * @param {Error} e
 * @returns {{ data: null, error: string|null, status: 'error'|'aborted' }}
 */
function _handleThrown(e) {
  if (e.name === 'AbortError' || e.message === 'AbortError') {
    return { data: null, error: null, status: 'aborted' };
  }
  return { data: null, error: e.message || 'Unexpected error', status: 'error' };
}

// ── Module-Level Cache Registry ───────────────────────────────────────────────
// Any module that holds user-specific data in a module-level variable
// must register a cleanup function here. Logout calls clearAllCaches().

const _cacheCleaners = [];

/**
 * Register a cleanup function to run on logout.
 * @param {() => void} cleanFn
 */
export function registerCache(cleanFn) {
  _cacheCleaners.push(cleanFn);
}

/**
 * Clear all registered caches. Call this on logout.
 */
export function clearAllCaches() {
  _cacheCleaners.forEach(fn => {
    try { fn(); } catch (e) { console.warn('[dbService] cache cleaner threw:', e.message); }
  });
}

// ── Core Query Methods ────────────────────────────────────────────────────────

/**
 * Execute any pre-built Supabase query builder with abort support + normalization.
 * Use this for complex queries that dbSelect doesn't support (gte, in, rpc, etc.).
 *
 * IMPORTANT: Pass the query BEFORE it is awaited. dbRun adds the signal and awaits.
 *
 * @example
 *   const q = supabase.from('admin_webinars')
 *     .select('*')
 *     .gte('scheduled_at', new Date().toISOString())
 *     .order('scheduled_at')
 *     .limit(1);
 *   const { data, error, status } = await dbRun(q, signal);
 *
 * @param {object} queryBuilder - An unawaited Supabase query builder
 * @param {AbortSignal} [signal]
 * @param {boolean} [camelizeResult=true]
 * @returns {Promise<{ data: *, error: string|null, status: 'ok'|'error'|'aborted' }>}
 */
export async function dbRun(queryBuilder, signal, camelizeResult = true) {
  try {
    let q = queryBuilder;
    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q;
    return _normalize(data, error, camelizeResult);
  } catch (e) {
    return _handleThrown(e);
  }
}

/**
 * SELECT rows from a table.
 *
 * @param {string} table
 * @param {object} [opts]
 * @param {string} [opts.columns='*'] - Columns to select
 * @param {object} [opts.filters={}]  - Exact-match filters: { col: val } or { col: [a,b] } for IN
 * @param {object|string} [opts.order] - { column, ascending? } or column name string (desc by default)
 * @param {number} [opts.limit]       - Row limit
 * @param {boolean} [opts.single]     - Use .single() (throws if not exactly 1 row)
 * @param {boolean} [opts.maybeSingle] - Use .maybeSingle() (null if 0 rows)
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ data: *, error: string|null, status: 'ok'|'error'|'aborted' }>}
 */
export async function dbSelect(table, opts = {}, signal) {
  const {
    columns = '*',
    filters = {},
    order,
    limit,
    single: isSingle,
    maybeSingle: isMaybe,
  } = opts;

  try {
    let q = supabase.from(table).select(columns);

    Object.entries(filters).forEach(([key, val]) => {
      if (val === undefined || val === null) return;
      if (Array.isArray(val)) {
        q = q.in(key, val);
      } else {
        q = q.eq(key, val);
      }
    });

    if (order) {
      if (typeof order === 'string') {
        q = q.order(order, { ascending: false });
      } else {
        const { column, ascending = false } = order;
        q = q.order(column, { ascending });
      }
    }

    if (limit) q = q.limit(limit);
    if (isSingle) q = q.single();
    if (isMaybe) q = q.maybeSingle();
    if (signal) q = q.abortSignal(signal);

    const { data, error } = await q;
    return _normalize(data, error);
  } catch (e) {
    return _handleThrown(e);
  }
}

/**
 * INSERT row(s) into a table.
 * Automatically converts camelCase payload keys to snake_case (fixes BUG-E).
 *
 * @param {string} table
 * @param {object|object[]} payload - Row(s) to insert. camelCase keys are auto-converted.
 * @param {object} [opts]
 * @param {boolean} [opts.returning=false] - If true, select and return inserted rows
 * @param {string} [opts.returnColumns='*'] - Columns to return if returning=true
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ data: *, error: string|null, status: 'ok'|'error'|'aborted' }>}
 */
export async function dbInsert(table, payload, opts = {}, signal) {
  const { returning = false, returnColumns = '*' } = opts;
  try {
    const rows = Array.isArray(payload) ? payload : [payload];
    const snaked = rows.map(toSnake);
    let q = supabase.from(table).insert(snaked);
    if (returning) q = q.select(returnColumns);
    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q;
    return _normalize(data, error);
  } catch (e) {
    return _handleThrown(e);
  }
}

/**
 * UPSERT row(s) into a table.
 * Automatically converts camelCase payload keys to snake_case.
 *
 * @param {string} table
 * @param {object|object[]} payload
 * @param {object} [opts]
 * @param {string} [opts.onConflict]         - Column(s) to conflict on (comma-separated)
 * @param {boolean} [opts.ignoreDuplicates]  - If true, ON CONFLICT DO NOTHING (returns [] on conflict)
 * @param {boolean} [opts.returning=false]   - If true, select and return upserted rows
 * @param {string} [opts.returnColumns='*']  - Columns to return if returning=true
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ data: *, error: string|null, status: 'ok'|'error'|'aborted' }>}
 */
export async function dbUpsert(table, payload, opts = {}, signal) {
  const { onConflict, ignoreDuplicates = false, returning = false, returnColumns = '*' } = opts;
  try {
    const rows = Array.isArray(payload) ? payload : [payload];
    const snaked = rows.map(toSnake);
    const upsertOpts = {};
    if (onConflict) upsertOpts.onConflict = onConflict;
    if (ignoreDuplicates) upsertOpts.ignoreDuplicates = true;
    let q = supabase.from(table).upsert(snaked, Object.keys(upsertOpts).length ? upsertOpts : undefined);
    if (returning) q = q.select(returnColumns);
    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q;
    return _normalize(data, error);
  } catch (e) {
    return _handleThrown(e);
  }
}

/**
 * UPDATE rows in a table.
 * Automatically converts camelCase payload keys to snake_case.
 *
 * @param {string} table
 * @param {object} payload - Fields to update (camelCase OK)
 * @param {object} [filters={}] - Exact-match WHERE conditions
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ data: *, error: string|null, status: 'ok'|'error'|'aborted' }>}
 */
export async function dbUpdate(table, payload, filters = {}, signal) {
  try {
    let q = supabase.from(table).update(toSnake(payload));
    Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q;
    return _normalize(data, error);
  } catch (e) {
    return _handleThrown(e);
  }
}

/**
 * DELETE rows from a table.
 *
 * @param {string} table
 * @param {object} [filters={}] - Exact-match WHERE conditions (at least one required)
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ data: *, error: string|null, status: 'ok'|'error'|'aborted' }>}
 */
export async function dbDelete(table, filters = {}, signal) {
  try {
    let q = supabase.from(table).delete();
    Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q;
    return _normalize(data, error, false);
  } catch (e) {
    return _handleThrown(e);
  }
}
