/**
 * gemini-proxy — Lightweight Gemini-only proxy for the ChatBot.
 *
 * Used by: ChatBot.jsx (chat mode) — conversational multi-turn chat.
 * Auth: Supabase anon key (no JWT required — ChatBot is a low-privilege feature).
 *
 * Differences from ai-orchestrator:
 *   - Single provider (Gemini only) — simpler, faster cold start
 *   - Accepts OpenAI-style messages array for multi-turn context
 *   - Streaming support for real-time token delivery
 *   - No rate limiting here (ChatBot has client-side 20/day limit + server-side
 *     Supabase function invocation limits)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders, corsPreflightResponse } from '../_shared/cors.ts'

const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const GEMINI_BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`
const TIMEOUT_MS   = 15_000
const MAX_MESSAGES = 50    // Prevent absurdly long context
const MAX_MSG_CHARS = 4000 // Per-message character limit
const MAX_OUTPUT_TOKENS = 800

// ── Structured logging ──────────────────────────────────────────────────────
function log(level: 'info' | 'warn' | 'error', msg: string, meta: Record<string, unknown> = {}): void {
  const entry = { ts: new Date().toISOString(), level, msg: `[gemini-proxy] ${msg}`, ...meta }
  if (level === 'error') console.error(JSON.stringify(entry))
  else console.log(JSON.stringify(entry))
}

// ── Timeout utility ─────────────────────────────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  )
  return Promise.race([promise, timer])
}

// ── Response helpers ────────────────────────────────────────────────────────
function jsonResponse(body: unknown, status: number, origin: string, traceId: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json', 'X-Trace-Id': traceId },
  })
}

function sseResponse(providerRes: Response, origin: string, traceId: string): Response {
  const headers = {
    ...getCorsHeaders(origin),
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Trace-Id': traceId,
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
            const token = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            if (token) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
            }
          } catch { /* skip malformed chunks */ }
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
serve(async (req) => {
  const origin  = req.headers.get('origin') || ''
  const traceId = req.headers.get('x-trace-id') || crypto.randomUUID()
  const start   = Date.now()

  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin)
  }

  // ── API key check ──────────────────────────────────────────────────────────
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
  if (!GEMINI_API_KEY) {
    log('error', 'GEMINI_API_KEY not configured', { traceId })
    return jsonResponse({ error: 'Gemini API key not configured' }, 500, origin, traceId)
  }

  // ── Parse & validate ──────────────────────────────────────────────────────
  let body: { messages?: Array<{ role: string; content: string }>; system?: string; stream?: boolean }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin, traceId)
  }

  const { system = '', stream: wantStream = false } = body
  const messages = (body.messages || []).slice(0, MAX_MESSAGES)

  if (messages.length === 0) {
    return jsonResponse({ error: 'messages array is required and must not be empty' }, 400, origin, traceId)
  }

  // ── Convert to Gemini format ──────────────────────────────────────────────
  const geminiContents: Array<{ role: string; parts: Array<{ text: string }> }> = []

  if (system) {
    geminiContents.push({ role: 'user', parts: [{ text: system.slice(0, MAX_MSG_CHARS) }] })
    geminiContents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] })
  }

  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user'
    geminiContents.push({ role, parts: [{ text: (msg.content || '').slice(0, MAX_MSG_CHARS) }] })
  }

  // ── Call Gemini ───────────────────────────────────────────────────────────
  try {
    const endpoint = wantStream ? 'streamGenerateContent?alt=sse' : 'generateContent'
    const geminiRes = await withTimeout(
      fetch(`${GEMINI_BASE}:${endpoint}&key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.7 },
        }),
      }),
      TIMEOUT_MS
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      log('error', `Gemini ${geminiRes.status}`, { traceId, detail: errText.slice(0, 200) })
      return jsonResponse(
        { error: `Gemini error: ${geminiRes.status}`, detail: errText.slice(0, 200) },
        502, origin, traceId
      )
    }

    if (wantStream) {
      log('info', 'Streaming response', { traceId, latency: Date.now() - start })
      return sseResponse(geminiRes, origin, traceId)
    }

    const geminiData = await geminiRes.json()
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    log('info', 'Request completed', { traceId, latency: Date.now() - start, chars: text.length })
    return jsonResponse({ text }, 200, origin, traceId)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isTimeout = message === 'timeout'
    log('error', isTimeout ? 'Request timed out' : 'Upstream failed', { traceId, error: message.slice(0, 200) })

    return jsonResponse(
      { error: isTimeout ? 'AI request timed out' : 'Upstream request failed', detail: message.slice(0, 100) },
      isTimeout ? 504 : 502, origin, traceId
    )
  }
})
