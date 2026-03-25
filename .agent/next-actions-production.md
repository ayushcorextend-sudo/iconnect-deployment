# iConnect — Production Action Items (Post-Phase 6)
# ════════════════════════════════════════════════════════════════
# Format: [NA-XXX] Task Name
# Created: 2026-03-25 by Opus (Principal Architect)
# Executor: Sonnet
# ════════════════════════════════════════════════════════════════

## Execution Rules for Sonnet
1. Execute tasks sequentially by priority (P0 → P1 → P2 → P3).
2. Within the same priority, execute in order listed.
3. Each task is self-contained. Read ONLY the files listed in "Files to read."
4. Do NOT read the entire codebase. Do NOT scan folders.
5. After each task, run `npm run build` and confirm zero errors.
6. Do NOT create new Zustand stores — check the 6 existing stores first.
7. All Supabase queries go through `frontend/src/lib/supabase.js` — never raw calls in components.
8. Use design tokens from `frontend/src/styles/tokens.js` — never arbitrary Tailwind values.
9. Use z-index values from `frontend/src/styles/zIndex.js` — never hardcoded z-index numbers.
10. Say "Done — NA-XXX complete" after each task. Say "Next" to proceed.

---

## ─── P0 — CRITICAL: User-facing broken functionality ────────────

### [NA-001] Fix ForYou refresh passing hardcoded zeros

**Priority:** P0
**Estimated tokens:** 8,000
**Files to read:**
- `frontend/src/components/DoctorDashboard.jsx` — lines 194–206 (refreshForYou callback)
- `frontend/src/components/DoctorDashboard.jsx` — lines 112–148 (where booksRead, weeklyMins, scores are computed)
- `frontend/src/lib/aiService.js` — lines 377–422 (getPersonalizedSuggestions signature)

**Problem:**
`refreshForYou` (line 194) calls `getPersonalizedSuggestions` with `booksRead: 0, quizScore: 0, totalScore: 0, weeklyMins: 0, lastActive: null, recentSubjects: []`. These are hardcoded zeros. The initial load (lines 170–177) partially populates some fields (booksRead from logs, speciality from profile) but also passes `quizScore: 0, totalScore: 0, weeklyMins: 0`. Both paths send garbage data to the AI, producing generic suggestions.

**Instructions:**
1. At the top of the `load()` function (around line 55), after computing `logs`, `scoreData`, etc., store the derived values in `useRef` or local state that `refreshForYou` can access:
   - `booksRead` = `logs.filter(l => l.activity_type === 'article_read').length`
   - `quizScore` = `meScore?.quiz_score || 0`
   - `totalScore` = `meScore?.total_score || 0`
   - `weeklyMins` = `wMins` (computed at lines 139–143)
   - `lastActive` = `logs?.[0]?.created_at || null`
   - `recentSubjects` = subjects from read artifacts
2. Use `useRef` to store these values so `refreshForYou` (a `useCallback`) can read them without adding dependencies:
   ```
   const dashDataRef = useRef({ booksRead: 0, quizScore: 0, totalScore: 0, weeklyMins: 0, lastActive: null, recentSubjects: [] });
   ```
3. Update `dashDataRef.current` at the end of the `load()` function with the real computed values.
4. In `refreshForYou`, replace the hardcoded zeros with `dashDataRef.current` spread:
   ```
   const { suggestions, error } = await getPersonalizedSuggestions({
     speciality: profileData?.speciality || '',
     ...dashDataRef.current,
   });
   ```
5. Also fix the initial `getPersonalizedSuggestions` call (lines 170–177) to pass `quizScore`, `totalScore`, and `weeklyMins` from the already-computed variables instead of zeros.

**Verification:**
- Click the 🔄 refresh button on the ForYou widget.
- Open browser DevTools → Network tab. Inspect the AI API request body.
- Confirm the payload contains real non-zero values for a user with activity history.
- Confirm suggestions are personalized (not generic filler).

---

### [NA-002] Fix DayDetailPanel: add diary editing capability

**Priority:** P0
**Estimated tokens:** 12,000
**Files to read:**
- `frontend/src/components/dashboard/DayDetailPanel.jsx` — full file (lines 1–140)
- `frontend/src/components/Activity/DiaryPanel.jsx` — lines 37–127 (reference for diary CRUD pattern)
- `frontend/src/styles/zIndex.js` — for correct z-index value

**Problem:**
DayDetailPanel is READ-ONLY. When a user clicks a date on the calendar, they see diary notes and activity but CANNOT edit or add diary entries. The user reported "Calendar diary - not opening at all" — it opens but is useless without edit capability. Also uses hardcoded `zIndex: 500` (line 65) instead of the z-index system.

**Instructions:**
1. Replace hardcoded `zIndex: 500` (line 65) with the import from zIndex.js: `import { Z } from '../../styles/zIndex';` → use `Z.MODAL` or equivalent.
2. Add an edit mode toggle:
   - Add state: `const [editMode, setEditMode] = useState(false);`
   - Add state for edit fields: `const [editNotes, setEditNotes] = useState(''); const [editHours, setEditHours] = useState(''); const [editGoals, setEditGoals] = useState(false);`
3. When `diary` data loads, pre-populate edit fields: `setEditNotes(diary?.personal_notes || ''); setEditHours(diary?.study_hours?.toString() || ''); setEditGoals(diary?.goals_met || false);`
4. In the diary note section (lines 100–108), add a pencil button to toggle edit mode.
5. In edit mode, render:
   - A `<textarea>` for personal_notes (auto-focus, 4 rows)
   - A number `<input>` for study_hours
   - A checkbox for goals_met
   - Save / Cancel buttons
6. Save handler: upsert to `calendar_diary` table:
   ```
   await supabase.from('calendar_diary')
     .upsert({
       user_id: userId,
       date: date,
       personal_notes: editNotes,
       study_hours: parseFloat(editHours) || 0,
       goals_met: editGoals,
     }, { onConflict: 'user_id,date' });
   ```
7. After save, re-call `load()` to refresh, exit edit mode.
8. If no diary exists for that date, show an "Add diary entry" button that enters edit mode with empty fields.

**Verification:**
- Click a date on the dashboard calendar.
- DayDetailPanel opens — verify no hardcoded z-index in the DOM.
- Click "Add diary entry" or the edit icon.
- Type notes, set hours, toggle goals.
- Click Save. Close panel. Reopen same date — data persists.
- Navigate to Activity page → Diary → same date. Confirm data matches.

---

### [NA-003] Fix sidebar navigation perceived latency

**Priority:** P0
**Estimated tokens:** 10,000
**Files to read:**
- `frontend/src/components/ui/PageTransition.jsx` — full file (24 lines)
- `frontend/src/components/DoctorDashboard.jsx` — lines 48–71 (Promise.all block), lines 86–92 (sequential leaderboard query)
- `frontend/src/App.jsx` — lines 440–500 (renderPage switch with React.lazy)
- `frontend/src/stores/useAppStore.js` — lines 31–35 (setPage)

**Problem:**
When clicking sidebar items, there is visible lag before content appears. Root causes:
1. PageTransition uses `mode="wait"` with 350ms entrance + 200ms exit = 550ms total animation wall before new content is even visible.
2. Every sidebar click triggers React.lazy chunk download (if not cached) + full component mount + data fetch cascade.
3. DoctorDashboard fires 8 parallel + 1 sequential query = 9 queries on every mount. No stale-while-revalidate caching.

**Instructions:**
1. **PageTransition.jsx** — Reduce animation times:
   - Change entrance `duration: 0.35` → `duration: 0.18`
   - Change exit `duration: 0.2` → `duration: 0.12`
   - Change `mode="wait"` → `mode="popLayout"` so incoming page doesn't wait for exit to complete
2. **DoctorDashboard.jsx** — Move the sequential leaderboard profile query (lines 88–91) into the Promise.all block:
   - Add a 9th query to Promise.all: `supabase.from('profiles').select('id, name, speciality, college')` with `.limit(20)` (fetch top profiles upfront)
   - Remove the separate `await supabase.from('profiles').select(...)` after Promise.all
   - Map leaderboard data using the pre-fetched profiles
3. **DoctorDashboard.jsx** — Add stale-while-revalidate pattern:
   - At the top of `load()`, check if the component has cached data from a previous mount (use a module-level `Map` or `sessionStorage`)
   - If cached, render immediately with cached data, then refresh in background
   - Key the cache by `uid`
   - TTL: 2 minutes

**Verification:**
- Click between Dashboard and any other sidebar item rapidly (5+ times).
- Page transitions should feel instant (<200ms perceived).
- No visible blank/white flash between pages.
- Dashboard should show content immediately if revisited within 2 minutes.

---

## ─── P1 — HIGH: Incomplete features affecting core experience ───

### [NA-004] Fix dark mode toggle persistence and system preference sync

**Priority:** P1
**Estimated tokens:** 8,000
**Files to read:**
- `frontend/src/stores/useAppStore.js` — line 16 (darkMode initialization)
- `frontend/src/App.jsx` — lines 248–255 (darkMode effect with data-theme)
- `frontend/tailwind.config.js` — line 7 (darkMode: 'selector' strategy)

**Problem:**
Dark mode toggle reads from `localStorage` on mount but does NOT sync with system preference (`prefers-color-scheme`). If a user visits on a new device, they get light mode even if their OS is set to dark. There is also no listener for system preference changes (e.g., macOS auto dark mode at sunset).

**Instructions:**
1. In `useAppStore.js`, update the `darkMode` initializer (line 16):
   ```
   darkMode: (() => {
     const stored = localStorage.getItem('iconnect_theme');
     if (stored) return stored === 'dark';
     return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
   })(),
   ```
2. In `useAppStore.js`, update `setDarkMode` to persist:
   ```
   setDarkMode: (darkMode) => {
     localStorage.setItem('iconnect_theme', darkMode ? 'dark' : 'light');
     set({ darkMode });
   },
   ```
3. In `App.jsx`, add a `useEffect` that listens for system preference changes:
   ```
   useEffect(() => {
     const mq = window.matchMedia('(prefers-color-scheme: dark)');
     const handler = (e) => {
       if (!localStorage.getItem('iconnect_theme')) {
         setDarkMode(e.matches);
       }
     };
     mq.addEventListener('change', handler);
     return () => mq.removeEventListener('change', handler);
   }, []);
   ```
   This only auto-switches if the user has NOT explicitly set a preference (no localStorage key).
4. In the `App.jsx` darkMode effect (around line 250), ensure `document.documentElement` gets both `data-theme` AND the class `dark` (for Tailwind `selector` strategy):
   ```
   document.documentElement.classList.toggle('dark', darkMode);
   document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
   ```

**Verification:**
- Toggle dark mode on. Refresh page. Confirm dark mode persists.
- Clear localStorage `iconnect_theme` key. Set OS to dark mode. Refresh. Confirm app starts in dark mode.
- Toggle light mode explicitly. Change OS to dark. Confirm app stays light (user override).
- Clear localStorage key again. Wait for OS auto-switch (or manually toggle). Confirm app follows system.

---

### [NA-005] Make GoalRing responsive and sync target to database

**Priority:** P1
**Estimated tokens:** 10,000
**Files to read:**
- `frontend/src/components/dashboard/GoalRing.jsx` — full file (80 lines)
- `frontend/src/components/MyPerformancePage.jsx` — lines 37–80 (duplicate GoalRing component)
- `frontend/src/lib/supabase.js` — search for `user_study_persona` or `weekly_target`

**Problem:**
1. GoalRing uses hardcoded `width={96} height={96}` SVG (line 31) — not responsive on different screen sizes.
2. Target is stored in `localStorage` only (line 17) — lost on device change, never persisted to DB.
3. MyPerformancePage has a DUPLICATE GoalRing function (line 37) that doesn't have the edit capability — they will diverge.

**Instructions:**
1. **GoalRing.jsx** — Make SVG responsive:
   - Replace `width={96} height={96}` with `width="100%" height="100%"` and wrap in a container:
     ```
     <div style={{ width: '100%', maxWidth: 120, aspectRatio: '1' }}>
       <svg viewBox="0 0 96 96" width="100%" height="100%">
     ```
   - Keep the internal SVG coordinate system (viewBox 0 0 96 96) unchanged.
2. **GoalRing.jsx** — Persist target to DB:
   - On save, also upsert to `user_study_persona`:
     ```
     supabase.from('user_study_persona')
       .upsert({ user_id: userId, weekly_target_mins: newMins }, { onConflict: 'user_id' })
     ```
   - On mount, try loading from DB first, fall back to localStorage:
     ```
     useEffect(() => {
       if (!userId) return;
       supabase.from('user_study_persona')
         .select('weekly_target_mins')
         .eq('user_id', userId)
         .maybeSingle()
         .then(({ data }) => {
           if (data?.weekly_target_mins) {
             setTargetMins(data.weekly_target_mins);
             localStorage.setItem(STORAGE_KEY, String(data.weekly_target_mins));
           }
         });
     }, [userId]);
     ```
3. **MyPerformancePage.jsx** — Delete the duplicate `GoalRing` function (lines 37–80) and import from the shared component:
   ```
   import GoalRing from './dashboard/GoalRing';
   ```
   Update the usage to pass `userId` prop.

**Verification:**
- Resize browser window to various widths (320px, 768px, 1440px). GoalRing scales proportionally.
- Edit the weekly target. Refresh page. Confirm target persists.
- Open a private/incognito window, log in as same user. Confirm target matches (loaded from DB).
- Check MyPerformancePage. Confirm it shows the same GoalRing with same target.

---

### [NA-006] Fix 90-day heatmap: cross-page diary sync

**Priority:** P1
**Estimated tokens:** 10,000
**Files to read:**
- `frontend/src/components/dashboard/DayDetailPanel.jsx` — full file
- `frontend/src/components/Activity/DiaryPanel.jsx` — lines 37–127 (diary CRUD)
- `frontend/src/components/DoctorDashboard.jsx` — lines 130–136 (activityByDate computation)
- `frontend/src/components/dashboard/CalendarGoalRow.jsx` — search for `selectedDate`

**Problem:**
Dashboard heatmap builds `activityByDate` from `activity_logs` (lines 130–136 of DoctorDashboard). Diary entries in `calendar_diary` are NOT included in the heatmap. Also, when a user edits a diary in DiaryPanel (Activity page) and switches back to Dashboard, the DayDetailPanel shows stale data — no cross-page sync.

**Instructions:**
1. **DoctorDashboard.jsx** — In the `load()` function, after the Promise.all block, add a query for `calendar_diary`:
   ```
   const { data: diaryEntries } = await supabase.from('calendar_diary')
     .select('date, study_hours')
     .eq('user_id', uid)
     .gte('date', ninetyDaysAgo)
     .order('date');
   ```
   Where `ninetyDaysAgo` = `new Date(Date.now() - 90*86400000).toISOString().split('T')[0]`.
2. Merge diary entries into `activityByDate`:
   ```
   (diaryEntries || []).forEach(d => {
     byDate[d.date] = (byDate[d.date] || 0) + (d.study_hours ? 1 : 0);
   });
   ```
3. **CalendarGoalRow.jsx** — Add a `key` prop or refresh mechanism so that when DayDetailPanel saves diary data, the parent re-fetches:
   - Pass a `refreshDashboard` callback from DoctorDashboard that re-runs `load()`.
   - In DayDetailPanel, after a successful diary save, call `refreshDashboard()`.
   - Alternatively, use a `refreshKey` state in DoctorDashboard that increments on diary save, passed down to CalendarGoalRow.
4. This is sufficient — full Supabase Realtime subscription is unnecessary for this use case (diary edits are infrequent, same-user only).

**Verification:**
- Go to Activity → Diary → write a note for today.
- Navigate to Dashboard. Check heatmap for today — should show activity dot.
- Click today on the calendar → DayDetailPanel should show the diary note just written.
- Edit the diary from DayDetailPanel. Close. Reopen. Confirm edit persists.

---

### [NA-007] Build unified Notes system with user_notes UI

**Priority:** P1
**Estimated tokens:** 15,000
**Files to read:**
- `frontend/src/components/SmartNotesPanel.jsx` — full file (319 lines)
- `frontend/src/lib/supabase.js` — lines 473–499 (getNotes, saveNote, deleteNote for user_notes)
- `frontend/src/components/EBooksPage.jsx` — search for `SmartNotesPanel` to find where it's triggered

**Problem:**
Two separate note systems exist with NO unified UI:
1. `smart_notes` table — AI-generated notes, rendered in SmartNotesPanel (hidden behind a PDF toolbar button)
2. `user_notes` table — manual notes, has full CRUD in supabase.js (lines 473–499) but NO component renders them
The user cannot see their manual notes anywhere. SmartNotesPanel only shows AI notes. There is no notes page or section.

**Instructions:**
1. **Create** `frontend/src/components/NotesPage.jsx` — a new top-level page:
   - Two-tab layout: "My Notes" (user_notes) | "AI Notes" (smart_notes)
   - My Notes tab:
     - List view with search/filter
     - Each note shows: content preview, artifact title (join artifacts.title), created_at
     - Click to expand full note
     - "New Note" button opens inline editor (textarea + artifact selector dropdown)
     - Delete button with confirmation
     - Use `getNotes`, `saveNote`, `deleteNote` from supabase.js
   - AI Notes tab:
     - Reuse the listing logic from SmartNotesPanel (fetch from smart_notes)
     - Show: note content, mnemonic, tags, linked artifact
   - Both tabs:
     - Sort by date (newest first)
     - Search filter across content
     - Empty state with helpful message
2. **App.jsx** — Add a `case 'notes':` in `renderPage()` that renders NotesPage.
3. **Sidebar.jsx** — Add a "Notes" nav item with the `StickyNote` icon from lucide-react, between existing items (after "My Performance" or similar).
4. Do NOT modify SmartNotesPanel — it continues to work as a quick-access panel from the PDF reader.

**Verification:**
- Click "Notes" in the sidebar. Page loads with two tabs.
- "My Notes" tab: click "New Note" → type content → save → note appears in list.
- Search for a keyword in the note → filters correctly.
- Delete a note → confirm dialog → note removed.
- "AI Notes" tab: if user has AI-generated notes, they display. If none, empty state shows.
- Build succeeds with zero errors.

---

## ─── P2 — MEDIUM: Quality-of-life improvements ─────────────────

### [NA-008] Enhance MyPerformancePage with trends and percentiles

**Priority:** P2
**Estimated tokens:** 14,000
**Files to read:**
- `frontend/src/components/MyPerformancePage.jsx` — full file (521 lines)
- `frontend/src/components/DoctorDashboard.jsx` — lines 56–71 (reference for parallel query pattern)

**Problem:**
MyPerformancePage shows raw counts only (total quizzes taken, total study hours, etc.). No trends over time, no percentile comparisons vs other users, no velocity tracking, no visual charts. The page feels like a data dump rather than an analytics dashboard.

**Instructions:**
1. Add a "Trends" section below existing stats:
   - Query `activity_logs` grouped by week (last 12 weeks):
     ```
     SELECT date_trunc('week', created_at) as week,
            count(*) as activities,
            sum(duration_minutes) as total_mins
     FROM activity_logs WHERE user_id = $1
     GROUP BY week ORDER BY week
     ```
     Use Supabase `.rpc()` or client-side grouping from the existing 2000-row log fetch.
   - Render as a simple bar chart using inline SVG (no external charting library needed):
     - X-axis: week labels
     - Y-axis: study hours per week
     - Color: indigo gradient
   - Show week-over-week change as percentage badge (↑12% or ↓5%).

2. Add a "Your Percentile" section:
   - Query `user_scores` for all users: `supabase.from('user_scores').select('total_score')`
   - Compute percentile: `(count of users with lower score / total users) * 100`
   - Display as: "You're in the top X% of learners" with a horizontal bar
   - Do NOT expose other users' data — only the aggregate percentile.

3. Add "Study Velocity" metric:
   - Hours studied this week vs last week
   - Articles read this week vs last week
   - Display with arrow indicators (↑/↓) and color (green/red)

4. Remove the duplicate GoalRing function if not already done in NA-005.

**Verification:**
- Navigate to My Performance page.
- Trends chart shows 12 weeks of data (or however many weeks the user has been active).
- Percentile shows a realistic value (not 0% or 100% for all users).
- Velocity indicators show correct comparison (manually verify with raw data in Supabase Studio).
- Build succeeds.

---

### [NA-009] Optimize initial app load: reduce query cascade

**Priority:** P2
**Estimated tokens:** 10,000
**Files to read:**
- `frontend/src/App.jsx` — lines 162–231 (loadProfile function with all mount queries)
- `frontend/src/components/DoctorDashboard.jsx` — lines 48–71 (dashboard mount queries)
- `frontend/src/lib/supabase.js` — lines 1–30 (supabase client init)

**Problem:**
App.jsx fires 5 queries on mount (profile, notification, users, artifacts, daily_login tracking). Then when Dashboard mounts, it fires 9 MORE queries. Total: 14 queries in the critical path before the user sees the dashboard. Each query is a separate HTTP request to Supabase.

**Instructions:**
1. **App.jsx `loadProfile`** — Combine the `fetchNotifs` and `fetchUsers` calls into the profile load flow:
   - After `setPage('dashboard')` (line 216), fire notifs + users + artifacts in a single Promise.all:
     ```
     Promise.all([
       fetchNotifs(uid),
       fetchUsers(),
       fetchArtifacts(r).then(data => { if (data?.length) setArtifacts(data); }).catch(() => {}),
     ]);
     ```
   - This is already partially done but `fetchArtifacts` is in a separate try/catch block (lines 224–227). Move it into the Promise.all.

2. **DoctorDashboard.jsx** — Avoid re-fetching data already loaded by App.jsx:
   - `artifacts` is already in `useAppStore` (set by App.jsx line 226). Read it from the store instead of re-querying.
   - Remove the `supabase.from('artifacts')` query from the Promise.all (line 65–66).
   - Replace with: `const arts = useAppStore.getState().artifacts;` before the Promise.all, or receive it as a prop.

3. **DoctorDashboard.jsx** — The `supabase.auth.getUser()` call (line 50) is redundant — App.jsx already has the userId. Pass `userId` as a prop to DoctorDashboard instead of re-querying auth.

4. Net result: 14 queries → ~10 queries on initial load.

**Verification:**
- Open DevTools → Network tab. Filter by "rest" or "supabase".
- Count the number of requests on initial login to dashboard.
- Should be ≤10 requests (down from 14).
- Dashboard loads with the same data as before — no visual regression.
- Build succeeds.

---

### [NA-010] Add error boundaries to lazy-loaded pages

**Priority:** P2
**Estimated tokens:** 6,000
**Files to read:**
- `frontend/src/App.jsx` — lines 1–40 (lazy imports), lines 440–500 (renderPage switch)
- `frontend/src/components/ui/` — list directory for existing error components

**Problem:**
All pages are loaded via `React.lazy()`. If a chunk fails to download (network error, deploy during active session), the entire app crashes with an unhandled Suspense rejection. There is no error boundary wrapping the lazy components.

**Instructions:**
1. **Create** `frontend/src/components/ui/LazyErrorBoundary.jsx`:
   ```jsx
   import { Component } from 'react';

   export default class LazyErrorBoundary extends Component {
     state = { hasError: false, error: null };

     static getDerivedStateFromError(error) {
       return { hasError: true, error };
     }

     handleRetry = () => {
       this.setState({ hasError: false, error: null });
     };

     render() {
       if (this.state.hasError) {
         return (
           <div style={{ padding: 40, textAlign: 'center' }}>
             <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
             <h3 style={{ marginBottom: 8, color: '#111827' }}>Page failed to load</h3>
             <p style={{ color: '#6B7280', marginBottom: 16 }}>This usually means a network issue. Try again.</p>
             <button
               onClick={() => window.location.reload()}
               style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}
             >
               Reload Page
             </button>
           </div>
         );
       }
       return this.props.children;
     }
   }
   ```
2. **App.jsx** — Wrap the `<PageTransition>` content in `renderPage()` with `<LazyErrorBoundary>`:
   ```jsx
   <LazyErrorBoundary>
     <Suspense fallback={<PageLoader />}>
       {renderPage()}
     </Suspense>
   </LazyErrorBoundary>
   ```
3. Import `LazyErrorBoundary` at the top of App.jsx (not lazy — it must be in the main bundle).

**Verification:**
- Open DevTools → Network → Block a chunk URL pattern.
- Navigate to a lazy-loaded page. Confirm error boundary shows "Page failed to load" with reload button.
- Click reload. Confirm app recovers.
- Build succeeds.

---

## ─── P3 — LOW: Polish and edge cases ────────────────────────────

### [NA-011] Fix weekActivity granularity loss in heatmap

**Priority:** P3
**Estimated tokens:** 5,000
**Files to read:**
- `frontend/src/components/DoctorDashboard.jsx` — lines 120–128 (weekActivity computation)

**Problem:**
Line 126 caps each day's value at 1.0: `weekDays[dow] = Math.min(1, weekDays[dow] + 0.4)`. After just 3 activities in a day, the value is 1.0 and all further activity is lost. A day with 3 activities looks identical to a day with 30 activities.

**Instructions:**
1. Remove the `Math.min(1, ...)` cap. Let values accumulate naturally: `weekDays[dow] += 1;` (count activities, not arbitrary 0.4 increments).
2. In the weekly activity mini-chart rendering, normalize relative to the max value in the week:
   ```
   const maxDayActivity = Math.max(...weekActivity, 1);
   // For each bar height: (dayValue / maxDayActivity) * maxBarHeight
   ```
3. This gives relative proportions — a day with 10 activities shows a taller bar than a day with 2, even if both are > 3.

**Verification:**
- Check a user with varied daily activity (some days 1–2, some 5+).
- Weekly activity bars should show different heights proportional to activity count.
- No bar should clip or overflow its container.

---

### [NA-012] Add empty state for weekly training section

**Priority:** P3
**Estimated tokens:** 5,000
**Files to read:**
- `frontend/src/components/DoctorDashboard.jsx` — search for `activePlan` or `study_plan` rendering
- `frontend/src/components/dashboard/` — list directory, look for any StudyPlan or WeeklyTraining component

**Problem:**
The user reported "weekly training section is empty." When no active study plan exists (`activePlan` is null), the section either shows nothing or shows a broken placeholder. Users need a clear empty state with a CTA to create a study plan.

**Instructions:**
1. Find where `activePlan` is rendered in the dashboard (likely in a card or section).
2. When `activePlan === null`, render an empty state:
   ```jsx
   <div style={{ textAlign: 'center', padding: '24px 16px' }}>
     <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
     <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>
       No active study plan
     </div>
     <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
       Create a personalised study plan to track your weekly progress
     </div>
     <button
       onClick={() => setPage('study-plan')}
       style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
     >
       Create Study Plan
     </button>
   </div>
   ```
3. Verify the `'study-plan'` page key exists in the sidebar / renderPage switch. If not, use whatever the correct key is for the study plan creation page, or use `'learn'` as a fallback.

**Verification:**
- Log in as a user with no active study plan.
- Dashboard shows "No active study plan" card with CTA button.
- Clicking the button navigates to the study plan creation page.
- Log in as a user WITH an active plan — the normal plan view renders.

---

### [NA-013] Fix PageTransition animation mode for faster perceived navigation

**Priority:** P3
**Estimated tokens:** 4,000
**Files to read:**
- `frontend/src/components/ui/PageTransition.jsx` — full file (24 lines)

**Problem:**
(Detailed fix already partially covered in NA-003, but this task handles the animation physics refinement separately if NA-003 was scoped to the query optimization only.)

`AnimatePresence mode="wait"` blocks the incoming page until the outgoing page fully exits. With 200ms exit + 350ms entrance, users perceive 550ms of "nothing happening." Modern apps use crossfade or popLayout for snappier feel.

**Instructions:**
1. Change `mode="wait"` to `mode="popLayout"`.
2. Update variants:
   ```
   const pageVariants = {
     initial: { opacity: 0, y: 6 },
     animate: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
     exit: { opacity: 0, transition: { duration: 0.1, ease: 'easeIn' } },
   };
   ```
3. These shorter durations (150ms in, 100ms out) with `popLayout` give a near-instant feel while maintaining smoothness.

**Verification:**
- Click rapidly between sidebar items.
- Transitions should feel near-instant (no visible "blank frame").
- No layout jump or flash of unstyled content.

---

## ─── HIDDEN SYSTEMIC ISSUES (Extrapolated) ──────────────────────

### [NA-014] Supabase client re-queries auth on every page component mount

**Priority:** P2
**Estimated tokens:** 8,000
**Files to read:**
- `frontend/src/components/DoctorDashboard.jsx` — line 50 (`supabase.auth.getUser()`)
- `frontend/src/components/MyPerformancePage.jsx` — search for `auth.getUser` or `auth.getSession`
- `frontend/src/components/SmartNotesPanel.jsx` — line 25 (`supabase.auth.getUser()`)
- `frontend/src/contexts/AuthContext.jsx` — full file

**Problem:**
Multiple components independently call `supabase.auth.getUser()` to get the user ID, instead of using the centralized `useAuth()` hook from AuthContext. This violates the CLAUDE.md hard rule: "Auth state comes ONLY from AuthContext.jsx via useAuth() hook." Each call is a network request to Supabase's auth endpoint.

**Instructions:**
1. Search the entire `frontend/src/components/` directory for `supabase.auth.getUser` and `supabase.auth.getSession` calls.
2. For each occurrence:
   - If the component is inside the auth-guarded tree (rendered only when logged in), replace with `const { user } = useAuth();` and use `user.id`.
   - If the component needs to be defensive, use `const { user } = useAuth(); if (!user) return;`
3. Remove the direct supabase auth imports from those components.
4. Key files to fix (based on audit): DoctorDashboard.jsx (line 50), SmartNotesPanel.jsx (line 25), and likely others.

**Verification:**
- `grep -r "supabase.auth.getUser\|supabase.auth.getSession" frontend/src/components/` returns zero matches.
- App functions identically — all pages still load correctly.
- Network tab shows fewer auth-related requests on page navigation.

---

### [NA-015] Missing loading/error states in multiple components

**Priority:** P2
**Estimated tokens:** 8,000
**Files to read:**
- `frontend/src/components/dashboard/DayDetailPanel.jsx` — line 55 (empty catch block)
- `frontend/src/components/DoctorDashboard.jsx` — lines 185–186 (catch only console.warn)
- `frontend/src/components/dashboard/WebinarLeaderboardRow.jsx` — search for catch blocks

**Problem:**
CLAUDE.md hard rule: "All async operations in components MUST have loading + error states." Multiple components have empty catch blocks (`catch (_) {}`) that silently swallow errors, leaving users with no feedback when queries fail.

**Instructions:**
1. **DayDetailPanel.jsx** — line 55: Replace `catch (_) {}` with:
   ```
   catch (err) {
     console.warn('[DayDetailPanel] load failed:', err.message);
     setError('Could not load day details. Please try again.');
   }
   ```
   Add `const [error, setError] = useState(null);` state. Render error state in the UI.

2. **DoctorDashboard.jsx** — line 185: The `catch` already has `console.warn` but no user-visible error. Add:
   ```
   setDashError('Dashboard data failed to load.');
   ```
   Add `const [dashError, setDashError] = useState(null);` and render an error banner at the top of the dashboard.

3. Search for other `catch (_) {}` or `catch (_e) {}` patterns in `frontend/src/components/` and add error handling to each. Focus on user-facing components (not utility functions).

4. For each error state, render a retry button:
   ```
   <button onClick={() => { setError(null); load(); }}>Retry</button>
   ```

**Verification:**
- Temporarily block Supabase API requests in DevTools.
- Load the dashboard → should show error banner with retry button, not a blank page.
- Open DayDetailPanel → should show error message, not silent empty view.
- Unblock requests. Click Retry. Content loads.

---

### [NA-016] ForYou AI suggestions lack response caching deduplication

**Priority:** P3
**Estimated tokens:** 6,000
**Files to read:**
- `frontend/src/components/DoctorDashboard.jsx` — lines 162–183 (ForYou cache logic)
- `frontend/src/lib/aiService.js` — lines 377–422 (getPersonalizedSuggestions)

**Problem:**
The ForYou widget caches AI responses for 10 minutes (line 180), but the cache key is just `forYou_${uid}` with no consideration of the input data. If user data changes (new quiz completed, more articles read), the stale cached response is served for 10 minutes. Also, the AI prompt has no randomization seed, so repeated calls with the same data may return identical suggestions, making "refresh" feel broken.

**Instructions:**
1. Add a timestamp or hash component to the cache key so cache is invalidated when input data changes:
   ```
   const cacheKey = `forYou_${uid}_${booksRead}_${totalScore}`;
   ```
   This ensures the cache is naturally invalidated when user stats change.
2. In `aiService.js`, add a randomization instruction to the AI prompt (line 381 area):
   ```
   Add to system prompt: "Vary your suggestions each time — do not repeat the same 3 recommendations if called multiple times with the same data. Include an element of exploration."
   ```
3. Reduce cache TTL from 10 minutes to 5 minutes (line 180): `setCached(forYouCacheKey, items, 5 * 60 * 1000);`

**Verification:**
- Complete a quiz. Return to dashboard. ForYou suggestions should reference the new quiz data.
- Click refresh twice. The two sets of suggestions should differ.
- Wait 5 minutes. Return to dashboard. Suggestions should re-fetch (not use stale cache).

---

### [NA-017] Inline styles throughout dashboard components — extract to Tailwind

**Priority:** P3
**Estimated tokens:** 12,000
**Files to read:**
- `frontend/src/components/dashboard/DayDetailPanel.jsx` — full file (extensive inline styles)
- `frontend/src/components/dashboard/GoalRing.jsx` — full file (inline styles)
- `frontend/src/components/dashboard/ForYouWidget.jsx` — full file (inline styles)
- `frontend/src/styles/tokens.js` — design tokens reference

**Problem:**
DayDetailPanel, GoalRing, ForYouWidget, and several other dashboard components use extensive inline `style={{}}` objects rather than Tailwind classes or design tokens. This makes dark mode support difficult (inline styles don't respond to `dark:` variants), increases bundle size with repeated style objects, and violates the design system principle.

**Instructions:**
1. For each component, convert inline `style={{}}` to Tailwind utility classes:
   - `style={{ display: 'flex', alignItems: 'center', gap: 10 }}` → `className="flex items-center gap-2.5"`
   - `style={{ fontSize: 13, color: '#78350F' }}` → `className="text-sm text-amber-900"`
   - `style={{ background: '#fff', borderRadius: 20 }}` → `className="bg-white rounded-2xl dark:bg-gray-800"`
2. For colors, use design tokens where they map:
   - Check `tokens.js` for brand colors, status colors, and background colors.
   - Replace hardcoded hex values with token-based Tailwind classes.
3. Add `dark:` variants to all converted classes:
   - `bg-white` → `bg-white dark:bg-gray-800`
   - `text-gray-900` → `text-gray-900 dark:text-gray-100`
   - `border-gray-200` → `border-gray-200 dark:border-gray-700`
4. Priority order: DayDetailPanel first (most user-facing), then GoalRing, then ForYouWidget.

**Verification:**
- Toggle dark mode. DayDetailPanel, GoalRing, ForYouWidget all render correctly with dark backgrounds and light text.
- No inline `style={{}}` remains in the converted components (except for dynamic values like SVG stroke offsets).
- Visual appearance in light mode is identical to before the conversion.
- Build succeeds.

---

### [NA-018] Activity page diary and dashboard diary use different data models

**Priority:** P3
**Estimated tokens:** 6,000
**Files to read:**
- `frontend/src/components/Activity/DiaryPanel.jsx` — full file (check what table it writes to)
- `frontend/src/components/dashboard/DayDetailPanel.jsx` — full file (check what table it reads from)
- Run: `grep -r "calendar_diary\|diary" frontend/src/components/ --include="*.jsx" -l`

**Problem:**
DiaryPanel (Activity page) and DayDetailPanel (Dashboard) both operate on `calendar_diary` table, but they may use different column subsets or have subtle inconsistencies in how they read/write. If NA-002 adds editing to DayDetailPanel, both components need to be aligned on the exact same data contract.

**Instructions:**
1. Audit both components' column usage:
   - DiaryPanel: which columns does it SELECT, INSERT, UPDATE?
   - DayDetailPanel: which columns does it SELECT?
2. Ensure both components use the same column set: `personal_notes`, `study_hours`, `goals_met`, `date`, `user_id`.
3. If DiaryPanel uses additional columns (e.g., `mood`, `reflection`), make DayDetailPanel display those too.
4. Extract the shared diary query/upsert logic into `supabase.js`:
   ```
   export const getDiaryEntry = async (userId, date) => { ... };
   export const upsertDiaryEntry = async (userId, date, data) => { ... };
   ```
5. Update both DiaryPanel and DayDetailPanel to use the shared functions.

**Verification:**
- Write a diary entry from DiaryPanel (Activity page). Navigate to Dashboard → click same date → DayDetailPanel shows the exact same data.
- Edit from DayDetailPanel. Navigate to Activity → DiaryPanel → same date. Data matches.
- No direct `supabase.from('calendar_diary')` calls remain in either component.

---

## ─── COMPLETION CHECKLIST ───────────────────────────────────────

After all tasks:
- [x] `npm run build` — zero errors, zero warnings ✅ 2026-03-25
- [x] All 18 NA tasks verified ✅ 2026-03-25
- [x] NA-019 and NA-020 implemented ✅ 2026-03-25
- [ ] Update `.agent/handoff.md` with:
  - All files changed
  - Current state (working/broken)
  - Any new decisions made
  - Any remaining items for next session
- [ ] Commit with message: `fix: production action items NA-001 through NA-018`

---

### [NA-019] Sidebar Navigation Latency ✅ DONE 2026-03-25

**Problem:** Navigating to a lazy-loaded page replaces the current page content with a full-page spinner (Suspense fallback), causing jarring latency UX.

**Fix:** Added `useTransition` from React 18 to `NavItem` in `Sidebar.jsx`. Navigation is now wrapped in `startTransition(() => setPage(item.k))`. React suppresses the Suspense fallback during a transition — the current page stays visible while the next page's lazy bundle loads, then switches atomically. A subtle dot indicator on the nav item shows pending state.

**Files changed:** `frontend/src/components/Sidebar.jsx`

---

### [NA-020] Theme Toggle State Synchronization ✅ DONE 2026-03-25

**Problem:** Two bugs:
1. **FOUC** (Flash of Unstyled Content): `darkMode` HTML class was only applied in a `useEffect` in `App.jsx` — after React renders, causing a visible flash of light mode for dark-mode users.
2. **Function updater bug**: `TopBar.jsx` called `setDarkMode(d => !d)` passing a function. The Zustand `setDarkMode` action doesn't support updater functions — the function value is truthy, so it always wrote `'dark'` to localStorage and set `darkMode` to a function reference.

**Fix:**
1. `useAppStore.js` init: Apply `classList.toggle('dark', isDark)` and `setAttribute('data-theme', ...)` synchronously during store initialization (before React renders) — eliminates FOUC.
2. `useAppStore.js` `setDarkMode`: Also apply HTML class synchronously — the `useEffect` in App.jsx is now redundant but harmless.
3. `TopBar.jsx`: Changed `setDarkMode(d => !d)` → `setDarkMode(!darkMode)` — passes the concrete boolean value.

**Files changed:** `frontend/src/stores/useAppStore.js`, `frontend/src/components/TopBar.jsx`

---

### [NA-021] Fix "For You" Refresh Redundancy ✅ DONE 2026-03-25

**Priority:** P2
**Files changed:** `frontend/src/components/DoctorDashboard.jsx`

**Problem:** `refreshForYou` callback made a direct `supabase.from('profiles').select('speciality')` call inside the component — violating CLAUDE.md rule ("NEVER write raw supabase.from() calls inside components"). The speciality was already available in `mySpeciality` state from the initial `load()` fetch.

**Fix:** Removed the redundant profile fetch. `refreshForYou` now uses `mySpeciality` from state directly. `dashDataRef.current` already contains all other data (booksRead, quizScore, totalScore, weeklyMins, lastActive, recentSubjects) persisted by `load()`.

---

### [NA-023] Fix Weekly Learning Target Widget Sizing ✅ DONE 2026-03-25

**Priority:** P2
**Files changed:** `frontend/src/components/dashboard/GoalRing.jsx`, `frontend/src/components/dashboard/CalendarGoalRow.jsx`

**Problem:**
1. `GoalRing.jsx` had `style={{ maxWidth: 120 }}` inline style left from NA-017 Tailwind conversion — 120px had no exact Tailwind 3 scale equivalent, making the ring too small in its card.
2. `CalendarGoalRow.jsx` used inline `style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}` and card flex inline styles.

**Fix:**
1. `GoalRing.jsx`: Changed `style={{ maxWidth: 120 }}` → `className="max-w-44"` (11rem / 176px — standard Tailwind scale, better proportioned in card, no inline style).
2. `CalendarGoalRow.jsx`: Converted grid container to `className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5"`. Converted GoalRing card flex layout to `className="card flex flex-col items-center justify-center"`. Kept `style={{ margin: 0 }}` on both cards (`.card` CSS class adds margin that needs overriding).

---

---

### [NA-022] Dashboard Activity Calendar Drill-Down ✅ DONE 2026-03-25

**Priority:** P1
**Files changed:**
- `frontend/src/components/JournalModal.jsx` — NEW unified diary component
- `frontend/src/components/dashboard/CalendarGoalRow.jsx` — uses JournalModal (mode="modal")
- `frontend/src/lib/supabase.js` — added getActivityLogsForDay, getContentProgressForDay
- `frontend/src/stores/useAppStore.js` — added diaryCache, setDiaryCache

**Problem:** Dashboard calendar dates opened DayDetailPanel (read-only) with no mood selector, no auto-save, and inconsistent UI compared to the Activity page DiaryPanel.

**Fix:**
Built `JournalModal.jsx` — a single reusable component that unifies DayDetailPanel and DiaryPanel. Supports two modes:
- `mode="modal"` — centered overlay (Dashboard calendar), max-w 480px
- `mode="panel"` — slide-in from right (Activity heatmap), max-w 420px

Features in both modes: mood picker (5 emoji moods), debounced auto-save notes (1s), study hours input, goals-met toggle, activity log from activity_logs, content progress from user_content_state. All Supabase queries go through supabase.js helpers. On save, writes to Zustand `diaryCache` for cross-page sync.

`CalendarGoalRow.jsx` now uses `JournalModal` with `mode="modal"`. On save, calls `refreshDashboard()` to re-fetch and merge updated diary entries into the heatmap.

---

### [NA-024] 90-Day Activity Heatmap Editability & Synchronization ✅ DONE 2026-03-25

**Priority:** P1
**Files changed:**
- `frontend/src/components/ActivityPage.jsx` — uses JournalModal (mode="panel"), subscribes to diaryCache
- `frontend/src/components/DoctorDashboard.jsx` — subscribes to diaryCache for cross-page heatmap updates
- `frontend/src/stores/useAppStore.js` — diaryCache, setDiaryCache (shared with NA-022)

**Problem:** Activity page heatmap (ActivityHeatmapClickable) was using DiaryPanel — a custom slide-in component missing the activity log and content progress sections. No cross-page sync between Dashboard and Activity calendars.

**Fix:**
1. `ActivityPage.jsx` now uses `JournalModal` with `mode="panel"` — same rich UI as Dashboard modal. `onSave` handler adds the saved date to `diaryDates` (updates the heatmap purple dot immediately).
2. Cross-page sync via Zustand:
   - `useAppStore.diaryCache` holds `{ [date]: payload }` written on every JournalModal save
   - `ActivityPage` has a `useEffect` on `diaryCache` that merges any new dates into its local `diaryDates` Set — picks up diary saves made on the Dashboard without a re-fetch
   - `DoctorDashboard` has a `useEffect` on `diaryCache` that merges diary dates with `study_hours > 0` into its local `activityByDate` map — picks up saves made on Activity page
3. On re-mount (page navigation), both pages re-fetch from DB — guaranteed fresh data.

---

### [NA-025] Weekly Progress Analytics ✅ DONE 2026-03-25

**Files changed:**
- `frontend/src/components/ActivityPage.jsx` — analytics imports + wowInsight/peakTime state + computation in loadAll() + WoW badge in Weekly Progress card header + peak focus time row
- `frontend/src/lib/analytics.js` — NEW pure analytics utility (movingAverage, wowVariance, momVariance, weeklyBuckets, peakFocusTime, trendColor, trendArrow, trendBadge)

**Fix:** Injected WoW activity count badge (↑/↓ %) into the Weekly Progress card header. Added peak focus time row below the total-this-week summary. All computation via pure `analytics.js` functions — no new DB queries.

---

### [NA-026] My Performance Analytics Insights ✅ DONE 2026-03-25

**Files changed:**
- `frontend/src/components/MyPerformancePage.jsx` — analytics imports + 5 new insight state vars + weeklyBuckets replaces manual 4-week build + wowVariance/momVariance/peakFocusTime/movingAverage computation + 4-week trend card now shows trendBadge() % instead of raw delta + new "Analytics Insights" section (WoW count, WoW study time, MoM count, peak focus time cards)
- `frontend/src/lib/analytics.js` — shared with NA-025

**Fix:** 4-week trend bars now show percentage variance (↑ 23% / ↓ 10% / —) via `trendBadge(wowVariance(count, prev))` with `trendColor()` inline styles. New Analytics Insights card below the trend chart shows WoW activity %, WoW study time %, MoM activity %, and peak focus time (label + % of activity).

---

### [NA-027] Centralized Notes Architecture (Hidden Release) ✅ DONE 2026-03-25

**Files changed:**
- `frontend/src/lib/supabase/notes.js` — NEW domain-specific DB module: `getUserNotesHierarchy`, `getSmartNotesHierarchy`, `getUserNoteById`, `createNote`, `updateNote`, `deleteNote`, `toggleSmartNoteStar`, `deleteSmartNote`, `buildHierarchy`
- `frontend/src/pages/Notes.jsx` — NEW hierarchical notes page (Subject → Book → Note), URL deep-link params (`?tab`, `?subject`, `?book`, `?id`), inline note editing, new note composer, search at book level, AI note starring
- `frontend/src/App.jsx` — lazy import updated from `./components/NotesPage` to `./pages/Notes`
- `frontend/src/components/Sidebar.jsx` — removed `{ k: 'notes', l: 'My Notes' }` from `drMore` nav array; removed `StickyNote` import; removed `notes: StickyNote` from iconMap (hidden release — zero visible nav links)

**Architecture:**
- `lib/supabase/notes.js` is a domain-scoped DB module following the same pattern as the main `supabase.js` (try/catch, named exports, no raw calls in components)
- `buildHierarchy()` is a pure utility that groups flat notes into Subject → Book → [notes] tree
- Deep-links work via React Router search params on the `/notes` path; `syncFromLocation` only watches pathname so params are free for the component to own
- Route is accessible via `setPage('notes')` (programmatic) or direct URL `/notes?...`; no sidebar/topbar entry

### [NA-029] Fix Activity Page UI Redundancy & KPI Aggregation ✅ DONE 2026-03-25

**Files changed:**
- `frontend/src/components/ActivityPage.jsx`

**Fixes:**
1. Removed duplicate `.ph` "My Activity" header block — page title already shown in TopBar
2. Added `activeDays`, `booksRead`, `quizzesDone` as proper state variables (set from fresh fetch, not derived at render-time from cached `activityByDate`, eliminating stale-cache drift)
3. Expanded `logsRes` select to include `activity_type, reference_id` (was only `created_at, duration_minutes`)
4. **Active Days**: computed from `Object.keys(map).length` — unique ISO date strings only, consistent with heatmap
5. **Books Read**: `new Set(logs90.filter(article_read && reference_id).map(reference_id)).size` — distinct artifact IDs, not row count
6. **Quizzes**: `new Set(logs90.filter(quiz* && reference_id).map(reference_id)).size` — distinct artifact IDs, not row count
7. KPI cards now render `0` instead of `'—'` for zero values; Streak renders `0` instead of `'—'` when no streak
8. Updated cache write and restore to include `activeDays`, `booksRead`, `quizzesDone`
9. Removed dead derived-at-render lines: `const activeDays = ...`, `const booksRead = ...`, `const quizzesDone = ...`

---

### [NA-030] 90-Day Heatmap UI Polish & Alignment ✅ DONE 2026-03-25

**Files changed:**
- `frontend/src/components/Activity/ActivityHeatmapClickable.jsx`

**Fixes:**
1. **Dead space**: Wrapped all heatmap content in `display: inline-block` inside `textAlign: center` outer div — heatmap now horizontally centers within the card instead of left-aligning in a wide container
2. **Diary dots**: Centered in cell (`top: 50%, left: 50%, transform: translate(-50%,-50%)`) instead of pinned to bottom-right corner; enlarged from 4×4px to 6×6px; added `boxShadow: 0 0 0 1px #4338CA` for visibility on both light and dark cell backgrounds; `border: 1.5px solid #fff` for white separation ring
3. Legend diary dot also updated to include `border: 1.5px solid #4338CA` for consistency

*Generated by Opus — 2026-03-25*
*Total estimated tokens across all tasks: ~165,000*
*Recommended execution: 12–14 sessions at 12K–15K tokens each*
