/**
 * sm2.js — Deterministic SM-2 Spaced Repetition Algorithm.
 * Pure functions, no AI dependency, no side effects.
 * Reference: https://en.wikipedia.org/wiki/SuperMemo#SM-2
 */

/**
 * Calculate next review schedule using SM-2 algorithm.
 * @param {number} quality - Self-rating 0-5 (0=blackout, 5=perfect)
 * @param {number} repetitions - Consecutive correct reviews
 * @param {number} easeFactor - Current ease factor (min 1.3, starts at 2.5)
 * @param {number} interval - Current interval in days
 * @returns {{ repetitions, easeFactor, interval, nextReviewDate }}
 */
export function sm2(quality, repetitions, easeFactor, interval) {
  if (quality < 0 || quality > 5) throw new RangeError('quality must be 0-5');
  if (easeFactor < 1.3) easeFactor = 1.3;

  let newRep = repetitions;
  let newEF = easeFactor;
  let newInterval = interval;

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newRep = repetitions + 1;
  } else {
    newRep = 0;
    newInterval = 1;
  }

  newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    repetitions: newRep,
    easeFactor: Math.round(newEF * 100) / 100,
    interval: newInterval,
    nextReviewDate: nextReviewDate.toISOString().split('T')[0],
  };
}

/** Map UI button labels to SM-2 quality scores */
export function mapRatingToQuality(rating) {
  const map = { again: 1, hard: 2, good: 4, easy: 5 };
  return map[rating] ?? 3;
}
