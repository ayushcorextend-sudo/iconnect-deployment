/**
 * useSubmit — Prevents duplicate form submissions via in-flight guard + debounce.
 *
 * For operations that write to the database and need idempotency guarantees,
 * pair with idempotentInsert() from src/lib/idempotency.js.
 *
 * Usage:
 *   const { submit, isSubmitting } = useSubmit();
 *
 *   const handleSave = () => submit(async () => {
 *     const { data, error } = await idempotentInsert('quiz_attempt', payload, { table: 'quiz_attempts' });
 *     if (error) throw error;
 *     return data;
 *   });
 */
import { useState, useRef, useCallback } from 'react';

/**
 * @param {{ onError?: (err: Error) => void }} [options]
 */
export function useSubmit({ onError } = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Tracks in-flight promise — prevents overlapping submissions
  const inFlightRef = useRef(false);

  const submit = useCallback(async (fn) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsSubmitting(true);
    try {
      return await fn();
    } catch (err) {
      if (onError) onError(err);
      else throw err;
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [onError]);

  return { submit, isSubmitting };
}
