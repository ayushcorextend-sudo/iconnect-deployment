/**
 * ai-orchestrator — Server-side AI routing edge function.
 *
 * Routes AI requests through NVIDIA Llama 3.1-70B (primary) with
 * automatic fallback to Gemini. Keeps all API keys server-side.
 *
 * SEC-002: NVIDIA_API_KEY must NEVER be in the browser bundle.
 *          This function is the only authorised caller.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_MODEL   = 'meta/llama-3.1-70b-instruct'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

const TIMEOUT_MS       = 15_000
const RATE_LIMIT_MAX   = 30   // requests per window
const RATE_LIMIT_WINDOW = 60  // seconds

// In-memory rate limit counter (resets on cold start — good enough for edge)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW * 1000 })
    return { allowed: true, retryAfter: 0 }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true, retryAfter: 0 }
}

function extractUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.slice(7)
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub ?? null
  } catch {
    return null
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  )
  return Promise.race([promise, timeout])
}

async function callNvidia(system: string, user: string, maxTokens: number, apiKey: string): Promise<string> {
  const res = await withTimeout(
    fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    }),
    TIMEOUT_MS
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`NVIDIA ${res.status}: ${text}`)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('NVIDIA returned empty response')
  return text
}

async function callGemini(system: string, user: string, maxTokens: number, apiKey: string): Promise<string> {
  const contents = [
    { role: 'user',  parts: [{ text: system }] },
    { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
    { role: 'user',  parts: [{ text: user }] },
  ]

  const res = await withTimeout(
    fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    }),
    TIMEOUT_MS
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini ${res.status}: ${text}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned empty response')
  return text
}

function jsonResponse(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  const origin = req.headers.get('origin') || ''

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // ── Auth check ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  const userId = extractUserIdFromJwt(authHeader)
  if (!userId) {
    return jsonResponse({ error: 'Unauthorized', code: 'auth_error' }, 401, origin)
  }

  // ── Rate limiting ───────────────────────────────────────────────────────────
  const { allowed, retryAfter } = checkRateLimit(userId)
  if (!allowed) {
    return jsonResponse(
      { error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`, code: 'rate_limited' },
      429,
      origin
    )
  }

  // ── Parse request ───────────────────────────────────────────────────────────
  let body: { payload?: { system?: string; user?: string }; max_tokens?: number }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body', code: 'invalid_request' }, 400, origin)
  }

  const system    = body?.payload?.system ?? ''
  const user      = body?.payload?.user   ?? ''
  const maxTokens = body?.max_tokens      ?? 512

  if (!user.trim()) {
    return jsonResponse({ error: 'payload.user is required', code: 'invalid_request' }, 400, origin)
  }

  // ── API keys ────────────────────────────────────────────────────────────────
  const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY') ?? ''
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

  // ── NVIDIA primary → Gemini fallback ────────────────────────────────────────
  if (NVIDIA_API_KEY) {
    try {
      const text = await callNvidia(system, user, maxTokens, NVIDIA_API_KEY)
      return jsonResponse({ data: text }, 200, origin)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'timeout') {
        console.warn('[ai-orchestrator] NVIDIA timed out, falling back to Gemini')
      } else {
        console.error('[ai-orchestrator] NVIDIA failed, falling back to Gemini:', msg)
      }
    }
  }

  if (GEMINI_API_KEY) {
    try {
      const text = await callGemini(system, user, maxTokens, GEMINI_API_KEY)
      return jsonResponse({ data: text }, 200, origin)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'timeout') {
        return jsonResponse({ error: 'AI request timed out', code: 'ai_unavailable' }, 504, origin)
      }
      console.error('[ai-orchestrator] Gemini also failed:', msg)
    }
  }

  return jsonResponse(
    { error: 'AI service unavailable. Please try again later.', code: 'ai_unavailable' },
    503,
    origin
  )
})
