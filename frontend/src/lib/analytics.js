/**
 * analytics.js — shared data science utilities for iConnect learning analytics.
 *
 * All functions are PURE (no side-effects, no imports, no DB calls).
 * Consumers pass pre-fetched data; this module computes insights from it.
 *
 * Dependency contract: activity_logs rows must have { created_at, duration_minutes }
 */

// ── Moving average ────────────────────────────────────────────────────────────

/**
 * N-point simple moving average of a numeric series.
 * First N-1 points use shorter available windows (no padding bias).
 * @param {number[]} series
 * @param {number}   n       window size (default 3)
 * @returns {number[]}
 */
export function movingAverage(series, n = 3) {
  return series.map((_, i, arr) => {
    const slice = arr.slice(Math.max(0, i - n + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

// ── Variance helpers ──────────────────────────────────────────────────────────

/**
 * Period-over-period variance.
 * Returns { pct: number, direction: 'up'|'down'|'flat' }
 *
 * Edge cases:
 *   - both zero  → 0%, flat
 *   - previous 0 → 100%, up  (new activity)
 *   - difference within ±0.5% → flat (avoids noise from tiny float gaps)
 *
 * @param {number} current
 * @param {number} previous
 */
export function wowVariance(current, previous) {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' };
  if (previous === 0) return { pct: 100, direction: 'up' };
  const raw = ((current - previous) / previous) * 100;
  const pct = Math.round(Math.abs(raw));
  const direction = raw > 0.5 ? 'up' : raw < -0.5 ? 'down' : 'flat';
  return { pct, direction };
}

/**
 * Month-over-month variance — identical formula, separate export for clarity.
 */
export const momVariance = wowVariance;

// ── Weekly buckets ────────────────────────────────────────────────────────────

/**
 * Bucket activity logs into weekly time windows.
 * Returns an array of `numWeeks` buckets sorted OLDEST → NEWEST.
 *
 * Each bucket: { weekStart, weekEnd, label, count, mins }
 *   label:   'This week' | 'Last week' | '-3w' | '-4w' | …
 *   count:   number of log rows that fall in this window
 *   mins:    sum of duration_minutes (or 0 when null/undefined)
 *
 * @param {object[]} logs     activity_logs rows
 * @param {number}   numWeeks number of weekly buckets (default 12)
 */
export function weeklyBuckets(logs, numWeeks = 12) {
  const now = Date.now();
  const buckets = Array.from({ length: numWeeks }, (_, i) => {
    const weekEnd   = new Date(now - i * 7 * 86_400_000);
    const weekStart = new Date(now - (i + 1) * 7 * 86_400_000);
    const label = i === 0 ? 'This week'
      : i === 1 ? 'Last week'
      : `-${i + 1}w`;
    return { weekStart, weekEnd, label, count: 0, mins: 0 };
  }).reverse();

  (logs || []).forEach(log => {
    const d = new Date(log.created_at);
    const b = buckets.find(w => d >= w.weekStart && d < w.weekEnd);
    if (b) {
      b.count++;
      b.mins += (log.duration_minutes || 0);
    }
  });
  return buckets;
}

// ── Peak focus time ───────────────────────────────────────────────────────────

/**
 * Identify the clock-hour (0–23) with the most activity in a log set.
 * Returns null for empty log arrays.
 *
 * @param {object[]} logs  activity_logs rows (must have created_at)
 * @returns {{ hour, label, pct, count } | null}
 *   label: human-readable hour e.g. "9 AM", "3 PM", "12 PM"
 *   pct:   percentage of all activity that occurred at this hour
 *   count: raw row count at the peak hour
 */
export function peakFocusTime(logs) {
  if (!logs || logs.length === 0) return null;

  const hourCounts = Array(24).fill(0);
  logs.forEach(log => {
    const h = new Date(log.created_at).getHours();
    hourCounts[h]++;
  });

  const peakH = hourCounts.indexOf(Math.max(...hourCounts));
  const total  = hourCounts.reduce((a, b) => a + b, 0);
  const pct    = total > 0 ? Math.round((hourCounts[peakH] / total) * 100) : 0;

  const label = peakH === 0 ? '12 AM'
    : peakH < 12   ? `${peakH} AM`
    : peakH === 12 ? '12 PM'
    : `${peakH - 12} PM`;

  return { hour: peakH, label, pct, count: hourCounts[peakH] };
}

// ── Display helpers ───────────────────────────────────────────────────────────

/**
 * Inline-style colour for a trend direction.
 * Returns a CSS colour string safe to use in `style={{ color: ... }}`.
 */
export function trendColor(direction) {
  if (direction === 'up')   return '#059669'; // emerald-600
  if (direction === 'down') return '#EF4444'; // red-500
  return '#9CA3AF';                           // gray-400
}

/**
 * Arrow symbol for a trend direction.
 */
export function trendArrow(direction) {
  if (direction === 'up')   return '↑';
  if (direction === 'down') return '↓';
  return '—';
}

/**
 * Compact badge text: "↑ 12%" | "↓ 5%" | "—"
 */
export function trendBadge(variance) {
  if (!variance || variance.direction === 'flat') return '—';
  return `${trendArrow(variance.direction)} ${variance.pct}%`;
}
