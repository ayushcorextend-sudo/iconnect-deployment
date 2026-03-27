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
*(entries will be added as work progresses)*

## Phase 2 — Data Integrity & Typing
*(entries will be added as work progresses)*

## Phase 3 — State Management & Logic
*(entries will be added as work progresses)*

## Phase 4 — UI/UX, Theme, PWA
*(entries will be added as work progresses)*
