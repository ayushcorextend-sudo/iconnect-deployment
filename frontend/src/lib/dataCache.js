/**
 * dataCache.js — Stale-while-revalidate module-level cache for iConnect
 *
 * Stores Supabase query results in memory so navigating between pages
 * shows data instantly (from cache) while refreshing in the background.
 *
 * Usage:
 *   import { getCached, setCached, invalidate } from '../lib/dataCache';
 *
 *   // In your useEffect:
 *   const cached = getCached('leaderboard');
 *   if (cached) setData(cached);            // instant render from cache
 *   setLoading(!cached);                    // only show spinner on first load
 *   const fresh = await supabase.from(...); // always refresh in background
 *   setData(fresh);
 *   setCached('leaderboard', fresh);        // update cache for next visit
 */

import { registerCache } from './dbService';

const _store = new Map();
const DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes
// BUG-C: register for logout cleanup — clears all user-specific query result caches.
registerCache(() => _store.clear());

/**
 * Get a cached value. Returns null if key is missing or expired.
 * @param {string} key
 * @returns {*|null}
 */
export function getCached(key) {
  const hit = _store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > hit.ttl) {
    _store.delete(key);
    return null;
  }
  return hit.data;
}

/**
 * Store a value in the cache.
 * @param {string} key
 * @param {*} data
 * @param {number} [ttl=120000] — time to live in ms
 */
export function setCached(key, data, ttl = DEFAULT_TTL) {
  _store.set(key, { data, ts: Date.now(), ttl });
}

/**
 * Invalidate (clear) a specific key.
 * @param {string} key
 */
export function invalidate(key) {
  _store.delete(key);
}

/**
 * Invalidate all keys with a given prefix.
 * @param {string} prefix
 */
export function invalidatePrefix(prefix) {
  for (const key of _store.keys()) {
    if (key.startsWith(prefix)) _store.delete(key);
  }
}

/**
 * Clear the entire cache.
 */
export function clearAll() {
  _store.clear();
}
