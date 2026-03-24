/**
 * trackActivity.js
 *
 * Batches activity log inserts (max 20 per flush, flushed every 5 seconds).
 * score_delta is calculated SERVER-SIDE via DB trigger (migration 004) — not here.
 * Uses navigator.sendBeacon on page unload to prevent data loss (Flaw #29).
 */
import { supabase } from './supabase';

const queue = [];
let flushTimer = null;
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
 * Stop a duration timer and return elapsed minutes (min 1).
 * Returns 0 if no timer was started.
 * @param {string} activityType
 * @param {string|number} referenceId
 * @returns {number} minutes
 */
export function stopTimer(activityType, referenceId = 'default') {
  const key = `${activityType}_${referenceId}`;
  const start = timers[key];
  if (start) {
    const minutes = Math.max(1, Math.round((Date.now() - start) / 60000));
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
  try {
    const { error } = await supabase.from('activity_logs').insert(batch);
    if (error) throw error;
  } catch (e) {
    console.warn('[trackActivity] batch insert failed:', e.message);
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

// Flush remaining events on page unload using sendBeacon (fire-and-forget).
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (queue.length === 0) return;
    const remaining = queue.splice(0);
    const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL
      || 'https://kzxsyeznpudomeqxbnvp.supabase.co';
    const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY
      || supabase.supabaseKey;
    // sendBeacon is fire-and-forget and works even during unload
    navigator.sendBeacon(
      `${SUPABASE_URL}/rest/v1/activity_logs`,
      new Blob(
        [JSON.stringify(remaining)],
        { type: 'application/json' }
      )
    );
  });
}
