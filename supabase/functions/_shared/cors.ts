/**
 * Shared CORS configuration for all iConnect edge functions.
 *
 * SECURITY: Origin allowlist — only production and local dev origins accepted.
 * Never use wildcard '*' in production edge functions that handle user data.
 */

const ALLOWED_ORIGINS = new Set([
  'https://iconnect-med.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
])

export function getCorsHeaders(origin: string): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-request-start',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

/** Pre-flight response — use in every edge function's OPTIONS handler */
export function corsPreflightResponse(origin: string): Response {
  return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
}

// Legacy export — kept for backward compat during migration.
// New code should use getCorsHeaders(origin) for per-request origin checking.
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://iconnect-med.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-request-start',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
