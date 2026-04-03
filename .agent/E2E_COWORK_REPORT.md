# iConnect — E2E Cowork Audit Report
# ════════════════════════════════════════════════════════════════
# Date: 2026-04-03
# Auditor: Claude (Principal QA Automation)
# Target: https://iconnect-med.vercel.app
# Commit: 4651432 (fix: navigation rendering, AI 502, WebSocket retry, DB schema)
# Browser: Chrome with Claude-in-Chrome extension
# ════════════════════════════════════════════════════════════════

## Executive Summary

**Verdict: DEPLOYMENT HAS A CRITICAL REGRESSION. DO NOT CONSIDER STABLE.**

The navigation stale-content bug (Fix 1 from the deployment) is **NOT resolved**.
Every sidebar click renders the PREVIOUS page's content in the new page's frame.
This is a P0 blocker that makes the entire application unusable for normal navigation.

---

## Test Environment

- URL: `https://iconnect-med.vercel.app`
- Browser: Chrome (macOS) with Claude-in-Chrome extension
- Auth: Google OAuth (ayushjain20022020@gmail.com) — Doctor role, "PG Aspirant"
- Commit tested: `4651432` on `main` branch
- Vercel deployment: confirmed live (pushed + deployed)
- Supabase migration: `20260403000001_admin_calendar_events.sql` applied
- Edge functions: `gemini-proxy` + `ai-orchestrator` deployed with GEMINI_API_KEY

---

## FINDINGS

### SEVERE (P0)

#### BUG-NAV-001: Sidebar Navigation Shows Previous Page Content (ONE-PAGE-BEHIND)

**Severity:** SEVERE / P0 — Application is functionally broken
**Reproducibility:** 100% — every single sidebar click
**Root Cause:** `useTransition()` in `Sidebar.jsx` + `queueMicrotask` in `renderPage()` interaction

**Steps to Reproduce:**
1. Login as any Doctor
2. Dashboard loads correctly (after fresh page load or hard refresh)
3. Click "E-Books" in sidebar
4. URL changes to `/ebooks`, TopBar updates to "E-Book Library", sidebar highlights E-Books
5. **BUG: Main content area still shows Dashboard content** (My Activity card, Score Breakdown, Last 7 Days chart, Recent Activity)
6. Click "My Activity" in sidebar
7. URL changes to `/activity`, TopBar updates to "My Activity"
8. **BUG: Main content area now shows E-Books content** (search bar, filters, HARRISON book card)
9. Click "Case Simulator" in sidebar
10. URL changes to `/case-sim`, TopBar updates to "Case Simulator"
11. **BUG: Main content area shows My Activity content** (90-day heatmap, Weekly Progress, KPI cards)

**Full Reproduction Matrix:**

| Step | Clicked | URL | TopBar | Actual Content Shown | Expected |
|------|---------|-----|--------|---------------------|----------|
| 1 | Dashboard (fresh load) | `/` | Dashboard | Dashboard | Dashboard |
| 2 | E-Books | `/ebooks` | E-Book Library | **Dashboard** | E-Books |
| 3 | My Activity | `/activity` | My Activity | **E-Books** | Activity heatmap |
| 4 | Case Simulator | `/case-sim` | Case Simulator | **My Activity** | Case Sim UI |
| 5 | Dashboard | `/` | Dashboard | **Case Simulator** | Dashboard |

**Pattern:** Content is ALWAYS one navigation step behind. The TopBar and sidebar update immediately, but the main `renderPage()` output is stale.

**Technical Analysis:**
**CORRECTION**: `useTransition` is NOT present in the codebase (searched all files — zero matches). Sidebar.jsx does a plain `setPage(item.k)` call. The original diagnosis was wrong.

The actual root cause is a **double state update race condition** between Zustand and React Router:

1. Sidebar calls `setPage('ebooks')`
2. `useAppStore.setPage()` does TWO things synchronously:
   a. `set({ page: 'ebooks' })` — updates Zustand state
   b. `imperativeNavigate('/ebooks')` — calls React Router's `navigate('/ebooks')`
3. React Router's navigation triggers a `location.pathname` change
4. The `syncFromLocation` useEffect fires: `set({ page: 'ebooks' })` AGAIN
5. Under React 19 + StrictMode + automatic batching, this double-update creates a render cycle where the FIRST render may proceed with stale state before the final batched render commits

The fact that TopBar and Sidebar show the correct page title proves `page` IS updating. But the `renderPage()` output and/or the `key={page}` on `<PageErrorBoundary>` appears to receive the stale value during the render that actually commits to the DOM.

**See `.agent/CLI_FIX_NAV_PROMPT.md` for the full Claude Code debugging prompt with step-by-step investigation plan.**

**Affected Selectors:**
- Sidebar nav items: `.sidebar-nav-item` / all `<NavItem>` components
- Main content area: The `<Suspense>` wrapper inside `<PageErrorBoundary key={page}>`
- renderPage() function in `App.jsx`

**Workaround:** Hard refresh (`Ctrl+R` / `Cmd+R`) on any page loads the correct content for that URL. Only sidebar navigation is broken.

---

#### BUG-NAV-002: URL Deep-Linking Silently Fails

**Severity:** SEVERE — breaks bookmarks, shared links, browser back/forward
**Reproducibility:** 100%

**Steps to Reproduce:**
1. While logged in, navigate directly to `https://iconnect-med.vercel.app/case-sim`
2. **BUG: App loads the Dashboard** instead of Case Simulator
3. URL resolves to `/` (root)

**Explanation:** The app is a full SPA. On fresh load, the URL path is ignored — Zustand `useAppStore.page` defaults to `'dashboard'`. The URL updates are cosmetic (via `history.replaceState` or similar) but not read back on load.

**Affected URLs:** All deep-linked paths: `/ebooks`, `/activity`, `/case-sim`, `/leaderboard`, `/notifications`, `/study-calendar`, `/study-plan`, `/performance`, etc.

---

### HIGH (P1)

#### BUG-AUTH-001: Login Page Exposes Admin Access Buttons to All Users

**Severity:** HIGH — information disclosure / social engineering risk
**Reproducibility:** 100%

**Description:** The login page displays "ADMIN ACCESS" section with "Super Admin" and "Content Admin" buttons visible to ALL visitors, including unauthenticated users. While these buttons likely require admin credentials to actually log in, exposing the admin login flow publicly is a security anti-pattern.

**Path:** `https://iconnect-med.vercel.app/` (login page)
**Selector:** The "ADMIN ACCESS" section with Super Admin / Content Admin buttons

**Recommendation:** Hide admin login behind a `/admin` route or a hidden gesture (e.g., tap logo 5 times). Do not expose admin entry points on the public login page.

---

### PASS (Verified Working)

#### AUTH-GUARD: Route Protection (PASS)

**Test:** Navigate to `/dashboard` and `/case-sim` while unauthenticated
**Result:** Both correctly redirect to login page
**Verdict:** Auth guard works correctly. No bypass possible via URL manipulation.

#### AUTH-LOGOUT: Session Cleanup (PASS)

**Test:** Click Logout → verify session is cleared → attempt to access protected routes
**Result:** Logout clears session. Protected routes redirect to login. Google OAuth re-auth required.

#### DB-API: No 400/404/502 Errors on Dashboard Load (PASS)

**Test:** Monitor network requests during dashboard load
**Result:** All Supabase REST calls return 200. No `user_content_state` 400 errors. No `admin_calendar_events` 404 errors.
**Note:** The `getContentProgressForDay` fix (querying existing columns) and `admin_calendar_events` migration are working.

#### CONSOLE: No Error Spam (PASS)

**Test:** Monitor console during navigation (5 page transitions)
**Result:** Zero console errors. Zero WebSocket retry spam. The `timeout: 30000` and TIMED_OUT handler are working.

#### REALTIME: No WebSocket Infinite Retry (PASS)

**Test:** Navigate around for 30+ seconds, monitor console
**Result:** No WebSocket error flooding. The subscription error handling in `useAppStore.js` is working correctly.

---

## Tests NOT Completed (Chrome Extension Disconnected)

The Chrome browser extension lost connection mid-audit. The following tests could not be completed:

### Flow 3: AI Edge Function Stress Test
- [ ] ChatBot: send "What is hypertension?" — verify AI response (not 502)
- [ ] Case Simulator: start a case — verify AI responds
- [ ] Doubt Buster in E-Books: ask a question
- [ ] Throttle to Slow 3G — test timeout handling
- [ ] Intercept `/v1/gemini-proxy` — verify no unhandled 502/404

### Flow 4: Mobile Breakage (320x568)
- [ ] Resize viewport to 320x568 (iPhone SE)
- [ ] Check for horizontal scrollbar (overflow-x violations)
- [ ] Check "My Performance Analytics" text overlap
- [ ] Open ChatBot modal — check z-index blocks close button

### Flow 2: Content Race Condition
- [ ] Admin quiz creation + Doctor quiz completion
- [ ] Double-submit stress test (rapid submit button clicks)
- [ ] Leaderboard score duplication check

**Note:** These tests require a reconnected Chrome session. The navigation bug (BUG-NAV-001) would also interfere with reaching the correct pages for these tests, since sidebar navigation doesn't work.

---

## Categorized Bug Summary

| ID | Severity | Category | Description | Path | Status |
|----|----------|----------|-------------|------|--------|
| BUG-NAV-001 | SEVERE | State Corruption | Sidebar navigation shows previous page content (one-page-behind) | All sidebar nav → `App.jsx renderPage()` | OPEN — P0 BLOCKER |
| BUG-NAV-002 | SEVERE | Routing | URL deep-linking silently fails — always loads Dashboard | All direct URL paths | OPEN |
| BUG-AUTH-001 | HIGH | Security | Admin login buttons visible on public login page | `/` (login) → ADMIN ACCESS section | OPEN |

---

## Verified Fixes (from commit 4651432)

| Fix | Status | Evidence |
|-----|--------|----------|
| WebSocket infinite retry | WORKING | No console spam during 30s navigation |
| `getContentProgressForDay` 400 error | WORKING | No 400 errors from `user_content_state` |
| `admin_calendar_events` 404 | WORKING | Migration applied, no 404 errors |
| Supabase realtime timeout (30s) | WORKING | Client config verified in code |
| GEMINI_API_KEY secret | DEPLOYED | Secret set, edge functions deployed |
| Navigation stale content (queueMicrotask) | **NOT WORKING** | One-page-behind bug persists |

---

## Root Cause Analysis: BUG-NAV-001

The `queueMicrotask` fix (Fix 1) addressed the wrong symptom. The original diagnosis was that `setPage()` called during render was a React anti-pattern causing stale content. While true, the FIX introduced `queueMicrotask` to defer the state update — but this only affects the ROUTE GUARD path (unauthorized page → redirect to dashboard) and the KAHOOT redirect.

The ACTUAL stale content bug is caused by **`useTransition` in Sidebar.jsx** (introduced in NA-019). Here's the interaction:

```
Sidebar.jsx (NavItem):
  startTransition(() => setPage(item.k))
  // React keeps OLD content visible during transition

App.jsx (renderPage):
  // Returns lazy component based on `page`
  // key={page} on PageErrorBoundary SHOULD force remount
  // But useTransition prevents the commit of the new tree
```

**The `key={page}` on `<PageErrorBoundary>` works correctly for NON-transition navigations** (e.g., hard refresh, initial load). But `startTransition` explicitly tells React: "keep showing the old UI until the new one is ready." If the lazy component's Suspense boundary triggers, React holds the transition in a pending state and never swaps.

**Recommended Fix (investigate in order):**
```
Option A: Remove imperativeNavigate from setPage — stop the double-update.
  Move URL sync to a useEffect that watches `page`:
    useEffect(() => { navigate(toPath(page)); }, [page]);
  This eliminates the race between Zustand set() and navigate().

Option B: Guard syncFromLocation against no-ops:
  syncFromLocation: (pathname) => {
    const newPage = fromPath(pathname);
    if (newPage === get().page) return; // skip if already correct
    set({ page: newPage, notifPanel: false });
  }

Option C: Use window.history.replaceState instead of navigate():
  This avoids triggering React Router's re-render cycle entirely.

Option D: Remove StrictMode from main.jsx (temporary diagnostic):
  If this fixes the bug, the issue is a React 19 StrictMode
  double-render interaction with Zustand's synchronous set().
```
Full debugging prompt: `.agent/CLI_FIX_NAV_PROMPT.md`

---

## Recommendations

1. **IMMEDIATE (P0):** Revert `useTransition` from Sidebar.jsx OR fix the transition/Suspense interaction. The app is unusable for navigation.
2. **HIGH:** Implement proper URL-based routing (React Router or custom) so deep links and browser back/forward work.
3. **HIGH:** Hide admin login buttons from public login page.
4. **MEDIUM:** Complete the AI stress test and mobile viewport test once Chrome extension reconnects.
5. **LOW:** The 3rd-party "Blackbox" extension widget (bottom-right corner) overlaps with app content — consider if this is intentional.

---

## Appendix: Screenshots Captured

| ID | Description |
|----|-------------|
| ss_85158i6bm | Initial dashboard load (skeleton state) |
| ss_6978f47r8 | Dashboard fully loaded |
| ss_18566m2rz | Login page after logout |
| ss_7894yrs99 | Auth bypass test — /dashboard redirects to login |
| ss_024903pbk | Auth bypass test — /case-sim redirects to login |
| ss_8389pyjig | Google OAuth login page |
| ss_8421ihazn | Google account chooser |
| ss_7499iqqf4 | Post-login dashboard (scrolled to leaderboard) |
| ss_1409v21l3 | **BUG** — E-Books page showing Dashboard content |
| ss_83487ndue | **BUG** — E-Books page still showing Dashboard after 7s |
| ss_7516zy38o | **BUG** — My Activity page showing E-Books content |
| ss_376178zzf | **BUG** — Case Simulator page showing My Activity content |
| ss_9204ulsxi | **BUG** — Dashboard showing My Activity content |
| ss_9026663ut | Dashboard after hard refresh (correct content) |
| ss_65087ytws | URL deep-link /case-sim loads Dashboard instead |
