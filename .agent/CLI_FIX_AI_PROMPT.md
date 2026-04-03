# CLAUDE CODE PROMPT — Fix AI Stack End-to-End (No Band-Aids)
# ════════════════════════════════════════════════════════════════
# Paste everything below into Claude Code CLI.
# ════════════════════════════════════════════════════════════════

```
You are fixing the ENTIRE AI stack in iConnect. READ THESE FILES FIRST (mandatory):
- .agent/handoff.md (session state)
- .agent/E2E_COWORK_REPORT.md (full audit — AI tests were NOT completed)
- CLAUDE.md (project rules — follow strictly)

═══ CONTEXT ═══

iConnect has TWO AI edge functions deployed on Supabase:

1. ai-orchestrator (supabase/functions/ai-orchestrator/index.ts)
   - Routes: NVIDIA Llama 3.1-70B (primary) → Gemini (fallback)
   - Auth: JWT Bearer token (user's Supabase session token)
   - Rate limit: 30 req / 60s per user
   - Returns: { data: "text..." } on success
   - Secrets needed: GEMINI_API_KEY, optionally NVIDIA_API_KEY

2. gemini-proxy (supabase/functions/gemini-proxy/index.ts)
   - Routes: Gemini only (direct proxy)
   - Auth: Supabase anon key
   - Returns: { text: "text..." } on success
   - Secrets needed: GEMINI_API_KEY

Both use model: gemini-2.0-flash-lite
Both are ALREADY DEPLOYED (confirmed in prior session).

The client-side routing is:
- ChatBot.jsx (chat mode) → calls gemini-proxy DIRECTLY
- ChatBot.jsx (doubt buster) → aiService.js → ai-orchestrator
- All other 14 AI functions → aiService.js → ai-orchestrator

aiService.js has USE_EDGE_FUNCTION = true, so everything except ChatBot chat goes through ai-orchestrator.

═══ THE API KEY ═══

The Gemini API key is: AIzaSyBbVRDLAnnhwUqM4pnTguTDU0Q6M9Ctu_c
(Google AI Studio project: "iConnect API Key")

This key must be set as a Supabase Edge Function secret so both edge functions can read it.

═══ STEP-BY-STEP FIX PLAN ═══

STEP 1: Verify/Set Supabase Secrets
─────────────────────────────────────
Run these commands:

  npx supabase secrets list

Check if GEMINI_API_KEY is listed. If not, or if it's wrong:

  npx supabase secrets set GEMINI_API_KEY=AIzaSyBbVRDLAnnhwUqM4pnTguTDU0Q6M9Ctu_c

If NVIDIA_API_KEY is not set, that's OK — ai-orchestrator will skip NVIDIA and use Gemini only.
If you have an NVIDIA API key, set it too:

  npx supabase secrets set NVIDIA_API_KEY=<key>

STEP 2: Verify Model Availability
──────────────────────────────────
Test that gemini-2.0-flash-lite is accessible with the API key:

  curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=AIzaSyBbVRDLAnnhwUqM4pnTguTDU0Q6M9Ctu_c" \
    -H "Content-Type: application/json" \
    -d '{
      "contents": [{"role": "user", "parts": [{"text": "Say hello in one word"}]}],
      "generationConfig": {"maxOutputTokens": 10, "temperature": 0.1}
    }'

Expected: JSON response with candidates[0].content.parts[0].text containing a greeting.

If you get a 404 or "model not found" error:
- The model may have been deprecated/renamed.
- Try these alternatives in order:
  1. gemini-2.0-flash-lite-001
  2. gemini-2.0-flash
  3. gemini-1.5-flash
  4. gemini-1.5-flash-latest
- If you need to change the model, update BOTH files:
  a. supabase/functions/ai-orchestrator/index.ts → line 16 (GEMINI_API_URL)
  b. supabase/functions/gemini-proxy/index.ts → line 4 (GEMINI_API_URL)
- The model name is embedded in the URL:
  https://generativelanguage.googleapis.com/v1beta/models/<MODEL_NAME>:generateContent

STEP 3: Test ai-orchestrator Edge Function (curl)
──────────────────────────────────────────────────
Get a valid JWT token first. You need to be logged in as a doctor.

Option A: Get token from browser DevTools:
  1. Open https://iconnect-med.vercel.app
  2. Login as doctor
  3. Open DevTools → Console
  4. Run: (await window.__supabase?.auth?.getSession())?.data?.session?.access_token
  5. Copy the JWT

Option B: Get token via Supabase CLI:
  # If you have a test user's email/password:
  curl -s "https://kzxsyeznpudomeqxbnvp.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6eHN5ZXpudXBkb21lcXhibnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjQ1NjEsImV4cCI6MjA4NzkwMDU2MX0.4w2UkRl3rxq2WOiQDmY4aMPGUhQ_5V4W8hridmGmy9o" \
    -H "Content-Type: application/json" \
    -d '{"email": "<test-doctor-email>", "password": "<test-password>"}'

Then test ai-orchestrator:

  JWT="<paste-token-here>"

  curl -s "https://kzxsyeznpudomeqxbnvp.supabase.co/functions/v1/ai-orchestrator" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT" \
    -d '{
      "action": "generic",
      "payload": {
        "system": "You are a helpful medical tutor.",
        "user": "What is hypertension? Answer in one sentence."
      },
      "max_tokens": 100
    }'

Expected success: { "data": "Hypertension is..." }
Expected errors and what they mean:
- 401 { "error": "Unauthorized" } → JWT is invalid/expired. Get a fresh one.
- 429 { "error": "Rate limit exceeded..." } → Too many requests. Wait 60s.
- 503 { "error": "AI service unavailable" } → BOTH NVIDIA and Gemini failed.
  This means GEMINI_API_KEY is wrong or model is unavailable.
  Go back to Step 1 and Step 2.
- 504 { "error": "AI request timed out" } → Gemini is slow. Try again.

STEP 4: Test gemini-proxy Edge Function (curl)
───────────────────────────────────────────────
  ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6eHN5ZXpudXBkb21lcXhibnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjQ1NjEsImV4cCI6MjA4NzkwMDU2MX0.4w2UkRl3rxq2WOiQDmY4aMPGUhQ_5V4W8hridmGmy9o"

  curl -s "https://kzxsyeznpudomeqxbnvp.supabase.co/functions/v1/gemini-proxy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d '{
      "system": "You are a helpful medical tutor for NEET-PG preparation.",
      "messages": [{"role": "user", "content": "What is hypertension? One sentence."}]
    }'

Expected success: { "text": "Hypertension is..." }
Expected errors:
- 500 { "error": "Gemini API key not configured" } → Secret not set. Go to Step 1.
- 502 { "error": "Gemini error: 400", "detail": "..." } → Bad model or bad key.
  Check the detail field. Common issues:
  - "API key not valid" → wrong key set in secrets
  - "models/gemini-2.0-flash-lite is not found" → model deprecated, go to Step 2

STEP 5: Verify Vercel Environment Variables
────────────────────────────────────────────
The frontend needs VITE_SUPABASE_URL to know where to send AI requests.

Check frontend/.env.local:
  VITE_SUPABASE_URL=https://kzxsyeznpudomeqxbnvp.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

These should also be set in Vercel dashboard (Settings → Environment Variables):
  VITE_SUPABASE_URL = https://kzxsyeznpudomeqxbnvp.supabase.co
  VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6eHN5ZXpudXBkb21lcXhibnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjQ1NjEsImV4cCI6MjA4NzkwMDU2MX0.4w2UkRl3rxq2WOiQDmY4aMPGUhQ_5V4W8hridmGmy9o

If these are missing from Vercel:
1. Go to https://vercel.com → your project → Settings → Environment Variables
2. Add both variables for Production + Preview
3. Trigger a new deployment: `vercel --prod` or push a commit

STEP 6: Redeploy Edge Functions (if you changed the model)
───────────────────────────────────────────────────────────
Only needed if you modified the model name in Step 2.

  npx supabase functions deploy gemini-proxy --no-verify-jwt
  npx supabase functions deploy ai-orchestrator --no-verify-jwt

STEP 7: End-to-End Browser Test
───────────────────────────────
Open https://iconnect-med.vercel.app in Chrome. Login as a doctor.

NOTE: If the navigation bug (BUG-NAV-001) is still present, you won't be able to navigate
via sidebar. Use direct URL navigation + hard refresh as a workaround:
  - ChatBot: Just click the floating chat button (bottom-right) on any page
  - Case Simulator: Navigate to https://iconnect-med.vercel.app/case-sim then Ctrl+R
  - E-Books (for Doubt Buster): https://iconnect-med.vercel.app/ebooks then Ctrl+R

Test these 5 AI features in order:

| # | Feature | How to Test | Expected |
|---|---------|-------------|----------|
| 1 | ChatBot (chat) | Click chat bubble → type "What is hypertension?" | AI responds with medical info (uses gemini-proxy) |
| 2 | Doubt Buster | ChatBot → switch to "Doubt Buster" tab → type question | AI responds with structured answer (uses ai-orchestrator) |
| 3 | Case Simulator | Navigate to Case Simulator → click "Start New Case" | AI generates clinical vignette with MCQs |
| 4 | Study Plan | Dashboard → Study Plan card → "Generate Plan" | AI generates 7-day study plan |
| 5 | Smart Notes | E-Books → open any book → select text → "Smart Notes" | AI generates note + mnemonic |

If any fail, open DevTools → Network → look for the failed request:
- Check the request URL (should be /functions/v1/ai-orchestrator or /functions/v1/gemini-proxy)
- Check the response status code and body
- Report the exact error here

STEP 8: If Model Needs Changing — Full Diff
────────────────────────────────────────────
If gemini-2.0-flash-lite is deprecated and you need to switch (e.g., to gemini-2.0-flash):

File 1: supabase/functions/ai-orchestrator/index.ts, line 16:
  BEFORE: const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent'
  AFTER:  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

File 2: supabase/functions/gemini-proxy/index.ts, line 4:
  BEFORE: const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent'
  AFTER:  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

Then redeploy both (Step 6).

═══ ARCHITECTURE SUMMARY (for reference) ═══

Frontend (aiService.js):
  USE_EDGE_FUNCTION = true
  callAI() → callAIViaEdge() → POST /functions/v1/ai-orchestrator
    - Auth: Bearer <JWT from supabase.auth.getSession()>
    - Body: { action, payload: { system, user }, max_tokens }
    - Response: { data: "text" }

  ChatBot.jsx (chat mode only):
    sendMessage() → POST /functions/v1/gemini-proxy
    - Auth: Bearer <SUPABASE_ANON_KEY>
    - Body: { system, messages: [{role, content}] }
    - Response: { text: "text" }

Edge Functions:
  ai-orchestrator → NVIDIA (if key set) → Gemini fallback → { data }
  gemini-proxy → Gemini direct → { text }

Secrets Required:
  GEMINI_API_KEY = AIzaSyBbVRDLAnnhwUqM4pnTguTDU0Q6M9Ctu_c  (REQUIRED)
  NVIDIA_API_KEY = <optional, for faster AI with Llama 3.1-70B>

═══ RULES ═══
- Follow CLAUDE.md strictly
- Do NOT hardcode API keys in any frontend file
- Do NOT expose the Gemini key in console.log or git commits
- If changing model name, update BOTH edge functions
- After any edge function change, redeploy with: npx supabase functions deploy <name> --no-verify-jwt
- After fixing, update .agent/handoff.md with what was changed
```
