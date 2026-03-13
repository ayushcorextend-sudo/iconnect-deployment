import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ALLOWED_ORIGIN = 'https://iconnect-med.vercel.app'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent'

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost') ? origin : ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
})

serve(async (req) => {
  const origin = req.headers.get('origin') || ''

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
    })
  }

  let body: { messages: Array<{ role: string; content: string }>; system?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
    })
  }

  const { messages = [], system = '' } = body

  // Convert OpenAI-style messages to Gemini format
  // assistant → model, user → user
  const geminiContents: Array<{ role: string; parts: Array<{ text: string }> }> = []

  // Prepend system prompt as a user/model exchange
  if (system) {
    geminiContents.push({ role: 'user', parts: [{ text: system }] })
    geminiContents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] })
  }

  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user'
    geminiContents.push({ role, parts: [{ text: msg.content }] })
  }

  try {
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      }),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return new Response(JSON.stringify({ error: `Gemini error: ${geminiRes.status}`, detail: errText }), {
        status: 502,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      })
    }

    const geminiData = await geminiRes.json()
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Upstream request failed', detail: String(err) }), {
      status: 502,
      headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
    })
  }
})
