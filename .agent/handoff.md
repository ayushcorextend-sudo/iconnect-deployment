# iConnect — Session Handoff
# ════════════════════════════════════════════════════════════════
# INSTRUCTIONS: Fill this out at the END of every session.
# Claude reads this at the START of every session.
# Be specific. Vague entries are useless.
# ════════════════════════════════════════════════════════════════

## Last Updated
2026-04-03 — PWA install rebuilt (BUG-V) + deep-link fix (BUG-NAV-002).

---

## Current State
✅ **PWA install system REBUILT — needs deploy.**
✅ **BUG-NAV-002 FIXED — deep-linking now works after login.**

### BUG-NAV-002 FIX (this session)
- **Root cause:** The `login()` callback in App.jsx (line 369) hardcoded `setPage('dashboard')` after every login. When a user visited `/ebooks` → saw Login → logged in, the URL bar still showed `/ebooks` (React conditional render, no redirect) but the callback always went to dashboard.
- **Secondary cause:** `login()` set `authBootedRef.current = true` before the auth effect could run, so the auth effect's URL-aware `setPage(urlPage)` logic (line 279-280) was permanently blocked for that session.
- **Fix:** Replaced `setPage('dashboard')` with `setPage(window.location.pathname.replace(/^\//, '') || 'dashboard')` — reads the deep-link from the URL bar, same pattern as the auth effect.
- **File changed:** `frontend/src/App.jsx` — `login()` callback only
- **Edge cases handled:** Role guard in `renderPage()` still redirects to dashboard if the deep-link page isn't allowed for the user's role.
- **Build:** ✅ passes

### PWA Install Overhaul (this session) — BUG-V RESOLVED
6 files changed/created:

1. **`frontend/src/lib/pwaInstallManager.js`** (NEW) — Global singleton captures `beforeinstallprompt` at module-load time (before React mounts). Previously event was lost if fired during auth loading. Pub/sub pattern lets multiple components share one event.

2. **`frontend/src/hooks/usePWAInstall.js`** (REWRITTEN) — Now backed by singleton instead of independent `addEventListener`. Exposes `isIOS`, `showIOSGuide` for iOS Safari support. Multiple components safely share state.

3. **`frontend/src/components/ui/PWAInstallBanner.jsx`** (NEW) — Bottom-sheet install banner, slides up 3s after load. Android/Chrome: native install prompt button. iOS Safari: step-by-step Add to Home Screen guide. Dismisses for 7 days on close. CSS animation (no framer-motion dependency).

4. **`frontend/src/components/TopBar.jsx`** — Install button now shows on BOTH desktop and mobile (was `isMobile` only). Added `showIOSGuide` from hook.

5. **`frontend/src/main.jsx`** — Imports `pwaInstallManager` as first module so event listener registers before React.

6. **`frontend/src/index.css`** — Added PWA banner styles: slide-up animation, iOS guide steps, responsive mobile layout, dark mode support.

7. **`frontend/src/App.jsx`** — Wired `<PWAInstallBanner />` into app shell alongside `<OfflineIndicator />`.

- **Build:** ✅ passes (2281 modules, 56 precache entries)
- **Note:** Old `dist/` folder has permission lock — user must `rm -rf frontend/dist` before local rebuild, or Vercel handles it automatically.

✅ **AI stack REWRITTEN — needs deploy + test.**

### AI REWRITE (this session) — FAANG-Level Upgrade
All 4 AI files rewritten from scratch:

1. **`supabase/functions/_shared/cors.ts`** — Origin allowlist (was `*` wildcard). Now only `iconnect-med.vercel.app` + localhost accepted. Legacy `corsHeaders` export kept for backward compat.

2. **`supabase/functions/ai-orchestrator/index.ts`** — Full rewrite:
   - Circuit breaker: tracks failures per provider, auto-skips after 3 failures in 60s
   - Streaming SSE: `stream: true` in request body → token-by-token delivery
   - Request tracing: `x-trace-id` header propagated through full chain
   - Input validation: max_tokens clamped 1–2048, prompts capped at 12k chars
   - Structured JSON logging with timestamps, trace IDs, latency
   - Origin-specific CORS (no more wildcard)
   - Provider name returned in response (`{ data, provider }`)
   - Proper 429 with `Retry-After` header

3. **`supabase/functions/gemini-proxy/index.ts`** — Rewrite:
   - Streaming SSE support
   - Input validation (50 message limit, 4k chars per message)
   - Structured logging, request tracing
   - Origin-specific CORS
   - Timeout handling (504 vs 502 distinction)

4. **`frontend/src/lib/aiService.js`** — Rewrite:
   - Removed dead `USE_EDGE_FUNCTION` flag and direct Gemini client code
   - Added `readSSEStream()` for streaming token consumption
   - `callOrchestrator()` supports `{ stream, onToken }` options
   - Request tracing via `x-trace-id`
   - Client-side prompt truncation matching server limits
   - Human-friendly error messages for rate limit and auth expiry
   - Consistent `parseAiJson()` used by ALL structured response functions
   - All 15 exported functions preserved with identical signatures

- **Build:** ✅ passes (verified)
- **Deploy needed:** Both edge functions must be redeployed:
  ```
  npx supabase functions deploy ai-orchestrator --no-verify-jwt
  npx supabase functions deploy gemini-proxy --no-verify-jwt
  ```
- **GEMINI_API_KEY:** Already set as Supabase secret ✅
- **Backward compatible:** All 10 consumer components import unchanged function signatures

✅ **P0 navigation bug FIXED and built. Needs deploy.**

### BUG-NAV-001 FIX (this session)
- **Root cause confirmed:** `syncFromLocation` was running on EVERY `location.pathname` change, including programmatic `navigate()` calls (PUSH events). When `setPage('ebooks')` called `navigate('/ebooks')`, React could render with `page='ebooks'` but `location.pathname='/'` (old URL still in closure). `syncFromLocation('/')` then RESET page back to 'dashboard', causing the one-page-behind bug.
- **Fix 1 — App.jsx:** Only call `syncFromLocation` when `navigationType === 'POP'` (browser back/forward + direct URL load). Programmatic PUSH/REPLACE navigations skip it entirely.
- **Fix 2 — useAppStore.js:** Added `if (page === get().page) return;` guard in `syncFromLocation` to prevent redundant re-renders.
- **Files changed:** `frontend/src/App.jsx` (import useNavigationType, guard effect), `frontend/src/stores/useAppStore.js` (no-op guard)
- **Build:** ✅ passes

### ⚠️ STILL OPEN: BUG-NAV-002 (deep-link fails — loads Dashboard instead of target page)
This is a separate bug. `initRouter` sets page from URL on mount, but the auth effect calls `setPage(urlPage)` which may navigate away. Needs investigation after BUG-NAV-001 is confirmed fixed in production.

### ⚠️ STILL OPEN: BUG-AUTH-001 (admin buttons visible on public login page)
Low-risk security cosmetic issue. Not blocking.

---

✅ **ARCHITECTURAL SURGERY COMPLETE. All 4 phases deployed to Vercel (commit 1975334).**

### Surgery Summary
- **Phase 1 (Security):** dbService.js service layer, NVIDIA key moved to edge function, auth hardening, cache leak killed, sendBeacon fixed
- **Phase 2 (Data Integrity):** Zod schema layer (8 schema files), idempotency constraints, question schema unified, phantom offline registration blocked
- **Phase 3 (State Management):** BUG-O (navigate out of Zustand), BUG-N (useCallback memoization), BUG-P (toast timer tracking), BUG-A (page whitelist), BUG-H (notification dedup), BUG-I (user truncation removed), BUG-L (timer inflation fixed), BUG-S (parseAiJson helper)
- **Phase 4 (UI/UX/PWA):** theme.css CSS custom properties, BUG-X (quiz schema mismatch fixed), BUG-M (kahoot redirect), BUG-U (dead admin tab removed)

### ⏳ Pending Manual Actions (Ayush must do these)

1. **[URGENT] Rotate NVIDIA API key** — was previously in browser bundle
   - `npx supabase secrets set NVIDIA_API_KEY=<new-key>`
   - Then flip `USE_EDGE_FUNCTION = true` in `frontend/src/lib/aiService.js`

2. **Set OTP rate limits** in Supabase dashboard Auth settings
   - 5 OTP emails per hour per address

3. **Dark mode audit (BUG-W)** — 1,591 hardcoded hex colors in inline styles
   - Walk each screen in dark mode
   - Report which screens look broken
   - Claude will replace hex values with CSS vars from theme.css

4. **PWA install test (BUG-V)** — open deployed URL in Chrome on Android, verify install prompt fires

### ✅ Previous Critical Stability Fixes Still Apply
- **AUTH-001:** Auth effect no longer re-fires setPage('dashboard') on token refresh (authBootedRef guard)
- **AUTH-002:** Login page no longer flickers — spinner shown while session exists but role unresolved
- **UX-001:** beforeunload "Leave site?" popup removed from all pages except active exams
- **DASH-002:** DoctorDashboard shows spinner when userId not yet available (prevents crash)
- Error states + retry UI: MyPerformancePage, SmartNotesPanel — complete
- Empty catch blocks: 54 blocks across 21 files — complete
- Duplicate page headers removed: ExamPage, NotificationsPage, EBooksPage, LeaderboardPage — complete
- Duplicate search bar removed: LibraryFilterBar (kept SemanticSearch as sole search) — complete
- **Dark mode pass 1:** NotificationsPage + ProfilePage (~25 hardcoded hex → CSS vars)
- **Dark mode pass 2:** Remaining rgba() fixes — typeBg, ROLE_LABELS bg, incomplete banner, completion badges, "Not provided" text (#92400E → #F59E0B)
- `.ni-t` class in index.css now has `color: var(--text)` for dark mode
- NA-003 + NA-013: Already complete from prior session (popLayout, 0.18/0.1s, 9-query Promise.all, SWR cache)
- `supabase db push` — ✅ DONE (migration 20260326032952 applied to prod)
- Mega fix pass (this session): PROF-001 (authData undefined bug fixed), PROF-003 (name/phone validation), USER-001 (Suspend/Activate bulk action + suspended filter), DASH-001 (profiles query capped at 1000 rows), dark mode UserManagement (~15 hardcoded colors → CSS vars + rgba)
- **Ready for: NA-009 (initial query reduction) or NA-014 (auth.getUser() cleanup)**

---

## What Changed This Session — Error Handling + UI Sprint

### FIX 8: Dark Mode Contrast — NotificationsPage.jsx
- Replaced ~12 hardcoded hex colors (#F9FAFB, #F3F4F6, #E5E7EB, #D1D5DB, #6B7280, #9CA3AF, #374151) with CSS variables (var(--surf), var(--border), var(--muted), var(--light), var(--text))
- Notification card backgrounds, borders, body text, mark-read button, date group labels all now respect dark theme

### FIX 9: Dark Mode Contrast — ProfilePage.jsx
- Replaced ~13 hardcoded hex colors with CSS variables
- Personal info rows: label color → var(--muted), value color → var(--text), dividers → var(--border)
- Academic info rows: same treatment
- Verification steps: done color → #60A5FA (visible on dark), pending → #F59E0B, default → var(--muted)
- Stats cards: background → var(--surf), value → #60A5FA, label → var(--muted)
- Completion badges: subject text → #60A5FA, date → var(--muted)
- Read-only email input: bg → var(--surf), color → var(--muted)
- Loading spinner border: → var(--border)

### FIX 10: .ni-t CSS class — index.css
- Added `color: var(--text)` to `.ni-t` (notification title) — was inheriting from parent with no explicit color

### FIX (earlier): Duplicate Page Headers Removed
- ExamPage.jsx: removed .ph block, kept subtitle as standalone .ps
- NotificationsPage.jsx: removed .ph-row, kept "unread" count + "Mark all read" button
- EBooksPage.jsx: removed .ph-row with title, kept document count + view toggle
- LeaderboardPage.jsx: removed .ph-row, kept subtitle + period tabs

### FIX (earlier): Duplicate Search Bar — LibraryFilterBar.jsx
- Removed "Search by title" text input (SemanticSearch is the primary search)

---

## What Changed Previous Session — Error Handling Sprint

### FIX 5: Error State + Retry UI — MyPerformancePage.jsx
- Added `loadError` + `retryKey` state variables
- Catch block now sets `loadError` message
- Renders error banner with retry button (increments retryKey to re-trigger useEffect)
- useEffect dependency array now includes `retryKey`

### FIX 6: Error State + Retry UI — SmartNotesPanel.jsx
- Added `loadError` state
- fetchNotes: now checks Supabase `error` response, throws if present, sets `loadError`
- handleSave: catch now sets `draft.error` for inline error display
- handleDelete: catch now logs warning
- Notes list renders error banner with retry button between loading and empty states

### FIX 7: Empty Catch Block Remediation (54 blocks across 21 files)
All `catch (_) {}` blocks replaced with `catch (e) { console.warn('Context:', e.message); }`:
- ProfilePage.jsx (2), ReportsPage.jsx (3), UsersPage.jsx (2)
- supabase.js (6 — signOut kept as safe-to-ignore comment)
- DoctorEngageView.jsx (1), ChatBot.jsx (1), App.jsx (7)
- LearnHub.jsx (1), SADashboard.jsx (3), ConferencesPage.jsx (1)
- ReadingQuizModal.jsx (1), MCIVerificationQueue.jsx (1), EBooksPage.jsx (4)
- DiaryPanel.jsx (1), PersonaBuilder.jsx (1), WebinarLeaderboardRow.jsx (1)
- ManageAdminsTab.jsx (1), ArtifactsTab.jsx (2), WebinarCalendarTab.jsx (1)
- AIInsightsTab.jsx (1), DoctorDashboard.jsx (3)

### Migration: Patch triggers + missing columns
**New file:** `supabase/migrations/20260326032952_patch_missing_triggers_and_columns.sql`
- Creates shared `set_updated_at()` trigger function
- Attaches BEFORE UPDATE trigger to all 6 tables from the previous migration
- Adds: `study_hours`, `goals_met` to calendar_diary; `weekly_target_mins` to user_study_persona; `updated_at` to clinical_logs and idempotency_keys
- Includes commented-out DOWN migration

---

## What Changed Previous Session — Performance Sprint

### FIX 1: App.jsx — Killed re-render hell (BIGGEST IMPACT)
**Modified:** `frontend/src/App.jsx`
- Replaced `useAppStore(useShallow(s => s))` (subscribed to ENTIRE store) with 14 individual granular selectors
- Same for `useAuthStore(useShallow(s => s))` → 16 individual selectors
- Same for `useChatStore(useShallow(s => s))` → 2 selectors
- Same for `useTenantStore(useShallow(s => s))` → 3 selectors
- Removed `useShallow` import entirely
- Added `useMemo` for `sharedProps` object (was recreated every render, triggering all children)
- Added `useCallback` for `openChatBotDoubt` (was inline lambda)
- **Impact:** Before: ANY store change → full MainApp tree re-renders (Sidebar, TopBar, page, ChatBot, Toasts all re-paint). After: only the specific state consumers re-render.

### FIX 2: Query Waterfall Elimination
**Modified:** `frontend/src/components/MyPerformancePage.jsx`
- Converted 3 sequential `await` queries (profiles → scores → logs) into single `Promise.all([...])` — 3 network round-trips → 1

**Modified:** `frontend/src/components/ActivityPage.jsx`
- Merged secondary waterfall `Promise.all([quizLogsRes, readLogsRes])` (lines 185-188) INTO the initial Promise.all batch
- Pre-computed `mondayISO` before the batch (it only depends on `new Date()`, not query results)
- Eliminated duplicate `now`/`monday` computation
- **Impact:** ActivityPage: 5+2 queries in 2 batches → 6 queries in 1 batch. MyPerformancePage: 3 sequential → 3 parallel.

### FIX 3: React.memo on 7 Dashboard Child Components
**Modified (all wrapped in `React.memo`):**
- `frontend/src/components/dashboard/ForYouWidget.jsx`
- `frontend/src/components/dashboard/MyActivitySection.jsx`
- `frontend/src/components/dashboard/LatestAlerts.jsx`
- `frontend/src/components/dashboard/LatestContentSection.jsx`
- `frontend/src/components/dashboard/CalendarGoalRow.jsx`
- `frontend/src/components/dashboard/WebinarLeaderboardRow.jsx`
- `frontend/src/components/dashboard/ReadingBookmarksRow.jsx`
- `frontend/src/components/dashboard/StudyPlanCard.jsx`
- **Impact:** When DoctorDashboard re-renders (e.g., diaryCache update), children with unchanged props skip re-render entirely.

### FIX 4: Memoized Callbacks in DoctorDashboard
**Modified:** `frontend/src/components/DoctorDashboard.jsx`
- Replaced inline `refreshDashboard={() => {...}}` lambda with `useCallback`
- Added `stableBookmarkToggle` via `useCallback`
- **Impact:** CalendarGoalRow and LatestContentSection no longer receive new function references every render, making their React.memo effective.

### Previously Applied (by earlier Sonnet sessions)
- PageTransition.jsx: already optimized (mode="popLayout", 180ms/100ms durations)
- GoalRing.jsx: already responsive SVG + DB persistence + Tailwind conversion
- DoctorDashboard.jsx: already uses userIdProp (no auth.getUser call), has stale-while-revalidate cache, diary sync via Zustand

---

## Decisions Made
- **Granular selectors over useShallow:** `useShallow(s => s)` is semantically "subscribe to everything" even though it shallow-compares. Individual selectors are more explicit and each only triggers on their specific slice.
- **React.memo without custom comparator:** Sufficient because we memoized the callback props. Deep equality comparators add complexity with diminishing returns.
- **Did NOT create new Zustand stores:** All optimizations used existing stores as per CLAUDE.md rules.
- **Did NOT refactor supabase.js:** Query consolidation was done at the component level to minimize blast radius.

---

## DO NOT TOUCH
- `.bak` files — backup files, read-only
- `.agent/MASTER_AUDIT_AND_BLUEPRINT.md` — preserved as-is per user instruction
- `.agent/MASTER_BLUEPRINT_COMPLETE.md` — reference document
- `.agent/MASTER_EXECUTION_PROMPT.md` — Phase 1-6 complete, archived

---

## Previous Session (NA-029 + NA-030)

### NA-029 — Fix Activity Page UI Redundancy & KPI Aggregation ✅
**Modified:** `frontend/src/components/ActivityPage.jsx`
- Removed `.ph` header block ("My Activity" title + subtitle) — duplicate of TopBar title
- Added 3 new state vars (`activeDays`, `booksRead`, `quizzesDone`) set from fresh logsRes data — eliminates stale-cache drift where KPIs diverged from heatmap
- logsRes query now selects `activity_type, reference_id` in addition to `created_at, duration_minutes`
- `activeDays`: unique ISO dates in the 90-day map (Object.keys count) — matches heatmap exactly
- `booksRead`: distinct `reference_id` values for `article_read` events — no more row-count inflation
- `quizzesDone`: distinct `reference_id` values for `quiz*` events — no more row-count inflation
- KPI cards show `0` instead of `'—'` for zero values
- Cache structure updated to store/restore the 3 new KPI fields
- Removed the 3 stale render-time derived const lines

### NA-030 — 90-Day Heatmap UI Polish & Alignment ✅
**Modified:** `frontend/src/components/Activity/ActivityHeatmapClickable.jsx`
- Heatmap now centers inside its card: outer `textAlign: center` + inner `display: inline-block` wrapper eliminates dead space on wider screens
- Diary dots: enlarged 4→6px, repositioned from bottom-right corner to centered (`top: 50%, left: 50%, transform: translate(-50%,-50%)`), white border ring + indigo outline shadow for visibility on both light and dark cell backgrounds
- Legend diary dot updated with matching `border: 1.5px solid #4338CA`

---

## What Changed This Session (NA-027)

### NA-027 — Centralized Notes Architecture (Hidden Release) ✅
**New file:** `frontend/src/lib/supabase/notes.js`
- Domain-scoped DB module for all notes operations
- Pure helper: `buildHierarchy(notes)` — groups flat notes into `[{ subject, books: [{ artifactId, title, notes }] }]`
- All 8 DB functions: getUserNotesHierarchy, getSmartNotesHierarchy, getUserNoteById, createNote, updateNote, deleteNote, toggleSmartNoteStar, deleteSmartNote

**New file:** `frontend/src/pages/Notes.jsx`
- Three-level hierarchy: Subject cards → Book cards → Notes list
- URL deep-links: `?tab=my|ai`, `?subject=X`, `?book=artifactId`, `?id=noteId`
- `?id=noteId` auto-resolves subject+book then scrolls to the highlighted note
- Inline note editing (click Edit → textarea → Save/Cancel)
- New Note composer at Subject level (book selector + textarea)
- Search bar at Book level (filters note content + highlights)
- AI notes: star/unstar, delete
- Back button + breadcrumb for navigation

**Modified:** `frontend/src/App.jsx`
- Lazy import changed from `./components/NotesPage` to `./pages/Notes`

**Modified:** `frontend/src/components/Sidebar.jsx`
- Removed `{ k: 'notes', l: 'My Notes' }` from drMore
- Removed `StickyNote` icon import and iconMap entry
- Zero visible nav links to Notes — strictly hidden release

---

## What Changed This Session (NA-025 + NA-026)

### NA-025 — Weekly Progress Analytics ✅
**Modified:** `frontend/src/components/ActivityPage.jsx`
- Added imports: `wowVariance, peakFocusTime, weeklyBuckets, trendColor, trendArrow` from `analytics.js`
- Added state: `wowInsight`, `peakTime`
- In `loadAll()`: calls `weeklyBuckets(logs90, 4)` to compute WoW activity count; calls `peakFocusTime(logs90)` for peak hour
- Weekly Progress card header: shows WoW % badge (green/red pill) when direction is not flat
- Below "Total this week": added "Peak focus time" row with hour label + % of activity

### NA-026 — My Performance Analytics Insights ✅
**Modified:** `frontend/src/components/MyPerformancePage.jsx`
- Added imports: all analytics.js exports
- Added state: `wowCountInsight`, `wowMinsInsight`, `momCountInsight`, `peakTime`, `maData`
- 4-week trend computation now uses `weeklyBuckets(logs, 4)` via analytics.js
- WoW count + mins, MoM count (8-week proxy), peak focus, 3-pt moving average all computed
- 4-week trend bars: replaced `+N vs prev` raw delta with `trendBadge(wowVariance(count, prevCount))` + `trendColor()` inline
- NEW "Analytics Insights" card (after trend, before calendar): 4 insight panels — Activity WoW %, Study Time WoW %, Activity MoM %, Peak Focus time

**New file (from prior session):** `frontend/src/lib/analytics.js`
- Pure utility: `movingAverage`, `wowVariance`, `momVariance`, `weeklyBuckets`, `peakFocusTime`, `trendColor`, `trendArrow`, `trendBadge`
- No side effects, no DB calls — consumers pass pre-fetched data

---

## What Changed Earlier (NA-022 + NA-024)

### NA-022 — Dashboard Activity Calendar Drill-Down ✅
**New file:** `frontend/src/components/JournalModal.jsx`
- Unified diary component replacing both `DayDetailPanel` and `DiaryPanel`
- `mode="modal"` → centered overlay (Dashboard); `mode="panel"` → slide-in from right (Activity)
- Features: mood picker (5 emoji), debounced auto-save notes (1000ms debounce), study hours, goals-met toggle, activity log (from `getActivityLogsForDay`), content progress (from `getContentProgressForDay`)
- All DB access via supabase.js helpers — zero raw `supabase.from()` calls in component
- Writes to `useAppStore.diaryCache` on every save for cross-page sync

**Modified:** `frontend/src/components/dashboard/CalendarGoalRow.jsx`
- Replaced `DayDetailPanel` import with `JournalModal`
- Gets `addToast` from `useAppStore` directly (no prop drilling)
- `onSave` closes modal AND calls `refreshDashboard()` → triggers full heatmap re-fetch

### NA-024 — 90-Day Activity Heatmap Editability & Synchronization ✅
**Modified:** `frontend/src/components/ActivityPage.jsx`
- Replaced `DiaryPanel` with `JournalModal mode="panel"`
- `onSave` handler: adds saved date to local `diaryDates` Set immediately
- Subscribes to `useAppStore.diaryCache` → merges any diary saves from Dashboard into `diaryDates` without re-fetch

**Modified:** `frontend/src/components/DoctorDashboard.jsx`
- Added `import { useAppStore }`
- `useEffect` on `diaryCache`: merges dates with `study_hours > 0` into `activityByDate` → heatmap updates immediately when Activity page saves a diary

**Modified:** `frontend/src/stores/useAppStore.js`
- Added `diaryCache: {}` — map of date → saved diary payload
- Added `setDiaryCache(date, data)` action — called by JournalModal on every save

**Modified:** `frontend/src/lib/supabase.js`
- Added `getActivityLogsForDay(userId, date)` — activity timeline for JournalModal
- Added `getContentProgressForDay(userId, date)` — content progress for JournalModal

---

## What Changed Earlier (NA-019 → NA-023)

### NA-019 — Sidebar Navigation Latency ✅
**File:** `frontend/src/components/Sidebar.jsx`
- Added `useTransition` from React 18 to `NavItem`.
- `setPage(item.k)` is now called inside `startTransition()`.
- Effect: React suppresses the Suspense spinner during page transitions — the current page stays visible until the lazy bundle finishes loading, then swaps atomically. A small pulsing dot on the nav item gives immediate feedback.
- Previously: every first navigation showed a full-page spinner (jarring).

### NA-020 — Theme Toggle State Synchronisation ✅
**Files:** `frontend/src/stores/useAppStore.js`, `frontend/src/components/TopBar.jsx`

Two bugs fixed:

1. **FOUC (Flash of Unstyled Content):** `darkMode` HTML class was only applied inside a `useEffect` — after React's first render — causing dark-mode users to see a flash of light mode on every page load.
   - Fix: Applied `document.documentElement.classList.toggle('dark', isDark)` and `setAttribute('data-theme', ...)` **synchronously** inside the store's IIFE initializer, before React renders anything.
   - `setDarkMode` action also now applies the HTML class immediately on every toggle.

2. **Function-updater bug:** `TopBar.jsx` called `setDarkMode(d => !d)` — passing a function to a plain Zustand action (not useState). Functions are truthy, so `localStorage` always received `'dark'` and the `darkMode` state was set to a function reference.
   - Fix: Changed to `setDarkMode(!darkMode)` — passes the concrete boolean.

### NA-021 — Fix "For You" Refresh Redundancy ✅
**File:** `frontend/src/components/DoctorDashboard.jsx`
- `refreshForYou` callback was making a direct `supabase.from('profiles').select('speciality')` call inside the component — a CLAUDE.md violation ("NEVER write raw supabase.from() calls inside components").
- `mySpeciality` is already fetched and held in state by `load()` (line 100: `if (profileData?.speciality) setMySpeciality(profileData.speciality)`).
- Fix: Removed the profile re-fetch entirely. `refreshForYou` now uses `mySpeciality` from state. `dashDataRef.current` already holds all other AI input data (booksRead, quizScore, totalScore, weeklyMins, lastActive, recentSubjects).
- Net: one fewer network round-trip per refresh click; rule violation eliminated.

### NA-023 — Fix Weekly Learning Target Widget Sizing ✅
**Files:** `frontend/src/components/dashboard/GoalRing.jsx`, `frontend/src/components/dashboard/CalendarGoalRow.jsx`

**GoalRing.jsx:**
- NA-017 Tailwind conversion had left `style={{ maxWidth: 120 }}` as an unavoidable inline style (120px has no exact standard Tailwind 3 scale value).
- Changed to `className="max-w-44"` (11rem / 176px — standard Tailwind scale).
- Ring is now 47% larger, proportioned correctly inside its card, and has zero inline styles.

**CalendarGoalRow.jsx:**
- Grid container: `style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}` → `className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5"`
- GoalRing card: `style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}` → `className="card flex flex-col items-center justify-center" style={{ margin: 0 }}`
- Kept `style={{ margin: 0 }}` on both `.card` divs — the `.card` CSS class applies margin that must be overridden inline.

---

## What Changed This Session — Comprehensive Bug Fix Pass (2026-04-03)

### FIX: Navigation Stale Content — App.jsx
- Root cause: `setPage()` called DURING render in `renderPage()` (route guard + kahoot redirect)
- Calling Zustand's `set()` during render is a React anti-pattern — current render proceeds with stale state
- Fix: replaced `setPage(x); return null;` with `queueMicrotask(() => setPage(x)); return <PageLoader />;`
- This schedules the state update AFTER the current render completes
- `key={page}` on `<PageErrorBoundary>` still forces full unmount/remount on valid navigations

### FIX: WebSocket Infinite Retry — useAppStore.js + supabase.js
- Added status callback to `.subscribe()` in `subscribeToNotifications`
- On `TIMED_OUT`: removes channel and cleans up `_channels` map to prevent infinite retry
- On `CHANNEL_ERROR`: logs warning (Supabase handles retry automatically)
- Added `timeout: 30000` to Supabase client realtime config

### FIX: getContentProgressForDay — supabase.js
- Was querying `content_type, progress_pct` columns that don't exist in `user_content_state`
- Fixed to query actual columns: `artifact_id, current_page, is_bookmarked, updated_at`
- Maps result to the shape JournalModal expects: `{ content_type: 'reading', progress_pct: min(current_page*10, 100) }`

### NEW: admin_calendar_events migration
- Created `supabase/migrations/20260403000001_admin_calendar_events.sql`
- Table with: id, title, date, description, color, is_compulsory, created_by, timestamps
- RLS: SELECT for all, INSERT for admins, UPDATE/DELETE for superadmins
- IF NOT EXISTS guards on all policies + trigger

### AI/Orchestrator Review
- `ai-orchestrator` edge function is production-ready — no code changes needed
- `USE_EDGE_FUNCTION = true` in aiService.js routes all AI through orchestrator
- NVIDIA primary → Gemini fallback works correctly
- gemini-proxy 502 fix: user must set `GEMINI_API_KEY` secret and deploy edge functions

### Blueprint Created
- `.agent/COMPREHENSIVE_FIX_BLUEPRINT.md` — full analysis + CLI prompt + verification matrix

---

## ⏳ Pending Manual Actions (Ayush must do these)

1. **[CRITICAL] Set Gemini API key and deploy edge functions:**
   ```bash
   npx supabase secrets set GEMINI_API_KEY=<YOUR_GEMINI_KEY>
   npx supabase functions deploy gemini-proxy --no-verify-jwt
   npx supabase functions deploy ai-orchestrator
   ```

2. **[CRITICAL] Push the database migration:**
   ```bash
   npx supabase db push
   ```

3. **[CRITICAL] Build and deploy frontend:**
   ```bash
   cd frontend && npm run build && git add -A && git commit -m "fix: navigation, AI, WebSocket, DB schema" && git push
   ```

4. **Test all 5 fixes** using the verification matrix in `.agent/COMPREHENSIVE_FIX_BLUEPRINT.md`

## Next Session Must Start With

**→ After Ayush deploys, pick from:**
1. Verify all 5 fixes are working in production
2. Dark mode audit results from Ayush → BUG-W color replacement pass
3. NVIDIA key rotation follow-up (set NVIDIA_API_KEY for faster AI responses)

---

## Cumulative File Change Log (all sessions)

| File | Changes |
|------|---------|
| `frontend/src/components/JournalModal.jsx` | NEW — unified diary/journal modal (NA-022, NA-024) |
| `frontend/src/lib/supabase.js` | +getDiaryEntry, +upsertDiaryEntry, +getDiaryEntriesRange, +getActivityLogsForDay, +getContentProgressForDay, +getAllUserNotes, +getSmartNotes, +toggleSmartNoteStar, +deleteSmartNote |
| `frontend/src/components/ActivityPage.jsx` | JournalModal replaces DiaryPanel; diaryCache sync |
| `frontend/src/lib/aiService.js` | date-based variation seed in getPersonalizedSuggestions |
| `frontend/src/stores/useAppStore.js` | FOUC fix; setDarkMode; +diaryCache, +setDiaryCache |
| `frontend/src/components/App.jsx` | parallel fetches, lazy routes, PageErrorBoundary, ROLE_PAGES |
| `frontend/src/components/Sidebar.jsx` | useTransition in NavItem, My Notes nav item |
| `frontend/src/components/TopBar.jsx` | setDarkMode(!darkMode) fix |
| `frontend/src/components/DoctorDashboard.jsx` | weekActivity fix, error banner, useAuth, ForYou cache key, refreshForYou cleanup; +diaryCache sync; V1-V3 fixes |
| `frontend/src/lib/analytics.js` | NEW — pure analytics utilities (movingAverage, wowVariance, weeklyBuckets, peakFocusTime, trendColor/Arrow/Badge) |
| `frontend/src/components/MyPerformancePage.jsx` | percentile badge, 4-week trend chart → trendBadge %; new Analytics Insights card |
| `frontend/src/components/ActivityPage.jsx` | WoW badge in Weekly Progress header; peak focus time row |
| `frontend/src/components/NotesPage.jsx` | NEW — unified Notes page |
| `frontend/src/components/ui/PageErrorBoundary.jsx` | NEW — error boundary with resetKey |
| `frontend/src/components/dashboard/ActivityDots.jsx` | normalized bar heights |
| `frontend/src/components/dashboard/StudyPlanCard.jsx` | empty-state CTAs |
| `frontend/src/components/dashboard/DayDetailPanel.jsx` | error state, full Tailwind, diary helper |
| `frontend/src/components/dashboard/GoalRing.jsx` | full Tailwind, max-w-44 sizing |
| `frontend/src/components/dashboard/ForYouWidget.jsx` | full Tailwind, SuggestionRow extraction |
| `frontend/src/components/dashboard/CalendarGoalRow.jsx` | Tailwind grid + flex, sizing fix; JournalModal (NA-022) |
| `frontend/src/components/Activity/DiaryPanel.jsx` | getDiaryEntry/upsertDiaryEntry migration |
| 14+ other components | useAuth() replacing supabase.auth.getUser() |

---

## Architectural Decisions Made

- `DiaryPanel.jsx` retains direct `supabase` import for `activity_logs` (not diary table) — correct, no change needed
- `ForYouWidget.SuggestionRow` extracted as local component to eliminate 3 near-identical blocks
- `DayDetailPanel` preserves `mood` on save via `diary?.mood ?? null` — no mood UI in dashboard, but field is never overwritten
- Variation seed in `aiService.js` is date-based (daily) — cached results stable within a day, refresh daily
- `GoalRing` `maxWidth` inline style replaced with `max-w-44` — old `120px` was below the 7rem Tailwind minimum; 176px is the right visual size
- `ROLE_PAGES.superadmin = []` (empty = unrestricted) — easier to maintain than explicit list

---

## Do NOT Touch Until Discussed
- `frontend/src/migrations/` — reference only, never run or delete
- `*.bak` files — backups, leave alone
- `server/` — needs audit before any changes
- `supabase/migrations/20260301071219_remote_schema.sql` — master schema dump, do not modify

---

## Known Issues / Open Questions
- `supabase db diff` still fails locally (profiles ordering in 2024xxxx migrations) — cosmetic only, prod is fine
- `server/` Express backend vs Supabase redundancy — audit still pending
- Chunk size warning (`index-*.js` ~664kB gzip 211kB) — pre-existing, non-blocking; candidate for manual chunk splitting in a later session
- NA-022 spec not yet written — check if it's in next-actions-production.md or needs to be defined before implementation begins
