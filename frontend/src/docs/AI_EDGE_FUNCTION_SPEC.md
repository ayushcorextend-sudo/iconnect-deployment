# AI Edge Function Specification
# supabase/functions/ai-orchestrator/index.ts

## Purpose
Server-side AI routing with NVIDIA Llama 3.1-70B (primary) → Gemini (fallback).
The NVIDIA API key MUST NOT touch the browser bundle — this edge function is the only
authorised caller.

## Deployment
```bash
supabase functions deploy ai-orchestrator
supabase secrets set NVIDIA_API_KEY=<your-key>
```

## Request Format
```json
POST /functions/v1/ai-orchestrator
Authorization: Bearer <supabase-session-jwt>
Content-Type: application/json

{
  "action": "generic",
  "payload": {
    "system": "System prompt string",
    "user":   "User message string"
  },
  "max_tokens": 512
}
```

## Response Format
```json
{ "data": "AI response text" }
// or on error:
{ "error": "Human-readable error message" }
```

## Implementation Requirements

### Security
- Verify Authorization header contains a valid Supabase JWT (not just anon key)
- Extract user_id from JWT for rate limiting
- Reject unauthenticated requests with 401

### Rate Limiting
- 30 requests per user per minute
- Return 429 with `{ "error": "Rate limit exceeded. Try again in N seconds." }`
- Use Supabase KV or Redis for counter storage

### Routing Logic
```typescript
// 1. Try NVIDIA (Llama 3.1-70B)
const nvidiaResult = await callNvidia(payload, NVIDIA_API_KEY);
if (!nvidiaResult.error) return nvidiaResult;

// 2. Log NVIDIA failure
console.error('NVIDIA failed, falling back to Gemini:', nvidiaResult.error);

// 3. Fall back to Gemini via gemini-proxy
const geminiResult = await callGeminiProxy(payload, GEMINI_API_KEY);
return geminiResult;
```

### Timeout
- 15 seconds per AI provider call
- Return 504 with `{ "error": "AI request timed out" }` on timeout

### Error Classification
Return structured errors distinguishing:
- `auth_error` — invalid/expired JWT
- `rate_limited` — too many requests
- `ai_unavailable` — both providers failed
- `invalid_request` — malformed payload

## Environment Variables (set via `supabase secrets set`)
| Secret | Description |
|--------|-------------|
| `NVIDIA_API_KEY` | NVIDIA NIM API key — rotate immediately if ever exposed |
| `GEMINI_API_KEY` | Already set as part of gemini-proxy deployment |

## Manual Steps for Ayush
1. Rotate the NVIDIA API key in the NVIDIA dashboard (it was in the browser bundle)
2. Set the new key: `supabase secrets set NVIDIA_API_KEY=<new-key>`
3. Deploy: `supabase functions deploy ai-orchestrator`
4. Test: flip `USE_EDGE_FUNCTION = true` in `src/lib/aiService.js`
5. Monitor edge function logs for 24h, then remove the `callGemini` direct path
