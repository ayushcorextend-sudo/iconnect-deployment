# iConnect Surgery Log

## Format
| Date | Bug ID | File Changed | What Changed | Blast Radius | Verification |
|------|--------|-------------|-------------|-------------|-------------|

## Reconnaissance
*Captured: 2026-03-28 — Phase 0, Step 0.6*

---

### 1. Direct Supabase Calls (BUG-G)

**Count:** 160 occurrences of `supabase.from(` across **52 files**

Files with direct `supabase.from()` calls (all are future migration targets for dbService.js):

**Components (46 files):**
- src/App.jsx
- src/components/EBooksPage.jsx
- src/components/ReadingQuizModal.jsx
- src/components/ConferencesPage.jsx
- src/components/SADashboard.jsx
- src/components/SuperAdminApprovals.jsx
- src/components/Activity/DiaryPanel.jsx
- src/components/MCIVerificationQueue.jsx
- src/components/StudyPlan/WeeklyPlanner.jsx
- src/components/StudyPlan/SpacedRepetition.jsx
- src/components/StudyPlan/ClinicalLogger.jsx
- src/components/superadmin/UserManagement.jsx
- src/components/quiz/QuizBuilder.jsx
- src/components/quiz/QuizPlayer.jsx
- src/components/SmartNotesPanel.jsx
- src/components/MyPerformancePage.jsx
- src/components/content/DoubtBoard.jsx
- src/components/content/FlashcardMaker.jsx
- src/components/content/LearnHub.jsx
- src/components/content/FlashcardPlayer.jsx
- src/components/content/VideoManager.jsx
- src/components/DoctorDashboard.jsx
- src/components/ExamPage.jsx
- src/components/SettingsPage.jsx
- src/components/dashboard/GoalRing.jsx
- src/components/dashboard/DayDetailPanel.jsx
- src/components/dashboard/WebinarLeaderboardRow.jsx
- src/components/ActivityPage.jsx
- src/components/sadashboard/WebinarCalendarTab.jsx
- src/components/sadashboard/ArtifactsTab.jsx
- src/components/sadashboard/ManageAdminsTab.jsx
- src/components/LeaderboardPage.jsx
- src/components/Exam/ExamManager.jsx
- src/components/Exam/QuestionEditor.jsx
- src/components/arena/LiveArenaStudent.jsx
- src/components/arena/LiveArenaHost.jsx
- src/components/arena/KahootScheduler.jsx
- src/components/NotificationsPage.jsx
- src/components/broadcast/ContentAdminNotificationCenter.jsx
- src/components/broadcast/DoctorEngageView.jsx
- src/components/broadcast/EngageLanding.jsx
- src/components/broadcast/ContentAdminEngageView.jsx
- src/components/broadcast/SAMessageBox.jsx
- src/components/UsersPage.jsx
- src/components/ReportsPage.jsx
- src/components/ProfilePage.jsx

**Lib files (6 files):**
- src/lib/idempotency.js
- src/lib/trackActivity.js
- src/lib/supabase.js *(expected — this is the intended location)*
- src/lib/supabase/notes.js
- src/lib/sendNotification.js
- src/lib/dataCache.js
- src/lib/auditLog.js

**Severity:** CRITICAL — 160 call sites with no central error handling, no AbortController, no case transformation.

---

### 2. Hardcoded Hex Colors (BUG-W Theme Fracturing)

**Count:** 1,591 occurrences of hardcoded hex colors across src/

**Severity:** HIGH — Explains dark mode breakage. Every hardcoded color bypasses the theme system.

---

### 3. Catch Blocks (Empty/Silent)

**Notable silent catch blocks still present:**
- `src/components/SADashboard.jsx:168` — `catch (_)` with no logging
- `src/components/chatbot/chatbotConstants.js:32` — `catch (_)`
- `src/components/chatbot/chatbotConstants.jsx:31` — `catch (_)` *(duplicate file!)*
- `src/components/OnboardingBanner.jsx:13` — `catch (_) { return {} }` silent swallow
- `src/components/StudyPlan/ClinicalLogger.jsx:66` — `catch (_)`
- `src/components/ReadingQuizModal.jsx:74` — `.catch(() => {})` silent swallow
- `src/components/ConferencesPage.jsx:27` — `.catch(() => {})` silent swallow
- `src/components/MCIVerificationQueue.jsx:35` — `.catch(() => {})` silent swallow

**Also noted:** `chatbotConstants.js` and `chatbotConstants.jsx` BOTH exist — duplicate file (one is .js, one is .jsx) — needs investigation.

**Severity:** HIGH — Silent failures mean Sentry sees nothing, users see generic toasts.

---

### 4. setTimeout / setInterval Count

**Count:** 28 occurrences of setTimeout/setInterval

Many are likely not cleaned up on unmount (BUG-P: toast memory leaks, Quiz timer leak).

**Severity:** MEDIUM — Accumulates over long sessions, especially on slow devices used in hospitals.

---

### 5. Module-Level Mutable Variables (Cache Leaks — BUG-C)

**Confirmed module-level mutable state:**
- `src/components/DoctorDashboard.jsx:19` — `const _dashCache = new Map()` ← **CRITICAL: cross-user data leak**
- `src/stores/useAppStore.js:12` — `const _channels = new Map()` ← Supabase realtime channels
- `src/lib/tenantResolver.js:22` — `let _cached = null` ← tenant cache (has a clear function, lower risk)
- `src/lib/trackActivity.js:10` — `const queue = []` ← activity queue
- `src/lib/signedUrl.js:14` — `const CACHE = new Map()` ← signed URL cache (no clear on logout)
- `src/lib/dataCache.js:19` — `const _store = new Map()` ← generic cache (no clear on logout)
- `src/lib/blobManager.js:5` — `const activeBlobs = new Set()` ← blob URL tracking

**_dashCache specifically:** Line 19 of DoctorDashboard.jsx — a module-level Map. `.delete()` is called on logout at line 329 ONLY for `resolvedUserId`. If multiple doctors log in sequentially on the same device, earlier doctors' data may persist.

**Severity:** CRITICAL (BUG-C — potential cross-user data exposure in medical context)

---

### 6. Hardcoded API Keys & URLs (SEC-002, SEC-003)

**CRITICAL — Secrets in source code:**

1. **Supabase ANON key hardcoded** in `src/components/MCIVerificationQueue.jsx:5`:
   ```
   const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   ```
   Full JWT token hardcoded as a string constant. This is the production Supabase anon key.

2. **Supabase project URL hardcoded** in:
   - `src/lib/aiService.js:20` — `const SUPABASE_URL = 'https://kzxsyeznpudomeqxbnvp.supabase.co'`
   - `src/lib/trackActivity.js:109` — `|| 'https://kzxsyeznpudomeqxbnvp.supabase.co'`

3. **NVIDIA API key via env var** in `src/lib/aiService.js:59`:
   - `VITE_NVIDIA_API_KEY` — read from env, NOT hardcoded. However, `VITE_` prefix means it ships to the browser bundle — anyone with DevTools can read it. Must move server-side.

4. **Supabase Edge Function URL hardcoded** in `src/components/MCIVerificationQueue.jsx:6`:
   ```
   const EMAIL_FN = 'https://kzxsyeznpudomeqxbnvp.supabase.co/functions/v1/send-approval-email'
   ```

**Severity:** CRITICAL — Keys are in production bundle, visible to any user with DevTools.

---

### 7. sendBeacon Without Auth (SEC-004)

**Location:** `src/lib/trackActivity.js:113`

```js
navigator.sendBeacon(supabaseUrl + '/rest/v1/activity_logs', blob)
```

The sendBeacon payload is constructed at `trackActivity.js:103-115`. The Supabase URL and anon key are used directly, but there is no auth token attached to the beacon. On page unload, the session may already be cleared, meaning the beacon fires unauthenticated.

**Severity:** HIGH — Unauthenticated writes to `activity_logs`; may also fail silently since sendBeacon is fire-and-forget.

---

### 8. God Files (> 500 lines) — Need .bak before surgery

| File | Lines | Notes |
|------|-------|-------|
| `src/components/RegistrationPage.jsx` | 1166 | Largest file — CLAUDE.md violation |
| `src/components/broadcast/DoctorEngageView.jsx` | 698 | |
| `src/pages/Notes.jsx` | 688 | |
| `src/components/superadmin/UserManagement.jsx` | 669 | |
| `src/lib/supabase.js` | 661 | Known debt per architecture.md |
| `src/components/MyPerformancePage.jsx` | 653 | |
| `src/App.jsx` | 633 | |
| `src/components/UploadPage.jsx` | 629 | |
| `src/components/ReportsPage.jsx` | 596 | |
| `src/components/Login.jsx` | 553 | |

**All files >500 lines must have `.bak` copy created before any Phase surgery touches them.**

---

### 9. localStorage Usage

**Count:** 39 occurrences

Needs further audit in Phase 1 to identify which are OTP rate limiting (BUG-T) vs. legitimate caching.

---

## Summary of Findings

| Category | Count | Severity |
|----------|-------|----------|
| Direct `supabase.from()` calls | 160 across 52 files | CRITICAL |
| Hardcoded hex colors | 1,591 | HIGH |
| Files with silent catch blocks | ~8+ | HIGH |
| setTimeout/setInterval calls (cleanup risk) | 28 | MEDIUM |
| Module-level mutable cache vars | 7 | CRITICAL (_dashCache) |
| Hardcoded API keys/URLs in bundle | 4 locations | CRITICAL |
| sendBeacon without auth | 1 | HIGH |
| God files (>500 lines) | 10 | MEDIUM |
| localStorage usages | 39 | MEDIUM |

**Top security concerns requiring immediate Phase 1 action:**
1. `MCIVerificationQueue.jsx` has full Supabase anon JWT hardcoded as a string constant
2. `_dashCache` in DoctorDashboard is a cross-user data leak risk
3. `VITE_NVIDIA_API_KEY` ships to browser bundle — must move behind edge function
4. sendBeacon fires without auth token on page unload

---

## Phase 1 — Security & Service Layer

| Date | Bug ID | File Changed | What Changed | Blast Radius | Verification |
|------|--------|-------------|-------------|-------------|-------------|
| 2026-03-28 | BUG-G, BUG-E, BUG-K | `src/lib/dbService.js` (NEW) | Created centralized data access layer: toSnake/toCamel transformers, dbSelect, dbInsert, dbUpsert, dbUpdate, dbDelete, dbRun, registerCache/clearAllCaches | All 52 files with direct supabase.from() calls — incremental migration | `npm run build` ✅ |
| 2026-03-28 | BUG-E | `src/lib/supabase.js` | Profile insert now runs payload through `toSnake()` — fixes camelCase→snake_case NULL inserts on registration | Registration flow | `npm run build` ✅ |
| 2026-03-28 | SEC-004 (partial) | `src/lib/trackActivity.js` | flushActivityQueue now uses `dbInsert` — consistent error logging, no more silent swallow | activity_logs insert path | `npm run build` ✅ |
| 2026-03-28 | BUG-H | `src/components/NotificationsPage.jsx` | Notification + prefs fetch via `dbSelect`; added Set-based dedup on notification rows (BUG-H) | NotificationsPage only | `npm run build` ✅ |
| 2026-03-28 | BUG-K | `src/components/DoctorDashboard.jsx` | All 9 concurrent queries wrapped in `dbRun(query, signal)` with AbortController; cleanup returns `controller.abort()` on unmount | DoctorDashboard useEffect | `npm run build` ✅ |
| 2026-03-28 | IDEM-1, IDEM-2 | `src/lib/idempotency.js` | idempotency_keys check and insert via dbRun/dbInsert; key save now awaited (fixes IDEM-2 fire-and-forget); fallback insert via dbRun | Quiz/exam submission paths | `npm run build` ✅ |
| 2026-03-28 | BUG-C | `src/lib/signedUrl.js`, `src/lib/dataCache.js`, `src/lib/tenantResolver.js` | Added `registerCache()` calls so all module-level caches are cleared on logout via `clearAllCaches()` | Logout flow — all 3 caches now wiped on user switch | `npm run build` ✅ |
| 2026-03-28 | BUG-C | `src/lib/logout.js` (NEW) | Centralized logout: clears all registered caches → resets Zustand stores → supabase.auth.signOut(). All logout triggers must use `performLogout()` | Any component that calls logout | `npm run build` ✅ |
| 2026-03-28 | SEC-004 | `src/lib/trackActivity.js` | Replaced `sendBeacon` entirely with two-part auth-aware strategy: visibilitychange primary flush + beforeunload→localStorage fallback + `flushPendingFromStorage()` called after auth established | Page unload / tab hide path | `npm run build` ✅ |

## Phase 2 — Data Integrity & Typing

| Date | Bug ID | File Changed | What Changed | Blast Radius | Verification |
|------|--------|-------------|-------------|-------------|-------------|
| 2026-03-28 | BUG-B | `src/schemas/` (11 NEW files) | Zod schema library: ProfileFormSchema, ExamQuestionSchema, QuizQuestionSchema, QuizAttemptInsertSchema, ExamAttemptInsertSchema, ActivityLogInsertSchema, ArtifactInsertSchema, NotificationInsertSchema, CalendarDiaryUpsertSchema, AuditLogInsertSchema, FlashcardInsertSchema. `validateInsert()` now THROWS on invalid data. | All insert paths — incremental adoption | `npm run build` ✅ |
| 2026-03-28 | BUG-F | `src/schemas/question.js` | Two canonical schemas: `ExamQuestionSchema.correct` (A/B/C/D) for exam_questions; `QuizQuestionSchema.correctKey` (a/b/c/d) for quiz_questions. Eliminates the correct vs. correct_key ambiguity. | ExamPage, QuizPlayer, QuizBuilder, Arena | `npm run build` ✅ |
| 2026-03-28 | IDEM-3 | `src/lib/idempotency.js`, `src/lib/dbService.js`, `supabase/migrations/20260328000001_idempotency_integrity.sql` | Replaced TOCTOU check-then-insert with DB-level UNIQUE constraint on (user_id, endpoint, payload_hash). ON CONFLICT DO NOTHING is now atomic. dbUpsert extended with ignoreDuplicates option. | Quiz/exam submission paths | `npm run build` ✅ |
| 2026-03-28 | BUG-D | `src/lib/supabase.js`, `src/App.jsx`, `src/components/RegistrationPage.jsx` | Removed offline localStorage registration path entirely. Demo mode was already removed — phantom local_ accounts are gone. Stale iconnect_users localStorage keys cleaned up on app mount. | Registration flow | `npm run build` ✅ |
| 2026-03-28 | REG-1 | `supabase/migrations/20260328000002_profiles_not_null_constraints.sql` | NOT NULL + CHECK constraints on profiles.name, profiles.email, profiles.mci_number. DevTools bypass of form validation now fails at DB level. | Registration and profile updates | `npm run build` ✅ |

## Phase 3 — State Management & Logic

| Date | Bug ID | File Changed | What Changed | Blast Radius | Verification |
|------|--------|-------------|-------------|-------------|-------------|
| 2026-03-28 | BUG-J | `src/context/AuthContext.jsx` | Removed `getSession()` call entirely; now uses ONLY `onAuthStateChange`. `INITIAL_SESSION` event replaces `getSession()` — single code path eliminates auth race condition and login flicker. | All authenticated routes — login/logout flow | `npm run build` ✅ |
| 2026-03-28 | QUIZ-1 | `src/components/quiz/QuizPlayer.jsx` | Added `answersRef = useRef({})` kept in sync on every `answer()` call; timer closure + Submit button both use `answersRef.current` — stale closure eliminated. | QuizPlayer timer → auto-submit path | `npm run build` ✅ |
| 2026-03-28 | QUIZ-2 | `src/components/quiz/QuizPlayer.jsx` | Added `advanceRef` + `isMountedRef`; 350ms advance timeout tracked and cleared on unmount; all state updates guarded with mounted check. | QuizPlayer unmount path | `npm run build` ✅ |
| 2026-03-28 | QUIZ-3 | `src/components/quiz/QuizPlayer.jsx` | `finish()` now shows error toast + calls `onBack()` instead of silent return when `!quiz`. | QuizPlayer finish() code path | `npm run build` ✅ |
| 2026-03-28 | QUIZ-4 | `src/components/quiz/QuizPlayer.jsx` | Added empty-quiz guard; `onBack()` called on load error; `setLoading(false)` guarded with mounted check. | QuizPlayer load path | `npm run build` ✅ |
| 2026-03-28 | EXAM-1 | `src/lib/aiService.js` | Added `AbortController` with 15s timeout to `callGemini()` — matches `callAIViaEdge`'s existing timeout. Prevents permanent hang on AI timeout. | All AI explainer calls from ExamPage | `npm run build` ✅ |
| 2026-03-28 | EXAM-2 | `src/components/ExamPage.jsx` | Guard on `q.correct` before `.toLowerCase()` — crashes when `q.correct` is undefined. Returns explanation copy instead of throwing. | ExamPage results review rendering | `npm run build` ✅ |
| 2026-03-28 | EXAM-3 | `src/components/ExamPage.jsx` | Renamed `catch (_)` to `catch (err)` — error now named and visible in Sentry. | ExamPage startExam error path | `npm run build` ✅ |
| 2026-03-28 | EXAM-4 | `src/components/ExamPage.jsx` | Added `subjectsError` state; `loadSubjects` extracted as `useCallback`; Retry button shown on failure. | ExamPage subject grid loading path | `npm run build` ✅ |
| 2026-03-28 | SR-1 | `src/components/StudyPlan/SpacedRepetition.jsx` | `progress = totalDue > 0 ? Math.round(...) : 0` — prevents NaN when both are 0. | SpacedRepetition progress bar | `npm run build` ✅ |
| 2026-03-28 | SR-3 | `src/components/StudyPlan/SpacedRepetition.jsx` | Replaced direct `supabase.from('spaced_repetition_cards').update()` with `dbUpdate()` — centralized error handling. | SpacedRepetition handleRate() | `npm run build` ✅ |
| 2026-03-28 | BUG-O | `src/stores/useAppStore.js` | Moved `_navigate` function out of Zustand state into module-level `_navigateFn`. `initRouter()` calls `setNavigator()`; `setPage()` uses `imperativeNavigate()`. State is now fully serializable. | All setPage() callers | `npm run build` ✅ |
| 2026-03-28 | BUG-N | `src/App.jsx` | Wrapped `onApprove`, `onReject`, `onUpload`, `onApproveUser`, `onRejectUser`, `onRegisterSuccess` in `useCallback` — sharedProps `useMemo` deps are now stable, eliminating re-render cascade. | All child components receiving sharedProps | `npm run build` ✅ |
| 2026-03-28 | BUG-P | `src/stores/useAppStore.js`, `src/App.jsx` | `addToast()` stores `setTimeout` IDs in `_toastTimers` Map; `reset()` cancels all pending timers; `logout()` calls `resetAppState()`. | Toast auto-dismiss across logout boundary | `npm run build` ✅ |
| 2026-03-28 | BUG-A | `src/stores/useAppStore.js` | Added `VALID_PAGES` Set; `setPage()` rejects unknown page names with console.warn. Prevents AI navigation or devtools from routing to arbitrary pages. | All setPage() callers | `npm run build` ✅ |
| 2026-03-28 | BUG-H | `src/stores/useAppStore.js` | `pushNotification()` deduplicates by `id` — realtime INSERT + initial fetch can both deliver the same notification row. | NotificationsPage, TopBar badge count | `npm run build` ✅ |
| 2026-03-28 | BUG-I | `src/App.jsx` | Removed `.limit(200)` from `fetchUsers()` — UsersPage virtualises the list so large doctor rosters are no longer silently truncated. | UsersPage user count | `npm run build` ✅ |
| 2026-03-28 | BUG-L | `src/lib/trackActivity.js` | `stopTimer()` now records actual elapsed minutes without `Math.max(1, ...)` — sub-minute sessions no longer inflate activity data or XP. | Activity heatmap, XP calculation | `npm run build` ✅ |
| 2026-03-28 | BUG-S | `src/lib/aiService.js` | Added `parseAiJson()` helper: tries `JSON.parse(clean)` first, then falls back to object/array regex extraction. Applied to all 6 AI functions that previously went regex-first, fixing crash on nested AI responses. | All AI JSON-returning functions | `npm run build` ✅ |
| 2026-03-28 | BUG-K | `src/components/DoctorDashboard.jsx` | Already fixed — all 9 concurrent dashboard queries use `dbRun(query, signal)` with `AbortController`. Confirmed no action needed. | DoctorDashboard unmount path | `npm run build` ✅ |

## Phase 4 — UI/UX, Theme, PWA
*(entries will be added as work progresses)*
