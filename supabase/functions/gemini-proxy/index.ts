/**
 * gemini-proxy — Multi-provider AI proxy for iConnect.
 *
 * Provider priority:
 *   1. Groq  (if GROQ_API_KEY is set) — ultra-fast inference, OpenAI-compatible
 *   2. Gemini (if GEMINI_API_KEY is set) — Google's flash model
 *
 * If the primary provider fails, automatically falls back to the next.
 * If no API keys are configured, returns 503.
 *
 * Used by: aiService.js (all 15 AI features) + ChatBot.jsx (chat mode).
 * Auth: Supabase anon key (no JWT required).
 *
 * SEC-002: API keys read from Deno.env — NEVER exposed to client.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders, corsPreflightResponse } from '../_shared/cors.ts'

// ── Provider config ────────────────────────────────────────────────────────
const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL    = 'llama-3.3-70b-versatile'
const GEMINI_MODEL  = 'gemini-2.0-flash'
const GEMINI_BASE   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`

// ── Tuning constants ───────────────────────────────────────────────────────
const TIMEOUT_MS       = 20_000
const MAX_MESSAGES     = 50
const MAX_MSG_CHARS    = 4000
const MAX_OUTPUT_TOKENS = 2000

// ── Structured logging ─────────────────────────────────────────────────────
function log(level: 'info' | 'warn' | 'error', msg: string, meta: Record<string, unknown> = {}): void {
  const entry = { ts: new Date().toISOString(), level, msg: `[gemini-proxy] ${msg}`, ...meta }
  if (level === 'error') console.error(JSON.stringify(entry))
  else console.log(JSON.stringify(entry))
}

// ── Timeout utility ────────────────────────────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  )
  return Promise.race([promise, timer])
}

// ── Response helpers ───────────────────────────────────────────────────────
function jsonResponse(body: unknown, status: number, origin: string, traceId: string, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json', 'X-Trace-Id': traceId, ...extra },
  })
}

function sseResponse(providerRes: Response, provider: 'groq' | 'gemini', origin: string, traceId: string): Response {
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

            if (provider === 'groq') {
              // OpenAI-compatible streaming format
              token = parsed?.choices?.[0]?.delta?.content || ''
            } else {
              // Gemini streaming format
              token = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            }

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

// ── Provider callers ───────────────────────────────────────────────────────

interface ProviderResult {
  text?: string
  stream?: Response
}

async function callGroq(
  messages: Array<{ role: string; content: string }>,
  system: string,
  maxTokens: number,
  temperature: number,
  apiKey: string,
  stream: boolean,
): Promise<ProviderResult> {
  const groqMessages: Array<{ role: string; content: string }> = []

  if (system) {
    groqMessages.push({ role: 'system', content: system.slice(0, MAX_MSG_CHARS) })
  }

  for (const msg of messages) {
    groqMessages.push({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: (msg.content || '').slice(0, MAX_MSG_CHARS),
    })
  }

  const res = await withTimeout(
    fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        max_tokens: maxTokens,
        temperature,
        stream,
      }),
    }),
    TIMEOUT_MS,
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`)
  }

  if (stream) return { stream: res }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Groq: empty response')
  return { text }
}

async function callGemini(
  messages: Array<{ role: string; content: string }>,
  system: string,
  maxTokens: number,
  temperature: number,
  apiKey: string,
  stream: boolean,
): Promise<ProviderResult> {
  const geminiContents: Array<{ role: string; parts: Array<{ text: string }> }> = []

  if (system) {
    geminiContents.push({ role: 'user', parts: [{ text: system.slice(0, MAX_MSG_CHARS) }] })
    geminiContents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] })
  }

  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user'
    geminiContents.push({ role, parts: [{ text: (msg.content || '').slice(0, MAX_MSG_CHARS) }] })
  }

  const endpoint = stream ? 'streamGenerateContent?alt=sse&key=' : 'generateContent?key='
  const res = await withTimeout(
    fetch(`${GEMINI_BASE}:${endpoint}${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    }),
    TIMEOUT_MS,
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`)
  }

  if (stream) return { stream: res }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini: empty response')
  return { text }
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

  // ── API keys ─────────────────────────────────────────────────────────────
  const GROQ_API_KEY   = Deno.env.get('GROQ_API_KEY') || ''
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    log('error', 'No AI API keys configured (GROQ_API_KEY or GEMINI_API_KEY)', { traceId })
    return jsonResponse(
      { error: 'AI service not configured. Contact administrator.' },
      503, origin, traceId,
    )
  }

  // ── Parse & validate ────────────────────────────────────────────────────
  let body: {
    messages?: Array<{ role: string; content: string }>
    system?: string
    stream?: boolean
    maxTokens?: number
    temperature?: number
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin, traceId)
  }

  const { system = '', stream: wantStream = false } = body
  const outputTokens = Math.min(body.maxTokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS)
  const temperature  = typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 2) : 0.7
  const messages     = (body.messages || []).slice(0, MAX_MESSAGES)

  if (messages.length === 0) {
    return jsonResponse({ error: 'messages array is required and must not be empty' }, 400, origin, traceId)
  }

  // ── Build provider chain (order = priority) ─────────────────────────────
  type Provider = {
    name: 'groq' | 'gemini'
    key: string
    call: typeof callGroq
  }

  const providers: Provider[] = []
  if (GROQ_API_KEY)   providers.push({ name: 'groq',   key: GROQ_API_KEY,   call: callGroq })
  if (GEMINI_API_KEY)  providers.push({ name: 'gemini', key: GEMINI_API_KEY, call: callGemini })

  // ── Try each provider in order ──────────────────────────────────────────
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i]
    const isLast = i === providers.length - 1

    try {
      const result = await provider.call(messages, system, outputTokens, temperature, provider.key, wantStream)
      const latency = Date.now() - start

      log('info', 'Request completed', { traceId, provider: provider.name, latency, stream: wantStream })

      if (wantStream && result.stream) {
        return sseResponse(result.stream, provider.name, origin, traceId)
      }

      return jsonResponse(
        { text: result.text, provider: provider.name },
        200, origin, traceId,
      )

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const isTimeout = message === 'timeout'

      log(
        isLast ? 'error' : 'warn',
        `${provider.name} failed${isTimeout ? ' (timeout)' : ''} — ${isLast ? 'no fallback' : `falling back to ${providers[i + 1].name}`}`,
        { traceId, provider: provider.name, error: message.slice(0, 200), latency: Date.now() - start },
      )

      // If this was the last provider, return the error
      if (isLast) {
        if (message.includes('429')) {
          return jsonResponse(
            { error: 'AI service is busy. Please wait a moment and try again.' },
            429, origin, traceId,
          )
        }
        return jsonResponse(
          { error: isTimeout ? 'AI request timed out' : 'AI service error', detail: message.slice(0, 100) },
          isTimeout ? 504 : 502, origin, traceId,
        )
      }
      // Otherwise fall through to next provider
    }
  }

  // Unreachable, but TypeScript needs it
  return jsonResponse({ error: 'AI service unavailable' }, 503, origin, traceId)
})
