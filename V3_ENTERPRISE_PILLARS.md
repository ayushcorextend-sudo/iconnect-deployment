# iConnect Office — V3 Enterprise Pillars Master Execution Prompt

## Sequential Terminal Prompts for AI Coding Agent

> **CRITICAL:** This document contains 5 sequential prompts (Phases 3.1 → 3.5) to be pasted into
> your terminal AI coding agent (Claude Code / Sonnet). Each prompt MUST be executed in order.
> Each ends with a HARD STOP — do not proceed until you verify the app still builds.
>
> **PREREQUISITE:** V2 Refactoring Bible (Phases 0–3) must be completed first. These phases
> assume Zustand stores exist, React Router is wired, God Files are split, RLS is tightened,
> activity batching is live, and the PWA auto-update shell is in place.
>
> **AUTONOMY NOTE:** Each prompt includes a Full Autonomy Permissions block so Claude Code
> executes without asking for confirmation on every file operation.

---

## PILLAR → PHASE CROSS-REFERENCE

| Pillar | Description | Phase |
|--------|-------------|-------|
| 1 | Full-Stack Observability (Sentry + pg_stat_statements + distributed tracing) | Phase 3.1 |
| 2 | Idempotent APIs (idempotency_keys + concurrency locks + response caching) | Phase 3.2 |
| 3 | Advanced PWA & Background Sync (Workbox BackgroundSyncPlugin + offline queue) | Phase 3.3 |
| 4 | Semantic Search with pgvector (embeddings + cosine similarity RPC) | Phase 3.4 |
| 5 | Multi-Tenant Architecture (tenant_id + JWT claims + RLS isolation + branding) | Phase 3.5 |

---
---

# ══════════════════════════════════════════════════════════════════════════
# PROMPT 1 — PHASE 3.1: FULL-STACK OBSERVABILITY
# (Sentry, pg_stat_statements, distributed tracing, session replay)
# ══════════════════════════════════════════════════════════════════════════

```
You are enhancing an existing, functional React 19 + Supabase SaaS app called "iConnect Office".
The codebase is at: frontend/src/
The Supabase project is at: supabase/
The app builds and runs. Your job is ADDITIVE ENHANCEMENT — not a rewrite. After every major
step, the app must still build with `npm run build` in the frontend/ directory. If you break the
build, stop and fix it before continuing.

GLOBAL RULES FOR THIS ENTIRE SESSION:
- Never run `git push`. Only `git add` + `git commit`.
- After each numbered step below, run `npm run build` in the frontend/ directory. If it fails, fix
  the error before proceeding. Do NOT skip build checks.
- Do NOT modify existing Zustand stores, React Router config, or component splits from V2 refactoring.
- Use Zod (already installed at ^4.3.6) for ALL new data schemas and payloads.
- Preserve all existing RLS policies. Only ADD new ones if needed.
- Every new file must have a JSDoc header comment explaining its purpose.

═══════════════════════════════════════════════════════════════════
STEP 3.1.1 — INSTALL SENTRY SDK
═══════════════════════════════════════════════════════════════════

In the frontend/ directory:

  npm install @sentry/react

This is the ONLY new dependency for this phase.

Run `npm run build` to confirm nothing broke.
Commit: "chore: add @sentry/react for observability"

═══════════════════════════════════════════════════════════════════
STEP 3.1.2 — SENTRY INITIALIZATION MODULE
═══════════════════════════════════════════════════════════════════

Create file: src/lib/sentry.js

This module initializes Sentry ONCE at app boot. It MUST:

1. Import `* as Sentry` from `@sentry/react`.
2. Read DSN from `import.meta.env.VITE_SENTRY_DSN`. If missing or empty string, skip init
   entirely and export no-op stubs. The app MUST work identically without Sentry configured.
3. Call `Sentry.init()` with:
   - `dsn`: from env var
   - `environment`: `import.meta.env.MODE` (development | production)
   - `release`: `import.meta.env.VITE_APP_VERSION || 'dev'`
   - `integrations`: array containing:
     a. `Sentry.browserTracingIntegration()` — automatic route instrumentation
     b. `Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })` — session replay
        with full PII masking (HIPAA consideration — medical platform)
   - `tracesSampleRate`: 0.2 in production, 1.0 in development
   - `replaysSessionSampleRate`: 0.1 (10% of normal sessions)
   - `replaysOnErrorSampleRate`: 1.0 (100% of error sessions)
   - `beforeSend(event)`: a callback that:
     a. Strips any `authorization` headers from breadcrumbs (prevent token leakage)
     b. Redacts any `user.email` if present (HIPAA)
     c. Returns the sanitized event
4. Export:
   - `sentryInited` (boolean) — true only if init() was called
   - `captureException(err, context)` — wraps `Sentry.captureException` or no-op
   - `captureMessage(msg, level)` — wraps `Sentry.captureMessage` or no-op
   - `setUser(id, role)` — wraps `Sentry.setUser({ id, role })` or no-op. Never send email/name.
   - `startSpan(name, op)` — wraps `Sentry.startSpan` or returns a dummy { end(){} }
   - `addBreadcrumb(category, message, data)` — wraps `Sentry.addBreadcrumb` or no-op

Run `npm run build`.
Commit: "feat: sentry init module with HIPAA-safe PII stripping"

═══════════════════════════════════════════════════════════════════
STEP 3.1.3 — WIRE SENTRY INTO APP ENTRYPOINT
═══════════════════════════════════════════════════════════════════

Edit src/main.jsx:

1. Import `./lib/sentry.js` at the TOP of the file — before React, before anything else.
   Sentry must initialize before any React rendering so it captures all errors.
2. Do NOT wrap <App /> in Sentry.ErrorBoundary here — we'll use a custom ErrorBoundary that
   already exists or we'll create one.

Edit src/App.jsx:

1. Import `{ captureException, setUser }` from `../lib/sentry`.
2. In the useEffect that resolves the user session (useAuthStore or AuthContext), after
   successfully identifying the user, call: `setUser(userId, role)`.
3. On SIGNED_OUT, call: `setUser(null, null)` to clear Sentry user context.

Create file: src/components/ui/AppErrorBoundary.jsx

This is a React error boundary that:
1. Uses `Sentry.ErrorBoundary` if Sentry is initialized, otherwise a plain class component.
2. `componentDidCatch(error, errorInfo)`: calls `captureException(error, { extra: errorInfo })`.
3. Renders a friendly fallback UI:
   - Dark mode aware (reads darkMode from document class or useAppStore)
   - Shows: "Something went wrong" heading, a "Reload" button that calls `window.location.reload()`
   - Shows error.message in a <details> collapsible for debugging
4. Wrap the main app content in App.jsx with <AppErrorBoundary>.

Run `npm run build`.
Commit: "feat: wire Sentry into app entrypoint + error boundary"

═══════════════════════════════════════════════════════════════════
STEP 3.1.4 — DISTRIBUTED TRACE ID PROPAGATION
═══════════════════════════════════════════════════════════════════

The goal: every Supabase API call and every Edge Function invocation gets a `x-trace-id` header
so we can correlate frontend spans with backend logs.

Create file: src/lib/traceHeaders.js

Contents:
1. Import `{ startSpan, addBreadcrumb }` from `./sentry`.
2. Export function `createTraceHeaders()`:
   - Generate a trace ID: `crypto.randomUUID()` (browser-native, no dependency).
   - Return an object: `{ 'x-trace-id': traceId, 'x-request-start': Date.now().toString() }`
3. Export function `instrumentSupabaseCall(tableName, operation, fn)`:
   - Calls `startSpan(`supabase.${operation}.${tableName}`, 'db')` to create a Sentry span.
   - Creates trace headers via `createTraceHeaders()`.
   - Calls `fn(traceHeaders)` — the caller passes these headers to their Supabase call.
   - On success: `addBreadcrumb('supabase', `${operation} ${tableName} OK`, { traceId })`.
   - On error: `addBreadcrumb('supabase', `${operation} ${tableName} FAILED`, { error })`.
   - Ends the span.
   - Returns the result of fn.

Now edit src/lib/supabase.js:

For the TOP 5 most-called functions (identified by grep — likely fetchArtifacts, fetchProfiles,
fetchNotifications, insertActivityLog, updateProfile):
1. Wrap each in `instrumentSupabaseCall()`.
2. Pass `{ headers: traceHeaders }` as the Supabase client option where possible.
   Note: supabase-js supports `.from('table').select().headers()` — use that.

Do NOT instrument every function — just the top 5 by call frequency. We can expand later.

Run `npm run build`.
Commit: "feat: distributed trace ID propagation for top-5 supabase calls"

═══════════════════════════════════════════════════════════════════
STEP 3.1.5 — EDGE FUNCTION TRACE LOGGING
═══════════════════════════════════════════════════════════════════

Edit each Edge Function in supabase/functions/:
- gemini-proxy/index.ts
- welcome-email/index.ts
- send-notification-email/index.ts
- send-approval-email/index.ts

For each function:
1. At the top of the handler, extract: `const traceId = req.headers.get('x-trace-id') || 'none'`
2. Add `console.log(JSON.stringify({ traceId, fn: '<function-name>', event: 'start', ts: Date.now() }))`
   at the start of the handler.
3. Add the same structured log with `event: 'end'` and `status: <http_status>` before every
   `return new Response(...)`.
4. On errors, log `event: 'error'` with `error: e.message`.

This creates structured JSON logs in Supabase's Edge Function log viewer that can be correlated
with frontend Sentry traces via the shared trace ID.

Do NOT modify the backfill-zones function (it's a one-time migration tool).

Run `npm run build`.
Commit: "feat: structured trace logging in all edge functions"

═══════════════════════════════════════════════════════════════════
STEP 3.1.6 — DATABASE OBSERVABILITY MIGRATION
═══════════════════════════════════════════════════════════════════

Create migration file: supabase/migrations/20260318000000_observability.sql

Contents:

1. Enable pg_stat_statements extension (if not already enabled):
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

2. Create a materialized view for slow query monitoring:
   CREATE MATERIALIZED VIEW IF NOT EXISTS slow_queries AS
   SELECT
     queryid,
     LEFT(query, 200) AS query_preview,
     calls,
     mean_exec_time,
     total_exec_time,
     rows
   FROM pg_stat_statements
   WHERE mean_exec_time > 100  -- queries averaging >100ms
   ORDER BY mean_exec_time DESC
   LIMIT 50;

3. Create a function to refresh the materialized view (call periodically via cron or manually):
   CREATE OR REPLACE FUNCTION refresh_slow_queries()
   RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     REFRESH MATERIALIZED VIEW slow_queries;
   END;
   $$;

4. Create an RPC that superadmin can call from the frontend to check slow queries:
   -- Only superadmin can see slow queries
   CREATE OR REPLACE FUNCTION get_slow_queries()
   RETURNS SETOF slow_queries
   LANGUAGE sql
   SECURITY DEFINER
   AS $$
     SELECT * FROM slow_queries;
   $$;

   -- RLS: only superadmin
   REVOKE ALL ON FUNCTION get_slow_queries() FROM public;
   GRANT EXECUTE ON FUNCTION get_slow_queries() TO authenticated;

5. Create a health_checks table for uptime monitoring:
   CREATE TABLE IF NOT EXISTS health_checks (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     checked_at timestamptz NOT NULL DEFAULT now(),
     service text NOT NULL,         -- 'api', 'auth', 'storage', 'edge-fn'
     status text NOT NULL,          -- 'ok', 'degraded', 'down'
     response_ms integer,
     metadata jsonb DEFAULT '{}'
   );

   -- Only superadmin can read/write health checks
   ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "sa_health" ON health_checks FOR ALL
     USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

Run `npm run build` (frontend unchanged, but verify no regressions).
Commit: "feat: pg_stat_statements + slow_queries view + health_checks table"

═══════════════════════════════════════════════════════════════════
STEP 3.1.7 — SOURCE MAP UPLOAD SCRIPT
═══════════════════════════════════════════════════════════════════

Create file: frontend/scripts/upload-sourcemaps.sh

This is a bash script that:
1. Reads SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT from environment.
2. If any are missing, prints a warning and exits 0 (non-blocking).
3. Runs: npx @sentry/cli sourcemaps upload --release=$VITE_APP_VERSION ./dist
4. Then deletes sourcemaps from dist/ so they're NOT deployed to production:
   find ./dist -name "*.map" -delete

Add to frontend/package.json scripts:
  "build:prod": "vite build && bash scripts/upload-sourcemaps.sh"

Do NOT modify the existing "build" script — keep it as-is for development.

Run `npm run build`.
Commit: "feat: sentry source map upload script for production builds"

══════════════════════════════════════════════════════════════
HARD STOP — PHASE 3.1 COMPLETE
══════════════════════════════════════════════════════════════

Verify:
1. `npm run build` passes with zero errors.
2. App loads in browser without Sentry DSN configured (graceful no-op mode).
3. No new console errors or warnings.
4. All existing features work identically.

Git commit all remaining changes:
  git add -A && git commit -m "milestone: Phase 3.1 — Full-Stack Observability complete"

═════════════════════════════════════════════════════════════
FULL AUTONOMY PERMISSIONS — PHASE 3.1
═════════════════════════════════════════════════════════════

You have FULL permission to perform the following actions WITHOUT asking for confirmation:

READ any file in the project.
WRITE / CREATE / OVERWRITE any file in frontend/src/, frontend/scripts/, supabase/functions/, supabase/migrations/.
DELETE .bak files and sourcemap .map files ONLY.
RUN `npm install`, `npm run build`, `npm run lint`, `npx` commands in frontend/.
RUN `git add` and `git commit` (NEVER `git push`).
CREATE new directories under src/lib/, src/components/ui/, supabase/migrations/.
MODIFY package.json scripts section.
MODIFY .env.example to document new env vars (NEVER modify .env or .env.local).

You do NOT have permission to:
- Run `git push` to any remote.
- Delete the `.git` directory or any non-.bak source files.
- Modify `.env` or `.env.local` (only `.env.example`).
- Install dependencies not explicitly listed in this prompt.
- Modify existing Zustand stores, React Router config, or component structure from V2.
```

---
---

# ══════════════════════════════════════════════════════════════════════════
# PROMPT 2 — PHASE 3.2: IDEMPOTENT APIs & CONCURRENCY SAFETY
# (idempotency_keys table, edge function locks, response caching)
# ══════════════════════════════════════════════════════════════════════════

```
You are enhancing an existing, functional React 19 + Supabase SaaS app called "iConnect Office".
The codebase is at: frontend/src/
The Supabase project is at: supabase/
The app builds and runs. Your job is ADDITIVE ENHANCEMENT — not a rewrite. After every major
step, the app must still build with `npm run build` in the frontend/ directory. If you break the
build, stop and fix it before continuing.

GLOBAL RULES FOR THIS ENTIRE SESSION:
- Never run `git push`. Only `git add` + `git commit`.
- After each numbered step below, run `npm run build`. If it fails, fix before proceeding.
- Use Zod (^4.3.6) for ALL new data schemas and payloads.
- Do NOT modify existing Zustand stores, React Router config, or component structure.
- Every new file must have a JSDoc header comment.

═══════════════════════════════════════════════════════════════════
STEP 3.2.1 — IDEMPOTENCY KEYS TABLE
═══════════════════════════════════════════════════════════════════

Create migration: supabase/migrations/20260318100000_idempotency_keys.sql

Contents:

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,             -- e.g. 'exam_attempts.insert', 'quiz_attempts.insert'
  request_hash text NOT NULL,         -- SHA-256 of the request payload (for dedup verification)
  response_status smallint,           -- HTTP status of the original response
  response_body jsonb,                -- cached response body
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for fast lookup by user + endpoint
CREATE INDEX idx_idempotency_user_endpoint ON idempotency_keys(user_id, endpoint);

-- Auto-cleanup expired keys (Supabase pg_cron or manual)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM idempotency_keys WHERE expires_at < now();
$$;

-- RLS: users can only see their own keys
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_keys" ON idempotency_keys FOR ALL
  USING (auth.uid() = user_id);

Run `npm run build`.
Commit: "feat: idempotency_keys table with auto-expiry"

═══════════════════════════════════════════════════════════════════
STEP 3.2.2 — CLIENT-SIDE IDEMPOTENCY KEY GENERATOR
═══════════════════════════════════════════════════════════════════

Create file: src/lib/idempotency.js

This module provides idempotent mutation wrappers. Contents:

1. Import `{ z }` from `zod`.
2. Import `{ supabase }` from `./supabase`.
3. Import `{ captureException, addBreadcrumb }` from `./sentry`.

4. Define Zod schema for the idempotency response:
   const IdempotencyResult = z.object({
     key: z.string().uuid(),
     cached: z.boolean(),
     response: z.any()
   });

5. Export async function `idempotentInsert(endpoint, payload, options = {})`:
   a. Generate a UUID v4 key: `crypto.randomUUID()`.
   b. Compute a request hash: `await hashPayload(payload)` (see helper below).
   c. Check if a matching key already exists for this user + endpoint + hash:
      `supabase.from('idempotency_keys').select('*').eq('endpoint', endpoint).eq('request_hash', hash).gt('expires_at', new Date().toISOString()).maybeSingle()`
   d. If a cached result exists and response_body is not null:
      - Log breadcrumb: `addBreadcrumb('idempotency', 'cache hit', { endpoint, key: existing.key })`
      - Return `{ key: existing.key, cached: true, response: existing.response_body }`
   e. If no cache hit:
      - Insert the idempotency key row FIRST (this acts as a reservation):
        `supabase.from('idempotency_keys').insert({ key, user_id: (await supabase.auth.getUser()).data.user.id, endpoint, request_hash: hash })`
      - Execute the actual mutation by calling `options.mutationFn(payload)`.
      - On success: update the idempotency row with response_status + response_body.
      - On failure: delete the idempotency key (so retry is allowed).
      - Return `{ key, cached: false, response: result }`
   f. Wrap everything in try/catch. On unexpected errors, call `captureException`.

6. Helper function `async hashPayload(payload)`:
   - `const encoder = new TextEncoder()`
   - `const data = encoder.encode(JSON.stringify(payload))`
   - `const hashBuffer = await crypto.subtle.digest('SHA-256', data)`
   - Convert to hex string and return.

Run `npm run build`.
Commit: "feat: client-side idempotency key generator with cache-hit detection"

═══════════════════════════════════════════════════════════════════
STEP 3.2.3 — WIRE IDEMPOTENCY INTO CRITICAL MUTATIONS
═══════════════════════════════════════════════════════════════════

Identify the 4 most critical mutation paths where double-submission would be harmful:

1. **Exam attempt submission** — submitting an exam must not create duplicate attempts.
   Find the function that inserts into `exam_attempts` table (likely in supabase.js or a
   page component). Wrap it with `idempotentInsert('exam_attempts.insert', payload, { mutationFn })`.

2. **Quiz attempt submission** — same pattern for `quiz_attempts`.
   Wrap with `idempotentInsert('quiz_attempts.insert', ...)`.

3. **Arena answer submission** — `arena_answers` in live quiz mode.
   Wrap with `idempotentInsert('arena_answers.insert', ...)`.

4. **Doubt creation** — `doubts` table insert.
   Wrap with `idempotentInsert('doubts.insert', ...)`.

For each:
- Find the existing insert call.
- Extract the payload.
- Wrap with `idempotentInsert()`.
- The `mutationFn` is the original Supabase insert call.
- If the response is `{ cached: true }`, show a toast: "Already submitted" instead of re-processing.
- Disable the submit button during the mutation (if not already disabled).

Do NOT change the UI layout or component structure. Only add the idempotency wrapper.

Run `npm run build`.
Commit: "feat: idempotent wrappers on exam/quiz/arena/doubt submissions"

═══════════════════════════════════════════════════════════════════
STEP 3.2.4 — DATABASE-LEVEL CONCURRENCY LOCK FOR EXAMS
═══════════════════════════════════════════════════════════════════

Create migration: supabase/migrations/20260318100001_exam_concurrency_lock.sql

The problem: two browser tabs could submit the same exam simultaneously. The client-side
idempotency check has a race window. We need a DB-level unique constraint.

Contents:

-- Prevent duplicate exam attempts: one active attempt per user per exam subject
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_exam_attempt
  ON exam_attempts(user_id, subject_id)
  WHERE status = 'in_progress';

-- Prevent duplicate quiz attempts within a time window (5 minutes)
CREATE OR REPLACE FUNCTION check_quiz_attempt_cooldown()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM quiz_attempts
    WHERE user_id = NEW.user_id
      AND quiz_id = NEW.quiz_id
      AND created_at > now() - interval '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Quiz attempt cooldown: please wait 5 minutes between attempts'
      USING ERRCODE = '23505'; -- unique_violation code for consistent error handling
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quiz_attempt_cooldown
  BEFORE INSERT ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION check_quiz_attempt_cooldown();

-- Advisory lock function for exam submission serialization
CREATE OR REPLACE FUNCTION acquire_exam_lock(p_user_id uuid, p_subject_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  lock_key bigint;
BEGIN
  -- Generate a deterministic lock key from user + subject
  lock_key := abs(hashtext(p_user_id::text || p_subject_id::text));
  RETURN pg_try_advisory_xact_lock(lock_key);
END;
$$;

Run `npm run build`.
Commit: "feat: DB-level concurrency locks for exam + quiz submissions"

═══════════════════════════════════════════════════════════════════
STEP 3.2.5 — EDGE FUNCTION: IDEMPOTENT EXAM SUBMIT
═══════════════════════════════════════════════════════════════════

Create edge function: supabase/functions/submit-exam/index.ts

This function handles exam submission with full server-side idempotency:

1. Accept POST with JSON body: { attempt_id, answers, idempotency_key }
2. Validate with Zod (inline TypeScript schema).
3. Extract user from `Authorization` header → supabase.auth.getUser().
4. Extract trace ID: `req.headers.get('x-trace-id') || crypto.randomUUID()`.
5. Check idempotency_keys table for existing key:
   - If found with response_body: return cached response immediately (HTTP 200).
6. Acquire advisory lock: `SELECT acquire_exam_lock(user_id, subject_id)`.
   - If lock not acquired: return HTTP 409 Conflict with message "Submission in progress".
7. Process the exam:
   - Calculate score server-side (count correct answers from exam_questions).
   - Update exam_attempts row with: score, answers, status='completed', completed_at=now().
   - Insert activity_log entry: activity_type='exam_completed'.
8. Cache result in idempotency_keys: response_status=200, response_body=result.
9. Return JSON: { score, total, percentage, attempt_id }.

Add structured trace logging (same pattern as Phase 3.1.5).

CORS: Set allowed origin to VITE_APP_URL env var or `https://iconnect-med.vercel.app`.

Run `npm run build`.
Commit: "feat: idempotent server-side exam submission edge function"

══════════════════════════════════════════════════════════════
HARD STOP — PHASE 3.2 COMPLETE
══════════════════════════════════════════════════════════════

Verify:
1. `npm run build` passes with zero errors.
2. Exam submission button is disabled during processing.
3. Double-clicking submit does NOT create duplicate attempts.
4. All existing quiz/arena/doubt flows work identically.

Git commit all remaining changes:
  git add -A && git commit -m "milestone: Phase 3.2 — Idempotent APIs & Concurrency Safety complete"

═════════════════════════════════════════════════════════════
FULL AUTONOMY PERMISSIONS — PHASE 3.2
═════════════════════════════════════════════════════════════

You have FULL permission to perform the following actions WITHOUT asking for confirmation:

READ any file in the project.
WRITE / CREATE / OVERWRITE any file in frontend/src/, supabase/functions/, supabase/migrations/.
DELETE .bak files ONLY.
RUN `npm install`, `npm run build`, `npm run lint`, `npx` commands in frontend/.
RUN `git add` and `git commit` (NEVER `git push`).
CREATE new directories under src/lib/, supabase/functions/.
MODIFY package.json scripts section.
MODIFY .env.example to document new env vars.

You do NOT have permission to:
- Run `git push` to any remote.
- Delete the `.git` directory or any non-.bak source files.
- Modify `.env` or `.env.local` (only `.env.example`).
- Install dependencies not explicitly listed in this prompt.
- Modify existing Zustand stores, React Router config, or component structure from V2.
```

---
---

# ══════════════════════════════════════════════════════════════════════════
# PROMPT 3 — PHASE 3.3: ADVANCED PWA & BACKGROUND SYNC
# (Workbox BackgroundSyncPlugin, ServiceWorker POST interception, offline queue)
# ══════════════════════════════════════════════════════════════════════════

```
You are enhancing an existing, functional React 19 + Supabase SaaS app called "iConnect Office".
The codebase is at: frontend/src/
The Vite config is at: frontend/vite.config.js (already has VitePWA with workbox config).
The app builds and runs. Your job is ADDITIVE ENHANCEMENT — not a rewrite.

GLOBAL RULES FOR THIS ENTIRE SESSION:
- Never run `git push`. Only `git add` + `git commit`.
- After each numbered step below, run `npm run build`. If it fails, fix before proceeding.
- The existing VitePWA config in vite.config.js is functional. Extend it, don't replace.
- Use Zod for ALL new schemas.
- Every new file must have a JSDoc header comment.

CONTEXT — CURRENT PWA STATE:
The app already has VitePWA configured with:
- registerType: 'autoUpdate', skipWaiting: true, clientsClaim: true
- Google Fonts CacheFirst caching
- Supabase *.supabase.co NetworkOnly (correctly never cached)
- navigateFallback: 'index.html'
- Precaches all static assets

We are ADDING:
- A custom service worker module that intercepts failed POST/PUT/PATCH requests
- Workbox BackgroundSyncPlugin for automatic retry when connectivity returns
- An IndexedDB-backed queue visible in the UI so users know what's pending
- OS-level sync event trigger

═══════════════════════════════════════════════════════════════════
STEP 3.3.1 — INSTALL WORKBOX LIBRARIES
═══════════════════════════════════════════════════════════════════

In the frontend/ directory:

  npm install workbox-background-sync workbox-strategies workbox-routing idb-keyval

These are used in the custom service worker code. `idb-keyval` is a tiny IndexedDB wrapper
for the offline queue metadata.

Run `npm run build`.
Commit: "chore: add workbox-background-sync + idb-keyval for offline sync"

═══════════════════════════════════════════════════════════════════
STEP 3.3.2 — CUSTOM SERVICE WORKER MODULE
═══════════════════════════════════════════════════════════════════

Create file: frontend/src/sw-custom.js

IMPORTANT: This is a service worker module that VitePWA will merge into the generated sw.js.
It runs in the ServiceWorker global scope (no DOM access, no React).

Update vite.config.js to include this custom SW code. In the VitePWA config, change from
auto-generated to injectManifest mode OR use the `workbox.importScripts` option:

Option A (preferred — keep generateSW but add import):
  In the workbox config, add:
  ```
  importScripts: ['sw-custom.js']
  ```
  And copy sw-custom.js to the public/ directory so it's served as-is.

Option B (if Option A doesn't work with VitePWA):
  Switch to `strategies: 'injectManifest'` and set `srcDir: 'src'`, `filename: 'sw-custom.js'`
  then ensure sw-custom.js includes `/// <reference lib="webworker" />` and calls
  `precacheAndRoute(self.__WB_MANIFEST)`.

Choose whichever integrates cleanly. The key requirement is that sw-custom.js code runs in the
service worker context.

Contents of sw-custom.js:

1. Import `BackgroundSyncPlugin` from `workbox-background-sync`.
2. Import `NetworkOnly` from `workbox-strategies`.
3. Import `registerRoute` from `workbox-routing`.

4. Create BackgroundSyncPlugin instance:
   ```
   const bgSyncPlugin = new BackgroundSyncPlugin('iconnect-offline-queue', {
     maxRetentionTime: 24 * 60, // 24 hours in minutes
     onSync: async ({ queue }) => {
       let entry;
       while ((entry = await queue.shiftRequest())) {
         try {
           const response = await fetch(entry.request.clone());
           if (!response.ok) throw new Error(`HTTP ${response.status}`);
           // Notify the client that a request was replayed
           const clients = await self.clients.matchAll();
           clients.forEach(client => {
             client.postMessage({
               type: 'BG_SYNC_REPLAY',
               url: entry.request.url,
               status: 'success'
             });
           });
         } catch (err) {
           // Put it back if it failed
           await queue.unshiftRequest(entry);
           throw err; // Workbox will retry on next sync event
         }
       }
     }
   });
   ```

5. Register routes for Supabase POST/PUT/PATCH/DELETE mutations:
   ```
   registerRoute(
     ({ url, request }) =>
       url.hostname.endsWith('.supabase.co') &&
       ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
     new NetworkOnly({ plugins: [bgSyncPlugin] }),
     'POST' // method matching
   );
   ```
   Repeat for PUT, PATCH, DELETE methods.

6. Listen for the 'sync' event (OS-level background sync):
   ```
   self.addEventListener('sync', (event) => {
     if (event.tag === 'iconnect-offline-queue') {
       event.waitUntil(bgSyncPlugin.replayRequests());
     }
   });
   ```

7. Listen for messages from the client:
   ```
   self.addEventListener('message', (event) => {
     if (event.data?.type === 'GET_QUEUE_SIZE') {
       // Respond with current queue size
       bgSyncPlugin.queue.size().then(size => {
         event.source.postMessage({ type: 'QUEUE_SIZE', size });
       });
     }
   });
   ```

Run `npm run build`.
Commit: "feat: custom service worker with Workbox BackgroundSyncPlugin"

═══════════════════════════════════════════════════════════════════
STEP 3.3.3 — OFFLINE QUEUE STORE (ZUSTAND)
═══════════════════════════════════════════════════════════════════

Create file: src/stores/useOfflineStore.js

This Zustand store tracks the offline queue state for UI display:

```
import { create } from 'zustand';

export const useOfflineStore = create((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  lastSyncAt: null,
  replayLog: [],  // { url, status, timestamp }

  setOnline: (val) => set({ isOnline: val }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),
  addReplayEntry: (entry) => set(state => ({
    replayLog: [...state.replayLog.slice(-19), { ...entry, timestamp: Date.now() }]
  })),
}));
```

Create file: src/lib/offlineSync.js

This module bridges the ServiceWorker messages with the Zustand store:

1. Import `useOfflineStore` from stores.
2. Listen for online/offline events:
   ```
   window.addEventListener('online', () => {
     useOfflineStore.getState().setOnline(true);
     // Request a sync when we come back online
     if ('serviceWorker' in navigator && 'SyncManager' in window) {
       navigator.serviceWorker.ready.then(reg => {
         reg.sync.register('iconnect-offline-queue');
       });
     }
   });
   window.addEventListener('offline', () => {
     useOfflineStore.getState().setOnline(false);
   });
   ```
3. Listen for ServiceWorker messages:
   ```
   navigator.serviceWorker?.addEventListener('message', (event) => {
     if (event.data?.type === 'BG_SYNC_REPLAY') {
       useOfflineStore.getState().addReplayEntry({
         url: event.data.url,
         status: event.data.status
       });
       useOfflineStore.getState().setLastSyncAt(Date.now());
       // Refresh pending count
       pollQueueSize();
     }
     if (event.data?.type === 'QUEUE_SIZE') {
       useOfflineStore.getState().setPendingCount(event.data.size);
     }
   });
   ```
4. Export `pollQueueSize()` that sends `{ type: 'GET_QUEUE_SIZE' }` to the SW.
5. Call `pollQueueSize()` on init and every 30 seconds.

Wire this into src/main.jsx: import `./lib/offlineSync` AFTER sentry init.

Run `npm run build`.
Commit: "feat: offline queue Zustand store + SW bridge"

═══════════════════════════════════════════════════════════════════
STEP 3.3.4 — OFFLINE STATUS INDICATOR COMPONENT
═══════════════════════════════════════════════════════════════════

Create file: src/components/ui/OfflineIndicator.jsx

A small, unobtrusive component that appears ONLY when offline or when pending items exist:

1. Import `useOfflineStore` from stores.
2. If `isOnline` and `pendingCount === 0`: render nothing (return null).
3. If `!isOnline`: render a fixed-bottom banner (amber/yellow) with:
   - "You're offline — changes will sync when connected"
   - Animated wifi-off icon from lucide-react
   - If pendingCount > 0: show "(X pending)"
4. If `isOnline` and `pendingCount > 0`: render a small pill in the corner:
   - "Syncing X items..."
   - Animated spinner
   - This disappears when pendingCount reaches 0.
5. Use Tailwind classes. Respect dark mode (dark: variants).
6. Use z-index from the Z-index scale: Z.TOAST (import from styles/zIndex.js).
7. Add framer-motion AnimatePresence for smooth enter/exit.

Wire this into App.jsx: render <OfflineIndicator /> at the top level, outside of <Suspense>.

Run `npm run build`.
Commit: "feat: offline status indicator with pending count"

══════════════════════════════════════════════════════════════
HARD STOP — PHASE 3.3 COMPLETE
══════════════════════════════════════════════════════════════

Verify:
1. `npm run build` passes with zero errors.
2. App loads normally in browser (online mode — indicator hidden).
3. Simulate offline in DevTools → Network → Offline:
   - Amber banner appears.
   - Mutations queue instead of failing.
4. Go back online → queued items replay automatically.
5. All existing features work identically.

Git commit:
  git add -A && git commit -m "milestone: Phase 3.3 — Advanced PWA & Background Sync complete"

═════════════════════════════════════════════════════════════
FULL AUTONOMY PERMISSIONS — PHASE 3.3
═════════════════════════════════════════════════════════════

You have FULL permission to perform the following actions WITHOUT asking for confirmation:

READ any file in the project.
WRITE / CREATE / OVERWRITE any file in frontend/src/, frontend/public/, frontend/vite.config.js.
DELETE .bak files ONLY.
RUN `npm install`, `npm run build`, `npm run lint`, `npx` commands in frontend/.
RUN `git add` and `git commit` (NEVER `git push`).
CREATE new directories under src/lib/, src/stores/, src/components/ui/.
MODIFY vite.config.js (extend, not replace).
MODIFY package.json scripts and dependencies.
MODIFY .env.example to document new env vars.

You do NOT have permission to:
- Run `git push` to any remote.
- Delete the `.git` directory or any non-.bak source files.
- Modify `.env` or `.env.local`.
- Modify existing Zustand stores (useAuthStore, useAppStore, useChatStore, useReaderStore).
- Remove or modify the existing VitePWA manifest or caching rules. Only ADD new rules.
```

---
---

# ══════════════════════════════════════════════════════════════════════════
# PROMPT 4 — PHASE 3.4: SEMANTIC SEARCH WITH PGVECTOR
# (PDF chunking, OpenAI embeddings, cosine similarity RPC)
# ══════════════════════════════════════════════════════════════════════════

```
You are enhancing an existing, functional React 19 + Supabase SaaS app called "iConnect Office".
The codebase is at: frontend/src/
The Supabase project is at: supabase/
The app builds and runs. Your job is ADDITIVE ENHANCEMENT — not a rewrite.

GLOBAL RULES FOR THIS ENTIRE SESSION:
- Never run `git push`. Only `git add` + `git commit`.
- After each numbered step below, run `npm run build`. If it fails, fix before proceeding.
- Use Zod for ALL new schemas and payloads.
- Every new file must have a JSDoc header comment.

CONTEXT — CURRENT CONTENT:
The app has an `artifacts` table storing e-books/PDFs for medical PG aspirants. Each artifact
has: id (uuid), title, description, category, subcategory, file_url, thumbnail_url, etc.
Currently there is NO full-text search — users can only filter by category/subcategory.

We are ADDING:
- pgvector extension for embedding storage
- A chunking + embedding pipeline (edge function)
- A cosine similarity search RPC
- A search UI component

═══════════════════════════════════════════════════════════════════
STEP 3.4.1 — PGVECTOR SCHEMA MIGRATION
═══════════════════════════════════════════════════════════════════

Create migration: supabase/migrations/20260318200000_semantic_search.sql

Contents:

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Chunk table: stores text chunks from artifacts with their embeddings
CREATE TABLE IF NOT EXISTS artifact_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  chunk_index smallint NOT NULL,        -- order within the artifact (0-based)
  content text NOT NULL,                -- the actual text chunk (max ~500 tokens)
  token_count smallint NOT NULL,        -- approximate token count for cost tracking
  embedding vector(1536) NOT NULL,      -- OpenAI text-embedding-3-small output dimension
  metadata jsonb DEFAULT '{}',          -- page number, section heading, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

-- HNSW index for fast approximate nearest neighbor search
-- m=16, ef_construction=64 are good defaults for <100k rows
CREATE INDEX idx_chunks_embedding ON artifact_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index for looking up all chunks of an artifact
CREATE INDEX idx_chunks_artifact ON artifact_chunks(artifact_id);

-- Track which artifacts have been embedded (avoid re-processing)
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  chunks_count smallint DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artifact_id)
);

-- RLS for chunks: all authenticated users can read (same as artifacts)
ALTER TABLE artifact_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_chunks" ON artifact_chunks FOR SELECT
  TO authenticated USING (true);

-- Only superadmin/contentadmin can manage chunks (via edge function service role)
CREATE POLICY "manage_chunks" ON artifact_chunks FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'contentadmin'));

-- RLS for embedding_jobs
ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_jobs" ON embedding_jobs FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "manage_jobs" ON embedding_jobs FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'contentadmin'));

-- Cosine similarity search RPC
CREATE OR REPLACE FUNCTION search_artifacts(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  chunk_id uuid,
  artifact_id uuid,
  artifact_title text,
  chunk_content text,
  chunk_index smallint,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ac.id AS chunk_id,
    ac.artifact_id,
    a.title AS artifact_title,
    ac.content AS chunk_content,
    ac.chunk_index,
    1 - (ac.embedding <=> query_embedding) AS similarity
  FROM artifact_chunks ac
  JOIN artifacts a ON a.id = ac.artifact_id
  WHERE 1 - (ac.embedding <=> query_embedding) > match_threshold
  ORDER BY ac.embedding <=> query_embedding
  LIMIT match_count;
$$;

Run `npm run build`.
Commit: "feat: pgvector schema + HNSW index + cosine similarity RPC"

═══════════════════════════════════════════════════════════════════
STEP 3.4.2 — EMBEDDING GENERATION EDGE FUNCTION
═══════════════════════════════════════════════════════════════════

Create edge function: supabase/functions/generate-embeddings/index.ts

This function is called by superadmin/contentadmin to embed an artifact's text content.

Flow:
1. Accept POST: `{ artifact_id }`. Validate with Zod.
2. Authenticate: only superadmin or contentadmin roles.
3. Check embedding_jobs: if already 'completed', return early with 'already_embedded'.
4. Create/update embedding_jobs row: status='processing', started_at=now().
5. Fetch the artifact from `artifacts` table to get `file_url`.
6. Download the PDF/text content from Supabase Storage:
   - Use the service role client to get a signed URL.
   - Fetch the file content.
   - For PDFs: extract raw text. Use a simple approach — iterate pages and extract text.
     NOTE: In Deno edge functions, we can use a lightweight PDF text extraction library.
     If PDF parsing is too complex in Deno, accept a `raw_text` field in the request body
     as an alternative (the client extracts text from the PDF and sends it).
7. Chunk the text:
   - Split into ~400-token chunks with ~50-token overlap.
   - Token estimation: `Math.ceil(text.length / 4)` (rough English approximation).
   - Chunk boundaries: prefer splitting at paragraph breaks (\n\n), then sentence endings (.!?),
     then word boundaries.
   - Each chunk gets a `chunk_index` (0-based).
8. Generate embeddings via OpenAI API:
   - Endpoint: `https://api.openai.com/v1/embeddings`
   - Model: `text-embedding-3-small`
   - Send chunks in batches of 20 (API limit per request).
   - API key from env: `OPENAI_API_KEY`
9. Insert all chunks + embeddings into `artifact_chunks` table using service role client.
10. Update embedding_jobs: status='completed', chunks_count=N, completed_at=now().
11. On any error: update embedding_jobs: status='failed', error_message=err.message.

Add structured trace logging (x-trace-id pattern from Phase 3.1.5).

Environment variables needed: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

Run `npm run build`.
Commit: "feat: embedding generation edge function with chunking pipeline"

═══════════════════════════════════════════════════════════════════
STEP 3.4.3 — CLIENT-SIDE SEARCH QUERY FUNCTION
═══════════════════════════════════════════════════════════════════

Create file: src/lib/semanticSearch.js

Contents:

1. Import `{ supabase }` from `./supabase`.
2. Import `{ captureException, addBreadcrumb }` from `./sentry`.
3. Import `{ z }` from `zod`.

4. Define schemas:
   ```
   const SearchResult = z.object({
     chunk_id: z.string().uuid(),
     artifact_id: z.string().uuid(),
     artifact_title: z.string(),
     chunk_content: z.string(),
     chunk_index: z.number(),
     similarity: z.number()
   });
   ```

5. Export async function `semanticSearch(query, options = {})`:
   a. `const { threshold = 0.7, limit = 10 } = options`.
   b. First, get the embedding for the search query by calling the OpenAI embeddings API
      via a Supabase Edge Function (do NOT call OpenAI directly from the client):
      ```
      const { data, error } = await supabase.functions.invoke('query-embedding', {
        body: { text: query }
      });
      ```
   c. Then call the RPC:
      ```
      const { data: results, error } = await supabase.rpc('search_artifacts', {
        query_embedding: data.embedding,
        match_threshold: threshold,
        match_count: limit
      });
      ```
   d. Validate results with Zod: `z.array(SearchResult).parse(results)`.
   e. Group results by artifact_id (combine multiple chunks from same artifact).
   f. Return grouped results sorted by highest similarity.
   g. On error: `captureException(error)`, return empty array.

Run `npm run build`.
Commit: "feat: client-side semantic search function with Zod validation"

═══════════════════════════════════════════════════════════════════
STEP 3.4.4 — QUERY EMBEDDING EDGE FUNCTION
═══════════════════════════════════════════════════════════════════

Create edge function: supabase/functions/query-embedding/index.ts

Simple function that converts a search query to an embedding:

1. Accept POST: `{ text }`. Validate text is non-empty string, max 500 chars.
2. Authenticate: any authenticated user.
3. Call OpenAI embeddings API: model='text-embedding-3-small', input=text.
4. Return: `{ embedding: response.data[0].embedding }`.
5. Rate limit: check that user hasn't made more than 30 search queries in the last minute
   (query activity_logs or use a simple in-memory counter per user).

Add structured trace logging.

Run `npm run build`.
Commit: "feat: query-embedding edge function for search"

═══════════════════════════════════════════════════════════════════
STEP 3.4.5 — SEMANTIC SEARCH UI COMPONENT
═══════════════════════════════════════════════════════════════════

Create file: src/components/SemanticSearch.jsx

A search component that can be embedded in the E-Books page or used globally:

1. Input field with debounced search (300ms debounce).
2. Minimum 3 characters before searching.
3. Loading skeleton while search is in progress.
4. Results displayed as cards showing:
   - Artifact title (links to the artifact/e-book)
   - Relevant text chunk with the search query highlighted
   - Similarity score as a visual bar (e.g., 85% match)
   - Chunk context: "Found in section X, page Y" (from metadata)
5. "No results" state with suggestions.
6. Error state with retry button.
7. Keyboard navigation: arrow keys to move between results, Enter to open.
8. Use Tailwind + dark mode. Respect existing design patterns.
9. Use framer-motion for result card stagger animation (50ms delay per card).

Wire this component into the E-Books page (likely EBooksPage.jsx or its split equivalent):
- Add a search toggle button in the page header.
- When active, the search bar appears above the artifact grid.
- Search results replace the artifact grid temporarily.

Run `npm run build`.
Commit: "feat: semantic search UI with debounce + result highlighting"

══════════════════════════════════════════════════════════════
HARD STOP — PHASE 3.4 COMPLETE
══════════════════════════════════════════════════════════════

Verify:
1. `npm run build` passes with zero errors.
2. E-Books page loads normally without search active.
3. Search toggle shows the search bar.
4. If no embeddings exist yet, search returns "No results" gracefully.
5. All existing features work identically.

Git commit:
  git add -A && git commit -m "milestone: Phase 3.4 — Semantic Search with pgvector complete"

═════════════════════════════════════════════════════════════
FULL AUTONOMY PERMISSIONS — PHASE 3.4
═════════════════════════════════════════════════════════════

You have FULL permission to perform the following actions WITHOUT asking for confirmation:

READ any file in the project.
WRITE / CREATE / OVERWRITE any file in frontend/src/, supabase/functions/, supabase/migrations/.
DELETE .bak files ONLY.
RUN `npm install`, `npm run build`, `npm run lint`, `npx` commands in frontend/.
RUN `git add` and `git commit` (NEVER `git push`).
CREATE new edge function directories under supabase/functions/.
MODIFY .env.example to document new env vars (OPENAI_API_KEY).

You do NOT have permission to:
- Run `git push` to any remote.
- Delete the `.git` directory or any non-.bak source files.
- Modify `.env` or `.env.local`.
- Call OpenAI API directly from the client (always through edge functions).
- Modify existing page component structure. Only ADD the search component.
- Modify existing Zustand stores.
```

---
---

# ══════════════════════════════════════════════════════════════════════════
# PROMPT 5 — PHASE 3.5: MULTI-TENANT ARCHITECTURE
# (tenant_id, JWT claims, RLS isolation, dynamic branding)
# ══════════════════════════════════════════════════════════════════════════

```
You are enhancing an existing, functional React 19 + Supabase SaaS app called "iConnect Office".
The codebase is at: frontend/src/
The Supabase project is at: supabase/
The app builds and runs. Your job is ADDITIVE ENHANCEMENT — not a rewrite.

GLOBAL RULES FOR THIS ENTIRE SESSION:
- Never run `git push`. Only `git add` + `git commit`.
- After each numbered step below, run `npm run build`. If it fails, fix before proceeding.
- Use Zod for ALL new schemas.
- Every new file must have a JSDoc header comment.
- CRITICAL: This phase touches RLS policies on nearly every table. Be EXTREMELY careful.
  Test every RLS change against the existing role hierarchy: superadmin > contentadmin > doctor.
  Never BREAK existing access patterns — only ADD tenant isolation on top.

CONTEXT — WHY MULTI-TENANT:
iConnect Office is currently single-tenant (one medical institution: Icon Lifesciences).
We are architecting it so the same codebase can serve multiple medical colleges, each with:
- Their own data isolation (students only see their institution's content)
- Custom branding (logo, colors, institution name)
- Shared superadmin oversight (Icon Lifesciences sees everything)
- The existing "Icon" deployment becomes tenant_id = 'icon-lifesciences' (the default)

═══════════════════════════════════════════════════════════════════
STEP 3.5.1 — TENANTS TABLE & SEED DATA
═══════════════════════════════════════════════════════════════════

Create migration: supabase/migrations/20260318300000_multi_tenant.sql

Contents:

-- Tenants table: one row per institution
CREATE TABLE IF NOT EXISTS tenants (
  id text PRIMARY KEY,                    -- kebab-case slug, e.g. 'icon-lifesciences'
  name text NOT NULL,                     -- Display name, e.g. 'Icon Lifesciences'
  domain text UNIQUE,                     -- Custom domain, e.g. 'learn.iconlifesciences.com'
  logo_url text,                          -- Institution logo
  primary_color text DEFAULT '#6366F1',   -- Brand primary color (hex)
  secondary_color text DEFAULT '#1E1B4B', -- Brand secondary color (hex)
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb DEFAULT '{}',            -- Feature flags, custom config per tenant
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the default tenant (existing Icon Lifesciences deployment)
INSERT INTO tenants (id, name, domain, logo_url, primary_color, secondary_color)
VALUES (
  'icon-lifesciences',
  'Icon Lifesciences',
  'iconnect-med.vercel.app',
  '/icons/icon-512.png',
  '#6366F1',
  '#1E1B4B'
) ON CONFLICT (id) DO NOTHING;

-- RLS: all authenticated users can read tenants, only superadmin can manage
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_tenants" ON tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage_tenants" ON tenants FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

Run `npm run build`.
Commit: "feat: tenants table with seed data for Icon Lifesciences"

═══════════════════════════════════════════════════════════════════
STEP 3.5.2 — ADD tenant_id TO ALL DATA TABLES
═══════════════════════════════════════════════════════════════════

Create migration: supabase/migrations/20260318300001_add_tenant_id_columns.sql

Add a `tenant_id` column to EVERY user-facing data table, defaulting to 'icon-lifesciences'
(the existing deployment). This is a NON-BREAKING migration — all existing data gets the default.

Tables to modify (add tenant_id text REFERENCES tenants(id) DEFAULT 'icon-lifesciences'):

-- Core user data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;

-- Content
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;
ALTER TABLE video_lectures ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;
ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;

-- Activity & scoring
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;
ALTER TABLE user_scores ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;

-- Notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;

-- Live interactive
ALTER TABLE live_arenas ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;
ALTER TABLE doubts ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;

-- Learning
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;
ALTER TABLE spaced_repetition_cards ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;

-- Embeddings
ALTER TABLE artifact_chunks ADD COLUMN IF NOT EXISTS tenant_id text
  REFERENCES tenants(id) DEFAULT 'icon-lifesciences' NOT NULL;

-- Index tenant_id on high-traffic tables for performance
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_tenant ON artifacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_tenant ON exam_attempts(tenant_id);

-- Backfill all existing rows (they should already have the default, but ensure it)
UPDATE profiles SET tenant_id = 'icon-lifesciences' WHERE tenant_id IS NULL;
UPDATE artifacts SET tenant_id = 'icon-lifesciences' WHERE tenant_id IS NULL;
UPDATE activity_logs SET tenant_id = 'icon-lifesciences' WHERE tenant_id IS NULL;

Run `npm run build`.
Commit: "feat: add tenant_id column to all data tables with default backfill"

═══════════════════════════════════════════════════════════════════
STEP 3.5.3 — JWT CUSTOM CLAIMS HOOK
═══════════════════════════════════════════════════════════════════

Create migration: supabase/migrations/20260318300002_jwt_tenant_claim.sql

Supabase supports custom access token hooks that inject claims into the JWT.
We add the user's tenant_id to their JWT so RLS can read it without querying profiles.

Contents:

-- Function that Supabase Auth calls on every token refresh
-- It looks up the user's tenant_id from profiles and injects it into the JWT claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_tenant text;
  user_role text;
BEGIN
  -- Get the user's tenant and role from profiles
  SELECT p.tenant_id, p.role INTO user_tenant, user_role
  FROM profiles p
  WHERE p.id = (event->>'user_id')::uuid;

  -- If no profile found, use defaults
  user_tenant := COALESCE(user_tenant, 'icon-lifesciences');
  user_role := COALESCE(user_role, 'doctor');

  -- Extract existing claims
  claims := event->'claims';

  -- Inject custom claims
  claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant));
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));

  -- Return modified event
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant Supabase Auth the ability to call this hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- IMPORTANT: After applying this migration, you must enable the hook in Supabase Dashboard:
-- Authentication → Hooks → Enable "Custom Access Token" → Point to public.custom_access_token_hook
-- This cannot be done via SQL alone.

Run `npm run build`.
Commit: "feat: JWT custom access token hook injecting tenant_id + role"

═══════════════════════════════════════════════════════════════════
STEP 3.5.4 — TENANT-AWARE RLS POLICIES
═══════════════════════════════════════════════════════════════════

Create migration: supabase/migrations/20260318300003_tenant_rls.sql

This is the most critical step. We ADD tenant isolation to existing RLS policies WITHOUT
breaking existing access patterns. The pattern:

- Regular users (doctor, contentadmin) can only see data from their own tenant.
- Superadmin can see ALL tenants (cross-tenant visibility for platform owner).
- The tenant_id comes from the JWT claim (no extra query needed).

Helper function to extract tenant from JWT:

CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'tenant_id',
    'icon-lifesciences'
  );
$$;

Helper function to check if user is superadmin (cross-tenant access):

CREATE OR REPLACE FUNCTION auth.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'user_role',
    'doctor'
  ) = 'superadmin';
$$;

Now, for each table that has tenant_id, ADD a tenant isolation policy.
IMPORTANT: Do NOT drop existing policies. ADD new ones that AND with existing conditions.

The pattern for each table:

-- Example for artifacts:
CREATE POLICY "tenant_isolation_artifacts" ON artifacts
  FOR ALL
  USING (
    auth.is_superadmin()                    -- superadmin sees all
    OR tenant_id = auth.tenant_id()         -- others see only their tenant
  );

Apply this pattern to ALL tables that received tenant_id in Step 3.5.2:
- profiles
- artifacts
- quizzes
- video_lectures
- flashcard_decks
- conferences
- activity_logs
- user_scores
- notifications
- live_arenas
- doubts
- exam_attempts
- quiz_attempts
- spaced_repetition_cards
- artifact_chunks

ALSO: Update INSERT policies to auto-set tenant_id on new rows:

-- Ensure new rows get the user's tenant_id
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.tenant_id = 'icon-lifesciences' THEN
    NEW.tenant_id := auth.tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to high-traffic insert tables
CREATE TRIGGER trg_set_tenant_activity_logs
  BEFORE INSERT ON activity_logs FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER trg_set_tenant_notifications
  BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER trg_set_tenant_exam_attempts
  BEFORE INSERT ON exam_attempts FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER trg_set_tenant_quiz_attempts
  BEFORE INSERT ON quiz_attempts FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER trg_set_tenant_doubts
  BEFORE INSERT ON doubts FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

Run `npm run build`.
Commit: "feat: tenant-aware RLS policies with JWT claim extraction"

═══════════════════════════════════════════════════════════════════
STEP 3.5.5 — TENANT BRANDING STORE & RESOLVER
═══════════════════════════════════════════════════════════════════

Create file: src/stores/useTenantStore.js

Zustand store for tenant branding:

```
import { create } from 'zustand';

export const useTenantStore = create((set) => ({
  tenantId: 'icon-lifesciences',
  tenantName: 'Icon Lifesciences',
  logoUrl: '/icons/icon-512.png',
  primaryColor: '#6366F1',
  secondaryColor: '#1E1B4B',
  isResolved: false,

  setTenant: (tenant) => set({
    tenantId: tenant.id,
    tenantName: tenant.name,
    logoUrl: tenant.logo_url || '/icons/icon-512.png',
    primaryColor: tenant.primary_color || '#6366F1',
    secondaryColor: tenant.secondary_color || '#1E1B4B',
    isResolved: true
  }),
}));
```

Create file: src/lib/tenantResolver.js

This module determines the current tenant on app boot:

1. Import `{ supabase }` from `./supabase`.
2. Import `useTenantStore` from stores.
3. Export async function `resolveTenant()`:
   a. Get the current hostname: `window.location.hostname`.
   b. Query `tenants` table: `.select('*').eq('domain', hostname).maybeSingle()`.
   c. If found: `useTenantStore.getState().setTenant(tenant)`.
   d. If NOT found (e.g., localhost or unknown domain):
      - Default to 'icon-lifesciences' tenant.
      - Query it explicitly and set it.
   e. Apply CSS custom properties for dynamic theming:
      ```
      document.documentElement.style.setProperty('--color-primary', tenant.primary_color);
      document.documentElement.style.setProperty('--color-secondary', tenant.secondary_color);
      ```
   f. Update document title: `document.title = tenant.name + ' — iConnect'`.
   g. Update favicon if tenant has a logo_url.

Wire into src/main.jsx:
- Call `resolveTenant()` before rendering <App />.
- Show a loading spinner until tenant is resolved.

Run `npm run build`.
Commit: "feat: tenant branding store + hostname-based resolver"

═══════════════════════════════════════════════════════════════════
STEP 3.5.6 — WIRE TENANT BRANDING INTO UI
═══════════════════════════════════════════════════════════════════

Update the following components to use tenant branding (import from useTenantStore):

1. **Sidebar** (src/components/Sidebar.jsx or its split equivalent):
   - Replace hardcoded "iConnect" text with `tenantName`.
   - Replace hardcoded logo with `logoUrl`.

2. **Login page** (src/pages/LoginPage.jsx or wherever login UI is):
   - Show tenant logo and name on the login screen.
   - Use tenant primary color for the login button.

3. **Top bar / header** (wherever the app name appears):
   - Replace hardcoded text with `tenantName`.

4. **PWA manifest** — this is build-time, so we can't dynamically change it.
   Add a comment in vite.config.js noting that for per-tenant PWA manifest,
   a build-time env var VITE_TENANT_NAME would be needed.

Use CSS custom properties (`var(--color-primary)`) instead of hardcoded Tailwind colors
in these specific branding locations. Do NOT refactor all Tailwind usage — only the
tenant-specific branding points.

Run `npm run build`.
Commit: "feat: dynamic tenant branding in sidebar, login, and header"

═══════════════════════════════════════════════════════════════════
STEP 3.5.7 — TENANT-AWARE DATA MUTATIONS
═══════════════════════════════════════════════════════════════════

Update src/lib/supabase.js (or the relevant data layer files):

For all INSERT functions, ensure `tenant_id` is included in the payload.
Since we have the DB trigger (set_tenant_id) as a safety net, the client-side
inclusion is defense-in-depth:

1. Create a helper in supabase.js:
   ```
   export function getTenantId() {
     return useTenantStore.getState().tenantId;
   }
   ```

2. For the TOP insertions (activity_logs, notifications, exam_attempts, quiz_attempts, doubts),
   add `tenant_id: getTenantId()` to the payload.

3. For SELECT queries that power leaderboards, notifications, and activity feeds,
   add `.eq('tenant_id', getTenantId())` filter. While RLS will enforce this,
   the explicit filter helps PostgreSQL use the tenant_id index efficiently.

Do NOT modify every query — focus on the high-traffic paths. RLS is the safety net.

Run `npm run build`.
Commit: "feat: client-side tenant_id in high-traffic mutations and queries"

══════════════════════════════════════════════════════════════
HARD STOP — PHASE 3.5 COMPLETE
══════════════════════════════════════════════════════════════

Verify:
1. `npm run build` passes with zero errors.
2. App loads normally (defaults to 'icon-lifesciences' tenant on existing domain).
3. Sidebar shows "Icon Lifesciences" name and logo.
4. Login page shows tenant branding.
5. All data queries still return correct results (RLS defaults to existing tenant).
6. No console errors about missing tenant_id.
7. All existing features work identically.

Git commit:
  git add -A && git commit -m "milestone: Phase 3.5 — Multi-Tenant Architecture complete"

Final commit:
  git add -A && git commit -m "V3 ENTERPRISE PILLARS — ALL 5 PHASES COMPLETE"

═════════════════════════════════════════════════════════════
FULL AUTONOMY PERMISSIONS — PHASE 3.5
═════════════════════════════════════════════════════════════

You have FULL permission to perform the following actions WITHOUT asking for confirmation:

READ any file in the project.
WRITE / CREATE / OVERWRITE any file in frontend/src/, supabase/functions/, supabase/migrations/.
DELETE .bak files ONLY.
RUN `npm install`, `npm run build`, `npm run lint`, `npx` commands in frontend/.
RUN `git add` and `git commit` (NEVER `git push`).
CREATE new stores in src/stores/.
CREATE new directories under src/lib/, supabase/migrations/.
MODIFY src/lib/supabase.js (add tenant helpers, add query filters).
MODIFY src/main.jsx (add tenant resolver).
MODIFY component files to use tenant branding (surgical changes only).
MODIFY vite.config.js comments only.
MODIFY .env.example to document new env vars.

You do NOT have permission to:
- Run `git push` to any remote.
- Delete the `.git` directory or any non-.bak source files.
- Modify `.env` or `.env.local`.
- DROP any existing RLS policy. Only ADD new policies.
- Remove any existing table columns or constraints.
- Modify the existing auth flow (only add tenant context to it).
```

---
---

## POST-COMPLETION CHECKLIST

After all 5 phases are complete, manually verify:

| Check | Expected |
|-------|----------|
| `npm run build` | Zero errors, zero warnings |
| Sentry DSN not set | App works identically, no console errors |
| Sentry DSN set | Errors appear in Sentry dashboard |
| Double-click exam submit | Only one attempt created |
| Offline → mutation → online | Mutation replays automatically |
| Search "anatomy" in e-books | Returns relevant chunks (after embeddings exist) |
| Login on existing domain | Resolves to 'icon-lifesciences' tenant |
| Login on new tenant domain | Resolves to that tenant's branding |
| Superadmin views leaderboard | Sees all tenants |
| Doctor views leaderboard | Sees only own tenant |
| Edge function logs | Contain x-trace-id in JSON format |

## ENVIRONMENT VARIABLES ADDED (document in .env.example)

```
# Phase 3.1 — Observability
VITE_SENTRY_DSN=           # Sentry project DSN (optional — app works without it)
VITE_APP_VERSION=          # Semantic version for Sentry releases
SENTRY_AUTH_TOKEN=         # For source map upload (CI only, not in frontend .env)
SENTRY_ORG=                # Sentry organization slug
SENTRY_PROJECT=            # Sentry project slug

# Phase 3.4 — Semantic Search
OPENAI_API_KEY=            # For embedding generation (edge function env only)

# Phase 3.5 — Multi-Tenant
VITE_DEFAULT_TENANT=icon-lifesciences  # Fallback tenant when domain is unrecognized
```
