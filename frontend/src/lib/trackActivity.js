/**
 * trackActivity.js
 *
 * Batches activity log inserts (max 20 per flush, flushed every 5 seconds).
 * score_delta is calculated SERVER-SIDE via DB trigger (migration 004) — not here.
 * Uses navigator.sendBeacon on page unload to prevent data loss (Flaw #29).
 */
import { supabase } from './supabase';
import { dbInsert, registerCache } from './dbService';

const queue = [];
let flushTimer = null;
// BUG-C: register activity queue for logout cleanup — prevents stale user's
// pending events from flushing under the next user's session.
registerCache(() => cleanupActivityTracking());
const FLUSH_INTERVAL = 5000; // ms
const MAX_BATCH = 20;
const timers = {}; // { "activityType_referenceId": startTimestamp }

/**
 * Start a duration timer for an activity.
 * @param {string} activityType
 * @param {string|number} referenceId
 */
export function startTimer(activityType, referenceId = 'default') {
  timers[`${activityType}_${referenceId}`] = Date.now();
}

/**
 * Stop a duration timer and return actual elapsed minutes (may be 0 for sub-minute sessions).
 * Returns 0 if no timer was started.
 * BUG-L: Removed Math.max(1, ...) — inflating sub-minute sessions to 1 minute produced
 * inaccurate activity data and inflated XP for quick interactions.
 * @param {string} activityType
 * @param {string|number} referenceId
 * @returns {number} minutes (0 for sessions under 30 seconds)
 */
export function stopTimer(activityType, referenceId = 'default') {
  const key = `${activityType}_${referenceId}`;
  const start = timers[key];
  if (start) {
    const minutes = Math.round((Date.now() - start) / 60000);
    delete timers[key];
    return minutes;
  }
  return 0;
}

/**
 * Queue an activity log entry. Fire-and-forget; never throws.
 * @param {string} activityType - Must match a row in score_rules table.
 * @param {string|number} referenceId - Optional artifact/quiz/etc. ID.
 * @param {number|null} durationMinutes - Optional duration in minutes.
 */
export function trackActivity(activityType, referenceId = '', durationMinutes = null) {
  _getUid().then(uid => {
    if (!uid) return;
    const entry = {
      user_id:       uid,
      activity_type: activityType,
      reference_id:  String(referenceId),
      // score_delta intentionally omitted — DB trigger fills it server-side
    };
    if (durationMinutes !== null && durationMinutes > 0) {
      entry.duration_minutes = durationMinutes;
    }
    queue.push(entry);

    if (queue.length >= MAX_BATCH) {
      flushActivityQueue();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flushActivityQueue, FLUSH_INTERVAL);
    }
  }).catch(() => {});
}

async function _getUid() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function flushActivityQueue() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH);
  // dbInsert: normalizes errors, never throws, payload is already snake_case
  const { error, status } = await dbInsert('activity_logs', batch);
  if (status === 'error') {
    console.warn('[trackActivity] batch insert failed:', error);
    // Don't re-queue to avoid infinite retry loops on persistent errors.
  }
}

/**
 * Cancel pending flush timer and drain the queue without sending.
 * Call on logout to prevent stale user data from flushing for the next session.
 */
export function cleanupActivityTracking() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  queue.length = 0;
}

// SEC-004: sendBeacon cannot attach auth headers — replaced with two-part strategy:
//
// PRIMARY (visibilitychange): flushes through dbInsert with proper auth token.
//   Catches most real-world cases: tab switch, background, phone lock.
//
// FALLBACK (beforeunload): saves remaining queue to localStorage with a UUID key.
//   On next app load, flushPendingFromStorage() picks it up once auth is established.
//   This covers the hard-close case that visibilitychange can't handle.

const PENDING_ACTIVITY_PREFIX = 'iconnect_pending_activity_';

if (typeof window !== 'undefined') {
  // PRIMARY: visibilitychange fires reliably for most tab/window switches
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && queue.length > 0) {
      flushActivityQueue(); // uses authenticated dbInsert
    }
  });

  // FALLBACK: beforeunload — save to localStorage for auth-aware flush on next load
  window.addEventListener('beforeunload', () => {
    if (queue.length === 0) return;
    const remaining = queue.splice(0);
    const key = `${PENDING_ACTIVITY_PREFIX}${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    try {
      localStorage.setItem(key, JSON.stringify(remaining));
    } catch { /* storage full — activity data lost, non-critical */ }
  });
}

/**
 * Flush any activity logs saved to localStorage during a previous page unload.
 * Call this AFTER auth is established (user is logged in with a valid session).
 * Safe to call multiple times — each key is removed before insertion attempt.
 */
export async function flushPendingFromStorage() {
  const pendingKeys = Object.keys(localStorage).filter(k => k.startsWith(PENDING_ACTIVITY_PREFIX));
  for (const key of pendingKeys) {
    try {
      const batch = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.removeItem(key); // remove before insert to prevent double-flush
      if (batch.length > 0) {
        const { error, status } = await dbInsert('activity_logs', batch);
        if (status === 'error') {
          console.warn('[trackActivity] flushPendingFromStorage insert failed:', error);
        }
      }
    } catch (e) {
      console.warn('[trackActivity] flushPendingFromStorage parse error:', e.message);
      localStorage.removeItem(key); // remove corrupt entry
    }
  }
}
