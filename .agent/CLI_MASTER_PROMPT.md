# PASTE EVERYTHING BELOW INTO CLAUDE CLI
# ════════════════════════════════════════

```
You are deploying 5 production fixes for iConnect. All code changes are ALREADY MADE. Your job is: verify → deploy → test → report.

READ THESE FILES FIRST (mandatory):
- .agent/COMPREHENSIVE_FIX_BLUEPRINT.md (full fix details)
- .agent/handoff.md (session state)
- CLAUDE.md (project rules — follow strictly)

═══ PHASE 1: VERIFY CODE CHANGES ═══

Confirm these 4 files were modified correctly:

1. frontend/src/App.jsx
   - renderPage() route guard uses queueMicrotask(() => setPage('dashboard')) NOT direct setPage()
   - kahoot case uses queueMicrotask(() => setPage('arena-student')) NOT direct setPage()
   - Both return <PageLoader /> instead of null

2. frontend/src/stores/useAppStore.js
   - subscribeToNotifications has .subscribe((status, err) => { ... }) callback
   - Handles CHANNEL_ERROR (warn) and TIMED_OUT (remove channel + delete from _channels)

3. frontend/src/lib/supabase.js
   - Realtime config has timeout: 30000
   - getContentProgressForDay selects 'artifact_id, current_page, is_bookmarked, updated_at' (NOT content_type, progress_pct)
   - Maps result to { content_type: 'reading', progress_pct: Math.min(current_page * 10, 100) }

4. supabase/migrations/20260403000001_admin_calendar_events.sql exists with:
   - CREATE TABLE IF NOT EXISTS admin_calendar_events
   - RLS policies with IF NOT EXISTS guards
   - updated_at trigger

If ANY file is wrong or missing, fix it before proceeding. If all correct, move to Phase 2.

═══ PHASE 2: BUILD ═══

cd frontend
npm run build

If build fails, fix the error. Do NOT proceed with a broken build.
Expected: "built in Xs" with 56 precache entries. The chunk size warning for index.js (~650kB) is known and acceptable.

═══ PHASE 3: DEPLOY DATABASE ═══

cd .. (back to project root)
npx supabase db push

This applies the admin_calendar_events migration. Verify it says "applied 1 migration" or similar.
If it fails with "already exists" that's fine — the migration uses IF NOT EXISTS.

═══ PHASE 4: DEPLOY EDGE FUNCTIONS ═══

npx supabase secrets set GEMINI_API_KEY=AIzaSyBbVRDLAnnhwUqM4pnTguTDU0Q6M9Ctu_c

npx supabase functions deploy gemini-proxy --no-verify-jwt
npx supabase functions deploy ai-orchestrator

Verify both say "deployed successfully". If ai-orchestrator fails on JWT verification, that's expected — it handles JWT internally.

═══ PHASE 5: GIT COMMIT & PUSH ═══

git add frontend/src/App.jsx frontend/src/stores/useAppStore.js frontend/src/lib/supabase.js supabase/migrations/20260403000001_admin_calendar_events.sql .agent/COMPREHENSIVE_FIX_BLUEPRINT.md .agent/handoff.md .agent/CLI_MASTER_PROMPT.md
git commit -m "fix: navigation rendering, AI 502, WebSocket retry, DB schema

- Navigation: replace setPage() during render with queueMicrotask (React anti-pattern fix)
- WebSocket: add timeout/error handling to Realtime subscription, prevent infinite retry
- DB: fix getContentProgressForDay to query existing columns (was querying content_type, progress_pct which don't exist)
- DB: create admin_calendar_events table with RLS (was 404 — table never existed)
- AI: deploy gemini-proxy + ai-orchestrator with GEMINI_API_KEY secret
- Supabase client: add 30s realtime timeout"
git push

═══ PHASE 6: VERIFICATION (BE HARSH — TEST 10 TIMES) ═══

Wait 60 seconds for Vercel to deploy, then run these checks.

NAVIGATION TESTS (do each one 3 times rapidly):
1. Dashboard → EBooks → back to Dashboard — EBooks content must NOT persist on Dashboard
2. Dashboard → Activity → Performance → Dashboard — each page shows only its own content
3. Dashboard → Profile → Notifications → EBooks → Dashboard — 5-page rapid navigation, zero stale content
4. Click sidebar items as fast as possible 10 times — no page should show another page's content

AI TESTS:
5. Open ChatBot → send "What is hypertension?" → should get AI response (not 502)
6. Open Case Simulator → start a case → AI should respond
7. Open Doubt Buster in EBooks → ask a question → should work

CONSOLE TESTS (open browser DevTools → Console):
8. Navigate around for 30 seconds — WebSocket errors should NOT flood the console
9. No 400 errors from user_content_state queries
10. No 404 errors from admin_calendar_events

CALENDAR/EVENTS TESTS:
11. Go to Broadcast page (as admin) → create a calendar event → should save without error
12. Go to Study Calendar (as doctor) → should show events (or empty list, no error)

JOURNAL TEST:
13. Click any day on the activity heatmap → JournalModal opens → content progress section should load (or show empty) without 400 error

REPORT FORMAT — Create a file called .agent/TEST_RESULTS.md with:
| # | Test | Pass/Fail | Notes |
For each of the 13 tests above. If ANY test fails, investigate and fix before declaring done.

═══ RULES ═══
- Follow CLAUDE.md strictly — no new stores, no raw supabase.from() in components, no .bak edits
- Do NOT modify any files not listed above unless a test fails and requires a fix
- If a test fails, fix the root cause — no band-aids
- Update .agent/handoff.md when done with test results summary
```
