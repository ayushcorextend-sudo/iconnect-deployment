/**
 * traceHeaders.js — Distributed trace ID generation for Supabase + Edge Function calls.
 * Allows correlating frontend Sentry spans with backend Edge Function logs.
 */
import { startSpan, addBreadcrumb } from './sentry';

/**
 * Generate trace headers for a Supabase API call.
 * @returns {{ 'x-trace-id': string, 'x-request-start': string }}
 */
export function createTraceHeaders() {
  return {
    'x-trace-id': crypto.randomUUID(),
    'x-request-start': Date.now().toString(),
  };
}

/**
 * Instrument a Supabase call with a Sentry span + breadcrumb.
 * @param {string} tableName - The Supabase table name
 * @param {string} operation - e.g. 'select', 'insert', 'update'
 * @param {Function} fn - async function receiving traceHeaders
 */
export async function instrumentSupabaseCall(tableName, operation, fn) {
  const span = startSpan(`supabase.${operation}.${tableName}`, 'db');
  const traceHeaders = createTraceHeaders();
  const traceId = traceHeaders['x-trace-id'];

  try {
    const result = await fn(traceHeaders);
    addBreadcrumb('supabase', `${operation} ${tableName} OK`, { traceId });
    return result;
  } catch (err) {
    addBreadcrumb('supabase', `${operation} ${tableName} FAILED`, { error: err.message });
    throw err;
  } finally {
    if (span && typeof span.end === 'function') span.end();
  }
}
