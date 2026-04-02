# iConnect — Comprehensive Fix Blueprint
# ════════════════════════════════════════════════════════════════
# Created: 2026-04-03
# Status: READY FOR EXECUTION
# Covers: Navigation, AI 502, WebSocket, DB schema, Orchestrator
# ════════════════════════════════════════════════════════════════

## Executive Summary

Six production issues identified and analyzed. This blueprint provides
copy-paste-ready fixes for each, plus a verification checklist.

| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| 1 | Navigation stale content | CRITICAL | `renderPage()` renders inside Suspense but React's lazy component identity doesn't change per-page — old tree persists |
| 2 | gemini-proxy 502 | HIGH | Edge function calls Gemini API but may have wrong/missing GEMINI_API_KEY secret |
| 3 | WebSocket infinite retry | MEDIUM | Supabase Realtime channel fails to connect, default reconnect has no backoff cap |
| 4 | `admin_calendar_events` 404 | MEDIUM | Table never created — no migration exists |
| 5 | `user_content_state.content_type` missing | MEDIUM | Column doesn't exist in table schema but code queries it |
| 6 | AI orchestrator review | LOW | Already well-built; minor optimizations possible |

---

## ═══ FIX 1: Navigation Stale Content ═══════════════════════════

### Root Cause Analysis

The `renderPage()` function returns different lazy components based on `page`.
The current setup is:

```jsx
<PageErrorBoundary key={page} resetKey={page}>
  <Suspense fallback={<PageLoader />}>
    {renderPage()}
  </Suspense>
</PageErrorBoundary>
```

**Why `key={page}` on PageErrorBoundary should work:** React sees a different
key → unmounts the entire subtree (PageErrorBoundary + Suspense + page
component) → mounts fresh. This IS the correct approach.

**Potential remaining issue:** The `key={page}` IS applied. If the user still
sees stale content, the problem is likely one of:

1. **`renderPage()` is called during render but `setPage()` in the route guard
   triggers a re-render DURING render** (line 551-553: `setPage(defaultPage)`
   called inside `renderPage()`). Calling `setPage` (which calls Zustand's
   `set()`) during render is a React anti-pattern that can cause the current
   render to proceed with stale values.

2. **`sharedProps` memo includes `artifacts` and `users` arrays** — if these
   haven't changed, React may reuse children via memo even with a new key.
   But `key` should override this.

3. **Service worker caching** — The PWA Workbox config has `navigateFallback:
   'index.html'` which is correct for an SPA, but old JS chunks could be
   served from cache.

### The Fix

**A. Remove the `setPage()` call from inside `renderPage()`** — it mutates
state during render. Replace with a guard that returns a redirect component:

```jsx
// In renderPage(), replace lines 549-554:
// OLD:
const allowedPages = ROLE_PAGES[role];
if (role && allowedPages && allowedPages.length > 0 && page && !allowedPages.includes(page)) {
  const defaultPage = 'dashboard';
  setPage(defaultPage);
  return null;
}

// NEW:
const allowedPages = ROLE_PAGES[role];
if (role && allowedPages && allowedPages.length > 0 && page && !allowedPages.includes(page)) {
  // Schedule redirect outside render — never call setPage during render
  queueMicrotask(() => setPage('dashboard'));
  return <PageLoader />;
}
```

**B. Same fix for the `kahoot` case** — line 597-598 calls `setPage()` during
render:

```jsx
// OLD:
case 'kahoot': {
  setPage('arena-student');
  return null;
}

// NEW:
case 'kahoot': {
  queueMicrotask(() => setPage('arena-student'));
  return <PageLoader />;
}
```

**C. Verify the `key={page}` is working** — add a dev-only log:

```jsx
// Temporarily in renderPage(), first line:
if (import.meta.env.DEV) console.log('[renderPage] page =', page);
```

### Files to Modify
- `frontend/src/App.jsx` — lines 549-554 and 595-599

---

## ═══ FIX 2: gemini-proxy 502 ═══════════════════════════════════

### Root Cause

The `gemini-proxy` edge function reads `GEMINI_API_KEY` from `Deno.env.get()`.
If this secret isn't set in Supabase, the function returns a 500 error. If the
key is set but invalid, Gemini returns an error and the function returns 502.

**Additionally:** `aiService.js` has `USE_EDGE_FUNCTION = true`, which routes
ALL AI calls through `ai-orchestrator` (NOT `gemini-proxy`). The
`ai-orchestrator` also reads `GEMINI_API_KEY` from `Deno.env.get()`.

So the fix is:
1. Set the GEMINI_API_KEY secret in Supabase
2. Deploy BOTH edge functions
3. Verify the ai-orchestrator path works (since USE_EDGE_FUNCTION=true)

### Commands (User must run)

```bash
# 1. Set the API key as a Supabase secret
npx supabase secrets set GEMINI_API_KEY=<YOUR_GEMINI_KEY>

# 2. Deploy the gemini-proxy edge function
npx supabase functions deploy gemini-proxy --no-verify-jwt

# 3. Deploy the ai-orchestrator edge function
npx supabase functions deploy ai-orchestrator

# 4. Verify the secret is set
npx supabase secrets list
```

**Note on `--no-verify-jwt` for gemini-proxy:** The gemini-proxy function
doesn't extract JWT — it only checks the API key. The ai-orchestrator DOES
verify JWT (extracts userId for rate limiting), so it should NOT use
`--no-verify-jwt`.

### Verification

```bash
# Test gemini-proxy directly
curl -X POST "https://kzxsyeznpudomexqbnvp.supabase.co/functions/v1/gemini-proxy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{"system":"You are a helpful assistant.","messages":[{"role":"user","content":"Say hello"}]}'
```

### Files: No code changes needed — deployment + secret only.

---

## ═══ FIX 3: WebSocket Infinite Retry ═══════════════════════════

### Root Cause

The Supabase Realtime client retries WebSocket connections automatically.
When the connection fails (e.g., network down, Realtime disabled, auth
token expired), it retries indefinitely with short intervals, flooding
the console.

The subscription in `useAppStore.js` (line 119-136) uses
`supabase.channel(key).on(...).subscribe()` — this is the standard API.
The retry behavior is built into the Supabase client.

### The Fix

**A. Add error handling to the subscription:**

In `useAppStore.js`, modify `subscribeToNotifications`:

```js
subscribeToNotifications: (userId) => {
  if (!userId) return;
  const key = `notifs-${userId}`;
  if (_channels.has(key)) return;

  const channel = supabase
    .channel(key)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const n = payload.new;
      get().pushNotification({
        ...n,
        time: new Date(n.created_at).toLocaleString('en-IN', {
          hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
        }),
      });
    })
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('[Realtime] Channel error for notifications — will retry automatically:', err?.message);
      }
      if (status === 'TIMED_OUT') {
        console.warn('[Realtime] Channel timed out — removing to prevent infinite retry');
        supabase.removeChannel(channel);
        _channels.delete(key);
      }
    });

  _channels.set(key, channel);
},
```

**B. Configure Supabase client with realtime timeout:**

In `supabase.js`, update the client creation:

```js
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  import.meta.env.VITE_SUPABASE_ANON_KEY || '...',
  {
    realtime: {
      params: { eventsPerSecond: 2 },
      timeout: 30000, // 30s timeout before giving up
    },
    global: { headers: { 'x-client-info': 'iconnect-web' } },
  }
)
```

### Files to Modify
- `frontend/src/stores/useAppStore.js` — `subscribeToNotifications` method
- `frontend/src/lib/supabase.js` — client config (add timeout)

---

## ═══ FIX 4: admin_calendar_events Table Missing ═════════════════

### Root Cause

The table `admin_calendar_events` is referenced in:
- `DoctorEngageView.jsx` (read + insert + delete)
- `StudyCalendar.jsx` (read)

But no migration creates it. The MASTER_BLUEPRINT mentions it in the schema
but it was never implemented.

### The Fix — New Migration

Create: `supabase/migrations/20260403000001_admin_calendar_events.sql`

```sql
-- admin_calendar_events: Admin-created calendar events visible to all doctors
CREATE TABLE IF NOT EXISTS admin_calendar_events (
  id          BIGSERIAL   PRIMARY KEY,
  title       TEXT        NOT NULL,
  date        DATE        NOT NULL,
  description TEXT,
  color       TEXT        DEFAULT '#EF4444',
  is_compulsory BOOLEAN  DEFAULT true,
  created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE admin_calendar_events ENABLE ROW LEVEL SECURITY;

-- Doctors can read all events
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE policyname = 'Doctors can read calendar events'
    AND tablename = 'admin_calendar_events'
) THEN
  CREATE POLICY "Doctors can read calendar events"
    ON admin_calendar_events FOR SELECT
    USING (true);
END IF;
END $$;

-- Superadmins and contentadmins can insert events
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert calendar events'
    AND tablename = 'admin_calendar_events'
) THEN
  CREATE POLICY "Admins can insert calendar events"
    ON admin_calendar_events FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('superadmin', 'contentadmin')
      )
    );
END IF;
END $$;

-- Superadmins can delete events
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE policyname = 'Superadmins can delete calendar events'
    AND tablename = 'admin_calendar_events'
) THEN
  CREATE POLICY "Superadmins can delete calendar events"
    ON admin_calendar_events FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'superadmin'
      )
    );
END IF;
END $$;

-- Updated_at trigger
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
  CREATE TRIGGER set_admin_calendar_events_updated_at
    BEFORE UPDATE ON admin_calendar_events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
END IF;
END $$;
```

### Deployment
```bash
npx supabase db push
```

### Files to Create
- `supabase/migrations/20260403000001_admin_calendar_events.sql`

---

## ═══ FIX 5: user_content_state.content_type Column Missing ═════

### Root Cause

`getContentProgressForDay()` in `supabase.js` queries:
```js
.select('content_type, progress_pct, updated_at')
```

But the `user_content_state` table only has columns:
`user_id, artifact_id, is_bookmarked, current_page, updated_at`

Neither `content_type` nor `progress_pct` exist.

### The Fix — Two options:

**Option A (Recommended): Fix the query to use existing columns + join**

The `content_type` can be derived from the `artifacts` table (which has a
`type` or `content_type` column). And `progress_pct` can be derived from
`current_page` vs total pages.

But for simplicity, since JournalModal just shows a progress list and this
is the only consumer, the simplest production fix is to:

**Option B: Add the missing columns via migration + update the query**

Create: `supabase/migrations/20260403000002_user_content_state_progress.sql`

```sql
-- Add content_type and progress_pct to user_content_state for JournalModal
ALTER TABLE user_content_state
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0;
```

**AND fix the query to handle missing data gracefully:**

In `supabase.js`, update `getContentProgressForDay`:

```js
export const getContentProgressForDay = async (userId, date) => {
  try {
    const dayStart = `${date}T00:00:00`;
    const dayEnd   = `${date}T23:59:59`;
    const { data, error } = await supabase
      .from('user_content_state')
      .select('artifact_id, current_page, is_bookmarked, updated_at')
      .eq('user_id', userId)
      .gte('updated_at', dayStart)
      .lte('updated_at', dayEnd)
      .order('updated_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    // Map to the shape JournalModal expects
    return {
      data: (data || []).map(row => ({
        content_type: 'reading',
        progress_pct: row.current_page ? Math.min(row.current_page * 10, 100) : 0,
        updated_at: row.updated_at,
        artifact_id: row.artifact_id,
      })),
      error: null,
    };
  } catch (err) {
    console.warn('[supabase] getContentProgressForDay:', err.message);
    return { data: [], error: err };
  }
};
```

This approach:
- Doesn't require a migration (works with existing schema)
- Returns the shape JournalModal expects
- Gracefully handles the missing columns

### Files to Modify
- `frontend/src/lib/supabase.js` — `getContentProgressForDay` function

---

## ═══ FIX 6: AI Orchestrator Review ═════════════════════════════

### Current State

The `ai-orchestrator` edge function (`supabase/functions/ai-orchestrator/index.ts`) is **well-built**:

- ✅ JWT auth extraction + validation
- ✅ Rate limiting (30 req/60s per user)
- ✅ NVIDIA primary → Gemini fallback
- ✅ 15s timeout per provider
- ✅ Proper error handling + status codes
- ✅ CORS headers from shared module

### Observations

1. **`USE_EDGE_FUNCTION = true` in aiService.js** — All AI calls already
   route through the orchestrator. This is correct.

2. **NVIDIA key not set** — If `NVIDIA_API_KEY` is not set, the orchestrator
   skips NVIDIA and goes straight to Gemini. This is the expected behavior
   with only a Google AI Studio key.

3. **Token optimization** — The orchestrator uses `maxTokens` from the client
   request (default 512). This is reasonable. The gemini-proxy hardcodes 600.
   No changes needed.

4. **Minor optimization**: The `corsHeaders` in `_shared/cors.ts` uses
   `'Access-Control-Allow-Origin': '*'` — this is fine for edge functions
   since auth is via JWT, not cookies. But the gemini-proxy has its own
   origin-specific CORS. This inconsistency is cosmetic.

### Recommendation

No code changes needed. The orchestrator is production-ready.

The user should:
```bash
# Set Gemini key (if not already done)
npx supabase secrets set GEMINI_API_KEY=<YOUR_GEMINI_KEY>

# Deploy orchestrator
npx supabase functions deploy ai-orchestrator
```

---

## ═══ DEPLOYMENT CHECKLIST ═══════════════════════════════════════

### Step 1: Apply Code Fixes (in this order)

1. **App.jsx** — Fix `setPage()` during render (Fix 1)
2. **supabase.js** — Fix `getContentProgressForDay` query (Fix 5)
3. **useAppStore.js** — Add realtime error handling (Fix 3)
4. **supabase.js** — Add realtime timeout config (Fix 3)

### Step 2: Create Migration

5. Create `supabase/migrations/20260403000001_admin_calendar_events.sql` (Fix 4)

### Step 3: Deploy

```bash
# From project root:
cd supabase
npx supabase db push                                    # Apply migration
npx supabase secrets set GEMINI_API_KEY=<YOUR_GEMINI_KEY>
npx supabase functions deploy gemini-proxy --no-verify-jwt
npx supabase functions deploy ai-orchestrator

# From frontend:
cd ../frontend
npm run build      # Verify clean build
git add -A && git commit -m "fix: navigation rendering, AI 502, WebSocket retry, DB schema"
git push           # Triggers Vercel deploy
```

### Step 4: Verification Matrix

| Test | Page | Expected | Check |
|------|------|----------|-------|
| Nav: Dashboard → EBooks | ebooks | EBooks content only, no dashboard widgets | [ ] |
| Nav: EBooks → Activity | activity | Activity heatmap, no ebooks | [ ] |
| Nav: Activity → Performance | performance | Performance charts only | [ ] |
| Nav: Performance → Dashboard | dashboard | Dashboard widgets fresh | [ ] |
| Nav: Dashboard → Profile | profile | Profile form only | [ ] |
| Nav rapid: 5 pages in 2 sec | various | No stale content anywhere | [ ] |
| AI chat: send message | any | Response received, no 502 | [ ] |
| AI: doubt buster | ebooks | AI responds with medical context | [ ] |
| AI: case simulator | case-sim | Case simulation works | [ ] |
| Console: no WebSocket spam | any | Max 1-2 WS messages, not infinite | [ ] |
| Calendar events: create | broadcast | Event saved successfully | [ ] |
| Calendar events: view | calendar | Events display | [ ] |
| Journal: content progress | dashboard | Progress bars show (or empty), no 400 error | [ ] |
| Admin: SA dashboard | dashboard | All tabs load | [ ] |
| Admin: user management | users | User list loads | [ ] |
| Doctor: all sidebar pages | all | Each page loads clean content | [ ] |

---

## ═══ CLAUDE CLI PROMPT ═════════════════════════════════════════

Copy-paste this into Claude CLI for automated execution:

```
You are fixing 5 production bugs in the iConnect medical education app.
Read .agent/COMPREHENSIVE_FIX_BLUEPRINT.md for full details.

RULES:
- Follow CLAUDE.md rules strictly
- Do NOT create new Zustand stores
- Do NOT modify .bak files
- Test after EACH fix

Execute these fixes in order:

FIX 1 — App.jsx navigation rendering:
- In renderPage(), replace the setPage('dashboard') route guard (lines ~549-554) with:
  queueMicrotask(() => setPage('dashboard')); return <PageLoader />;
- In the 'kahoot' case (lines ~595-599), replace setPage('arena-student') with:
  queueMicrotask(() => setPage('arena-student')); return <PageLoader />;

FIX 2 — No code changes. User deploys edge functions manually.

FIX 3 — WebSocket retry:
- In useAppStore.js subscribeToNotifications, add status callback to .subscribe():
  .subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR') console.warn('[Realtime] Channel error:', err?.message);
    if (status === 'TIMED_OUT') {
      console.warn('[Realtime] Timed out — removing channel');
      supabase.removeChannel(channel);
      _channels.delete(key);
    }
  });
- In supabase.js client config, add timeout: 30000 to the realtime object.

FIX 4 — Create migration supabase/migrations/20260403000001_admin_calendar_events.sql:
  CREATE TABLE IF NOT EXISTS admin_calendar_events (
    id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, date DATE NOT NULL,
    description TEXT, color TEXT DEFAULT '#EF4444', is_compulsory BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  + RLS policies (SELECT for all, INSERT for admins, DELETE for superadmin)
  + Use IF NOT EXISTS guards on all policies

FIX 5 — In supabase.js, rewrite getContentProgressForDay to select
  'artifact_id, current_page, is_bookmarked, updated_at' (columns that exist)
  and map the result to { content_type: 'reading', progress_pct: Math.min(current_page * 10, 100) }

After all fixes: npm run build to verify. Report any errors.
```
