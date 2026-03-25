# AI Orchestrator Edge Function Specification

## File: `supabase/functions/ai-orchestrator/index.ts`

## Endpoint
```
POST /functions/v1/ai-orchestrator
```

## Auth
Requires valid Supabase JWT in `Authorization: Bearer <user_jwt>` header.
The JWT is obtained from `supabase.auth.getSession()` on the client.

## Request Body
```json
{
  "action": "study_plan | explain_question | doubt_buster | reading_quiz |
             smart_note | suggestions | clinical_case | audit_content |
             fatigue_check | recall_audio | sr_cards | grade_answer |
             knowledge_gap | predictive_alerts | contextual_plan",
  "payload": { ... action-specific data ... },
  "max_tokens": 512
}
```

## Response Body
```json
{
  "data": "...",
  "provider": "nvidia | gemini",
  "error": null
}
```

## Internal Logic (implement in Edge Function)

1. **Validate JWT** — reject if expired or missing. Extract `user_id` from JWT claims.
2. **Rate limit** — max 30 requests per user per minute using an in-memory sliding window Map.
   - Key: `user_id`, Value: `{ count, windowStart }`
   - If `count >= 30` and `Date.now() - windowStart < 60000`: return 429
   - Otherwise: increment count or reset window
3. **Build system+user prompts** from action + payload (same prompts as current `aiService.js`).
4. **Route to NVIDIA** (Llama-3.1-70B) first using `NVIDIA_API_KEY` env secret.
5. **Circuit breaker** — track NVIDIA failure count in module-level variable:
   - If >= 5 failures in last 60 seconds: mark as "open" (skip NVIDIA for 5 min)
   - After 5 min cool-down: "half-open" (try one request)
   - Success → "closed" (fully operational)
6. **Fallback to Gemini** (`GEMINI_API_KEY` env secret) if NVIDIA is open/failed.
7. **Return** `{ data: responseText, provider: 'nvidia' | 'gemini', error: null }`.

## Environment Secrets Required
```
NVIDIA_API_KEY=nvapi-xxxxxxxxxx
GEMINI_API_KEY=AIza...
```
Set in: Supabase Dashboard → Edge Functions → Secrets

## Deployment
```bash
supabase functions deploy ai-orchestrator --project-ref kzxsyeznpudomeqxbnvp
```

## Client Migration Status
- `USE_EDGE_FUNCTION = false` in `src/lib/aiService.js`
- Flip to `true` after deploying and smoke-testing this edge function
- The direct NVIDIA/Gemini callers are kept as `callAIDirect` fallback

## Security Notes
- Client never sends NVIDIA API key — it is only in Edge Function env
- All AI calls are authenticated (can't be used without a valid Supabase session)
- Rate limiting prevents AI token bankruptcy (Flaw #16)
- Circuit breaker prevents cascading failures (Flaw #15)
