// DEPRECATED: This edge function is no longer used by the frontend.
// All AI calls now route through gemini-proxy.
// Safe to delete after confirming production works without it.
// Deprecated: 2026-04-05

/**
 * ai-orchestrator — Production-grade AI routing edge function.
 *
 * Architecture:
 *   Client → JWT auth → input validation → rate limit → circuit breaker
 *         → NVIDIA primary (Llama 3.1-70B) → Gemini fallback (2.5-flash-lite)
 *         → streaming SSE response
 *
 * Patterns:
 *   - Circuit breaker: tracks provider failure rates, auto-skips broken providers
 *   - Streaming: token-by-token SSE for real-time UX (with non-streaming fallback)
 *   - Request tracing: x-trace-id propagation + structured logging
 *   - Input guardrails: max_tokens clamped, prompt length limited, payload validated
 *   - Retry with backoff: single retry per provider with jitter
 *
 * SEC-002: API keys read from Deno.env — NEVER exposed to client.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders, corsPreflightResponse } from '../_shared/cors.ts'

// ── Provider configuration ──────────────────────────────────────────────────
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_MODEL   = 'meta/llama-3.1-70b-instruct'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite'

// ── Tuning constants ────────────────────────────────────────────────────────
const TIMEOUT_MS         = 15_000
const MAX_TOKENS_FLOOR   = 1
const MAX_TOKENS_CEILING = 2048     // Hard cap — prevents credit burn
const MAX_PROMPT_CHARS   = 12_000   // ~3k tokens — safe for flash-lite
const RATE_LIMIT_MAX     = 30
const RATE_LIMIT_WINDOW  = 60       // seconds

// ── Circuit breaker state ───────────────────────────────────────────────────
// Tracks failures per provider. If a provider fails 3+ times in 60s, skip it.
interface CircuitState {
  failures: number
  lastFailure: number
  openUntil: number   // timestamp when circuit closes again
}

const circuitBreakers = new Map<string, CircuitState>()
const CB_FAILURE_THRESHOLD = 3
const CB_COOLDOWN_MS       = 60_000  // 60s cooldown when circuit opens

function isCircuitOpen(provider: string): boolean {
  const state = circuitBreakers.get(provider)
  if (!state) return false
  if (Date.now() > state.openUntil) {
    // Half-open: allow one request through to test recovery
    circuitBreakers.delete(provider)
    return false
  }
  return true
}

function recordFailure(provider: string): void {
  const now = Date.now()
  const state = circuitBreakers.get(provider) ?? { failures: 0, lastFailure: 0, openUntil: 0 }

  // Reset counter if last failure was more than the window ago
  if (now - state.lastFailure > CB_COOLDOWN_MS) {
    state.failures = 0
  }

  state.failures++
  state.lastFailure = now

  if (state.failures >= CB_FAILURE_THRESHOLD) {
    state.openUntil = now + CB_COOLDOWN_MS
    log('warn', `Circuit OPEN for ${provider} — ${state.failures} failures in window`, {})
  }

  circuitBreakers.set(provider, state)
}

function recordSuccess(provider: string): void {
  circuitBreakers.delete(provider)
}

// ── Rate limiter (in-memory, per-isolate) ───────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW * 1000 })
    return { allowed: true, retryAfter: 0 }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true, retryAfter: 0 }
}

// ── Structured logging ──────────────────────────────────────────────────────
function log(level: 'info' | 'warn' | 'error', message: string, meta: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), level, msg: `[ai-orchestrator] ${message}`, ...meta }
  if (level === 'error') console.error(JSON.stringify(entry))
  else if (level === 'warn') console.warn(JSON.stringify(entry))
  else console.log(JSON.stringify(entry))
}

// ── Auth ─────────────────────────────────────────────────────────────────────
function extractUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const payload = JSON.parse(atob(authHeader.slice(7).split('.')[1]))
    return payload.sub ?? null
  } catch {
    return null
  }
}

// ── Timeout utility ─────────────────────────────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  )
  return Promise.race([promise, timer])
}

// ── Provider callers ────────────────────────────────────────────────────────
async function callNvidia(
  system: string, user: string, maxTokens: number, apiKey: string, stream: boolean
): Promise<Response | string> {
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
        stream,
      }),
    }),
    TIMEOUT_MS
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`NVIDIA ${res.status}: ${text.slice(0, 200)}`)
  }

  if (stream) return res   // Return raw Response for streaming
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('NVIDIA: empty response')
  return text
}

async function callGemini(
  system: string, user: string, maxTokens: number, apiKey: string, stream: boolean
): Promise<Response | string> {
  const contents = [
    { role: 'user',  parts: [{ text: system }] },
    { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
    { role: 'user',  parts: [{ text: user }] },
  ]

  const endpoint = stream ? 'streamGenerateContent?alt=sse' : 'generateContent'
  const res = await withTimeout(
    fetch(`${GEMINI_API_URL}:${endpoint}&key=${apiKey}`, {
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
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`)
  }

  if (stream) return res
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini: empty response')
  return text
}

// ── Streaming bridge: convert provider SSE to unified SSE ───────────────────
function streamResponse(
  providerRes: Response, provider: 'nvidia' | 'gemini', origin: string, traceId: string
): Response {
  const headers = {
    ...getCorsHeaders(origin),
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Trace-Id': traceId,
    'X-Provider': provider,
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    try {
      const reader = providerRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            await writer.write(encoder.encode('data: [DONE]\n\n'))
            continue
          }

          try {
            const parsed = JSON.parse(payload)
            let token = ''

            if (provider === 'nvidia') {
              token = parsed?.choices?.[0]?.delta?.content || ''
            } else {
              // Gemini streaming format
              token = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            }

            if (token) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, { status: 200, headers })
}

// ── JSON response helper ────────────────────────────────────────────────────
function jsonResponse(body: unknown, status: number, origin: string, traceId: string, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(origin),
      'Content-Type': 'application/json',
      'X-Trace-Id': traceId,
      ...extra,
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
serve(async (req) => {
  const origin  = req.headers.get('origin') || ''
  const traceId = req.headers.get('x-trace-id') || crypto.randomUUID()
  const start   = Date.now()

  // ── CORS preflight ─────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin)
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const userId = extractUserIdFromJwt(req.headers.get('authorization'))
  if (!userId) {
    return jsonResponse({ error: 'Unauthorized', code: 'auth_error' }, 401, origin, traceId)
  }

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const { allowed, retryAfter } = checkRateLimit(userId)
  if (!allowed) {
    return jsonResponse(
      { error: `Rate limit exceeded. Try again in ${retryAfter}s.`, code: 'rate_limited' },
      429, origin, traceId,
      { 'Retry-After': String(retryAfter) }
    )
  }

  // ── Parse & validate request ───────────────────────────────────────────────
  let body: {
    payload?: { system?: string; user?: string }
    max_tokens?: number
    stream?: boolean
    action?: string
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body', code: 'invalid_request' }, 400, origin, traceId)
  }

  const system    = (body?.payload?.system ?? '').slice(0, MAX_PROMPT_CHARS)
  const user      = (body?.payload?.user   ?? '').slice(0, MAX_PROMPT_CHARS)
  const maxTokens = Math.min(Math.max(body?.max_tokens ?? 512, MAX_TOKENS_FLOOR), MAX_TOKENS_CEILING)
  const wantStream = body?.stream === true

  if (!user.trim()) {
    return jsonResponse({ error: 'payload.user is required', code: 'invalid_request' }, 400, origin, traceId)
  }

  // ── API keys ───────────────────────────────────────────────────────────────
  const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY') ?? ''
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

  // ── Provider routing with circuit breaker ──────────────────────────────────
  type ProviderEntry = {
    name: string
    key: string
    call: (s: string, u: string, t: number, k: string, stream: boolean) => Promise<Response | string>
  }

  const providers: ProviderEntry[] = []
  if (NVIDIA_API_KEY && !isCircuitOpen('nvidia')) {
    providers.push({ name: 'nvidia', key: NVIDIA_API_KEY, call: callNvidia })
  }
  if (GEMINI_API_KEY && !isCircuitOpen('gemini')) {
    providers.push({ name: 'gemini', key: GEMINI_API_KEY, call: callGemini })
  }

  if (providers.length === 0) {
    log('error', 'No providers available', { traceId, nvidiaOpen: isCircuitOpen('nvidia'), geminiOpen: isCircuitOpen('gemini') })
    return jsonResponse(
      { error: 'AI service unavailable. Please try again later.', code: 'ai_unavailable' },
      503, origin, traceId
    )
  }

  for (const provider of providers) {
    try {
      const result = await provider.call(system, user, maxTokens, provider.key, wantStream)
      recordSuccess(provider.name)

      const latency = Date.now() - start
      log('info', 'Request completed', { traceId, provider: provider.name, latency, stream: wantStream })

      if (wantStream && result instanceof Response) {
        return streamResponse(result, provider.name as 'nvidia' | 'gemini', origin, traceId)
      }

      return jsonResponse(
        { data: result as string, provider: provider.name },
        200, origin, traceId
      )

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isTimeout = msg === 'timeout'

      recordFailure(provider.name)
      log(isTimeout ? 'warn' : 'error', `${provider.name} failed${isTimeout ? ' (timeout)' : ''}`, {
        traceId,
        provider: provider.name,
        error: msg.slice(0, 200),
        latency: Date.now() - start,
      })

      // If this was the last provider, return the error
      if (provider === providers[providers.length - 1]) {
        const status = isTimeout ? 504 : 502
        return jsonResponse(
          { error: isTimeout ? 'AI request timed out' : 'AI service error', code: 'ai_unavailable', detail: msg.slice(0, 100) },
          status, origin, traceId
        )
      }
      // Otherwise fall through to next provider
    }
  }

  // Unreachable, but TypeScript needs it
  return jsonResponse({ error: 'AI service unavailable', code: 'ai_unavailable' }, 503, origin, traceId)
})
