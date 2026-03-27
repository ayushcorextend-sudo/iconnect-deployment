# ════════════════════════════════════════════════════════════════════════════
# iConnect — COMPLETE MASTER BLUEPRINT
# ════════════════════════════════════════════════════════════════════════════
# Generated: 2026-03-24
# Author: Opus full-codebase audit (every file, every function, every table)
# Purpose: THE definitive document. Hand this to Sonnet step by step.
# Status: READ-ONLY audit — zero code was modified during this audit
# ════════════════════════════════════════════════════════════════════════════
#
# HOW TO USE THIS DOCUMENT:
# 1. Open Claude Code (Sonnet) in the iconnect_office_original project
# 2. Paste: "Read .agent/MASTER_BLUEPRINT_COMPLETE.md — start at STEP 1"
# 3. After each step completes, say: "Now do STEP 2" (and so on)
# 4. Each step is self-contained: files to change, what to change, why
# 5. Do NOT skip steps. Order matters — later steps depend on earlier ones.
#
# ════════════════════════════════════════════════════════════════════════════


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART A: THE HONEST DIAGNOSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## What Is iConnect?

Medical education SaaS for Indian doctors (MBBS/PG students).
Three roles: superadmin → contentadmin → doctor.
Stack: React 19 + Vite + Tailwind + Zustand + Supabase + Edge Functions + Vercel.

## The Reality

The app is approximately 65% complete. The UI layer is ~90% built — it looks
like a finished product. But the data/backend layer is only 40-50% connected.

The core problem: **6 database tables are referenced in frontend code but were
never created.** The code has try-catch blocks that swallow errors silently.
Features look like they work (no crashes, no error messages) but they quietly
do nothing — data goes nowhere, reads return empty.

Additionally, several features that DO have database tables have broken logic:
scoring never triggers, exams score client-side instead of server-side, arena
scores reset on reconnect, etc.

This is fixable. The architecture is sound. The UI is well-built. We just need
to close every data loop.

---

## Complete Feature Status Matrix

### ✅ FULLY WORKING END-TO-END (no changes needed)

These features work correctly. Data flows from UI → database → back to UI.

| # | Feature | Key Files | Data Table |
|---|---------|-----------|------------|
| 1 | Auth: OTP login | Login.jsx, AuthContext.jsx | auth.users |
| 2 | Auth: Google OAuth | Login.jsx, supabase.js | auth.users |
| 3 | Auth: Password login | Login.jsx, supabase.js | auth.users |
| 4 | Registration (4-step + MCI upload) | RegistrationPage.jsx | profiles |
| 5 | Profile setup (OAuth users, 3-step) | ProfileSetupPage.jsx | profiles |
| 6 | Pending approval blocking screen | PendingApprovalScreen.jsx | profiles.status |
| 7 | SA: Approve/reject doctors | DoctorApprovalsTab.jsx | profiles.status |
| 8 | SA: MCI verification queue | MCIVerificationQueue.jsx | profiles + storage |
| 9 | SA: Manage content admins | ManageAdminsTab.jsx | profiles.role |
| 10 | SA: Reports + CSV export | ReportsTab.jsx | activity_logs + profiles |
| 11 | SA: Schedule webinars | WebinarCalendarTab.jsx | admin_webinars |
| 12 | SA: Approve/reject artifacts | ArtifactsTab.jsx | artifacts.status |
| 13 | CA: Upload content (PDF/video) | CADashboard.jsx | artifacts + storage |
| 14 | CA: Re-submit rejected content | CADashboard.jsx | artifacts.status |
| 15 | Artifact browsing + filtering | EBooksPage.jsx | artifacts |
| 16 | PDF reader with page tracking | PDFReaderView.jsx | user_content_state |
| 17 | Bookmarks (toggle in reader + dashboard) | EBooksPage.jsx, ReadingBookmarksRow.jsx | user_content_state |
| 18 | Recent reads on dashboard | ReadingBookmarksRow.jsx | user_content_state |
| 19 | Activity logging (11 types, batched) | trackActivity.js | activity_logs |
| 20 | 90-day activity heatmap | ActivityHeatmapClickable.jsx | activity_logs |
| 21 | Exam question management (SA/CA) | ExamManager.jsx, QuestionEditor.jsx | exam_sets, exam_questions |
| 22 | Quiz creation (CA/SA) | QuizBuilder.jsx | quizzes |
| 23 | Quiz taking | QuizPlayer.jsx | quiz_attempts |
| 24 | AI chat via Gemini | ChatPanel.jsx | gemini-proxy edge fn |
| 25 | AI doubt resolution | DoubtBusterPanel.jsx | gemini-proxy |
| 26 | AI smart notes (generate + star) | SmartNotesPanel.jsx | smart_notes |
| 27 | AI case simulation | CaseSimulator.jsx | gemini-proxy |
| 28 | AI reading quiz generation | ReadingQuizModal.jsx | gemini-proxy |
| 29 | Semantic search | SemanticSearch.jsx | query-embedding edge fn |
| 30 | Spaced repetition (SM-2) | SpacedRepetition.jsx | flashcards + sm2.js |
| 31 | Arena: Schedule live quiz | KahootScheduler.jsx | live_arenas |
| 32 | Arena: Host real-time session | LiveArenaHost.jsx | Supabase Realtime |
| 33 | Arena: Student join + play | LiveArenaStudent.jsx | arena_participants + arena_answers |
| 34 | Sidebar (role-based navigation) | Sidebar.jsx | profiles.role |
| 35 | Mobile responsive (768px breakpoint) | Sidebar.jsx, TopBar.jsx | — |
| 36 | Dark mode toggle | TopBar.jsx, useAppStore | localStorage |
| 37 | Error boundaries | AppErrorBoundary.jsx | Sentry |
| 38 | Sentry monitoring (HIPAA-safe) | sentry.js | Sentry DSN |
| 39 | PWA + offline queue | offlineSync.js, Workbox | IndexedDB |
| 40 | Multi-tenancy resolution | tenantResolver.js, useTenantStore | JWT claim → subdomain |

### ❌ UI EXISTS — DATABASE TABLE MISSING (6 tables)

These features have complete, beautiful frontends. But when the user clicks
"Save" or the component tries to load data, the Supabase query silently fails
because the table doesn't exist. No error shown to user — just empty state.

| # | Feature | Component | Missing Table | What Happens |
|---|---------|-----------|---------------|--------------|
| 1 | Daily diary / journal | DiaryPanel.jsx line 57, 91 | `calendar_diary` | User writes diary, clicks save → query fails silently → data lost |
| 2 | Learning persona builder | PersonaBuilder.jsx | `user_study_persona` | User fills learning profile form → save fails → gone on reload |
| 3 | Clinical case logger | ClinicalLogger.jsx | `clinical_logs` | Doctor logs a clinical case → save fails → data lost |
| 4 | Weekly plan persistence | WeeklyPlanner.jsx | `study_plan_history` | AI generates weekly plan → never saved → lost on page change |
| 5 | PDF reader notes | supabase.js getNotes/saveNote | `user_notes` | User writes note on PDF page → save fails → note vanishes |
| 6 | Admin calendar events | Dashboard query | `admin_calendar_events` | Events section always shows empty |

### ⚠️ DATABASE EXISTS — LOGIC IS BROKEN (12 issues)

The tables exist. Data writes partially. But the logic chain is broken somewhere.

| # | Issue | What's Wrong | Impact | Files |
|---|-------|-------------|--------|-------|
| 1 | Score delta always 0 | No `score_rules` table, no DB trigger to calculate points | Every activity earns 0 points | trackActivity.js, activity_logs table |
| 2 | User scores never update | user_scores table exists, nothing writes to it | Dashboard "My Score" = 0 forever | DoctorDashboard.jsx, LeaderboardPage.jsx |
| 3 | Exam scores client-side | ExamPage.jsx calculates score in browser, never calls submit-exam edge function | Scores can be manipulated via devtools | ExamPage.jsx, submit-exam/index.ts |
| 4 | No duration tracking | activity_logs has no `duration_minutes` column. 3 components fallback to hardcoded 30 minutes | "Weekly study hours" wildly inaccurate | DoctorDashboard.jsx, ActivityPage.jsx, MyPerformancePage.jsx |
| 5 | Quiz → no activity log | QuizPlayer.jsx saves to quiz_attempts but never calls trackActivity() | Quizzes invisible in activity heatmap, earn no points | QuizPlayer.jsx |
| 6 | Arena rejoin resets score | LiveArenaStudent.jsx upsert overwrites score to 0 on reconnect | Student disconnects, rejoins, loses all points | LiveArenaStudent.jsx ~line 50 |
| 7 | SA approval → no email | SADashboard onApproveUser() updates DB but doesn't trigger email. MCIVerificationQueue does it correctly — inconsistency | Doctors approved via main tab never get email | App.jsx onApproveUser() |
| 8 | Arena scores don't aggregate | arena_answers stores is_correct flag but never sums into arena_participants.score | Live leaderboard in arena shows wrong totals | LiveArenaHost.jsx, LiveArenaStudent.jsx |
| 9 | Embeddings not auto-generated | generate-embeddings edge function exists but never called on artifact upload/approval | Semantic search misses all new content | ArtifactsTab.jsx, generate-embeddings/index.ts |
| 10 | Webinar reminders never sent | user_reminders table exists, no dispatcher function to actually send | Reminders stored but never delivered | No dispatcher exists |
| 11 | Quiz approval bypass | quizzes.status field exists in DB schema, no UI for SA/CA to approve/reject quizzes | All quizzes auto-visible, no quality gate | QuizBuilder.jsx |
| 12 | AI Insights uses mock data | AIInsightsTab.jsx generates fake scores with Math.random() | SA sees fictional analytics | AIInsightsTab.jsx |

### 🔴 SECURITY ISSUES (6 items)

| # | Issue | Location | Severity | Explanation |
|---|-------|----------|----------|-------------|
| 1 | No server-side route guards | App.jsx renderPage() | **HIGH** | Routes protected only by sidebar hiding menu items. A doctor can open browser devtools, call `useAppStore.getState().setPage('reports')` and access superadmin pages. No role check in renderPage(). |
| 2 | Client-side exam scoring | ExamPage.jsx | **HIGH** | Score calculated in browser before DB insert. Devtools can modify answers array or score value before submission. submit-exam edge function exists but is never called. |
| 3 | OTP rate limit in localStorage | Login.jsx | **MEDIUM** | Lockout after failed OTP attempts stored in localStorage. Clearing localStorage resets the counter. Should be server-side rate limit. |
| 4 | Hardcoded SUPABASE_ANON_KEY | chatbotConstants.js | **MEDIUM** | Anon key as string literal instead of import.meta.env.VITE_SUPABASE_ANON_KEY. Not a secret leak (anon key is public), but bad practice and makes rotation hard. |
| 5 | No rate limiting on gemini-proxy | gemini-proxy/index.ts | **MEDIUM** | Any authenticated user can spam AI requests. No per-user rate limit, no cost cap, no daily quota. At scale this is a billing bomb. |
| 6 | Two parallel quiz systems | KahootPage.jsx vs arena/ | **LOW** | KahootPage.jsx opens external kahoot.it. arena/ is the custom real-time system. Confusing, one should be deprecated. |

### 🔇 AI SERVICE: 15 FUNCTIONS, ONLY 6 CALLED

`frontend/src/lib/aiService.js` has 422 lines and 15+ exported functions.
Only 6 are actually imported anywhere in the app:

| Function | Status | Called From |
|----------|--------|------------|
| getClinicalCase() | ✅ Used | CaseSimulator.jsx |
| askDoubtBuster() | ✅ Used | ChatBot.jsx |
| generateReadingQuiz() | ✅ Used | ReadingQuizModal.jsx |
| generateSmartNote() | ✅ Used | SmartNotesPanel.jsx |
| generateContextualPlan() | ✅ Used | WeeklyPlanner.jsx |
| (direct gemini-proxy calls) | ✅ Used | ChatPanel.jsx |
| explainQuestion() | ❌ Dead code | Nowhere |
| generateStudyPlan() | ❌ Dead code | Nowhere |
| auditContent() | ❌ Dead code | Nowhere |
| getPredictiveAlerts() | ❌ Dead code | AIInsightsTab uses mock instead |
| analyzeKnowledgeGap() | ❌ Dead code | AIInsightsTab uses mock instead |
| assessFatigueLevel() | ❌ Dead code | Nowhere |
| generateActiveRecallAudio() | ❌ Dead code | Nowhere |
| generateSpacedRepetitionCards() | ❌ Dead code | Nowhere |
| gradeSubjectiveAnswer() | ❌ Dead code | Nowhere |
| getPersonalizedSuggestions() | ❌ Dead code | Nowhere |

Decision: Leave dead code for now. These can be wired in Phase 2 features.
But `explainQuestion()` should be wired into exam review, and
`getPredictiveAlerts()` + `analyzeKnowledgeGap()` should replace mock data
in AIInsightsTab.


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART B: THE 20-STEP FIX PLAN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# EXECUTION ORDER MATTERS. Steps 1-2 are database. Steps 3-6 are security.
# Steps 7-16 are feature fixes. Steps 17-20 are polish.
# Each step lists exact files, exact changes, exact verification.
#
# Estimated effort: ~3-4 focused Sonnet sessions (8-10 hours total)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## ═══════════════════════════════════════════════════════════════
## STEP 1 — Create 6 Missing Database Tables + 1 Missing Column
## ═══════════════════════════════════════════════════════════════
##
## WHY: 6 features query tables that don't exist → silent failures
## WHAT: Single migration creating all missing tables + RLS + indexes
## AFTER: Run `supabase db push` + regenerate types
##
## RULES:
## - Follow supabase/CLAUDE.md migration rules
## - Use `IF NOT EXISTS` on everything
## - Wrap RLS in DO $$ blocks
## - Run `supabase migration new missing_tables_and_columns`
##
## TABLES TO CREATE:
##
## 1. calendar_diary
##    - Referenced by: DiaryPanel.jsx (lines 57, 91), ActivityPage.jsx (line 100)
##    - Columns: id (UUID PK), user_id (FK auth.users), date (DATE),
##      entries (JSONB DEFAULT '[]'), mood (TEXT — enum: great/good/okay/tired/stressed),
##      personal_notes (TEXT), created_at, updated_at
##    - Constraint: UNIQUE(user_id, date) — one diary per user per day
##    - Index: (user_id, date)
##
## 2. user_study_persona
##    - Referenced by: PersonaBuilder.jsx, WeeklyPlanner.jsx
##    - Columns: id (UUID PK), user_id (FK auth.users, UNIQUE — one per user),
##      learning_style (TEXT), study_hours_per_day (INT DEFAULT 4),
##      preferred_subjects (TEXT[]), weak_areas (TEXT[]), strong_areas (TEXT[]),
##      peak_hours (TEXT), exam_date (DATE), weekly_goal_hours (INT DEFAULT 20),
##      goals (TEXT), created_at, updated_at
##
## 3. clinical_logs
##    - Referenced by: ClinicalLogger.jsx
##    - Columns: id (UUID PK), user_id (FK auth.users),
##      case_title (TEXT NOT NULL), presentation (TEXT), diagnosis (TEXT),
##      learning_points (TEXT), tags (TEXT[]), speciality (TEXT), created_at
##    - Index: (user_id, created_at DESC)
##
## 4. study_plan_history
##    - Referenced by: WeeklyPlanner.jsx, StudyPlanCard.jsx
##    - Columns: id (UUID PK), user_id (FK auth.users),
##      week_start (DATE NOT NULL), plan (JSONB NOT NULL DEFAULT '[]'),
##      tasks (JSONB NOT NULL DEFAULT '[]'), completed_tasks (JSONB DEFAULT '[]'),
##      is_active (BOOLEAN DEFAULT true), ai_generated (BOOLEAN DEFAULT false),
##      created_at, updated_at
##    - Index: (user_id, week_start DESC)
##
## 5. user_notes
##    - Referenced by: supabase.js getNotes(), saveNote(), deleteNote()
##    - Columns: id (UUID PK), user_id (FK auth.users),
##      artifact_id (FK artifacts), page_number (INT),
##      note_content (TEXT NOT NULL), highlight_text (TEXT), created_at, updated_at
##    - Index: (user_id, artifact_id)
##    - NOTE: This is for plain user notes. smart_notes table already exists for AI notes.
##
## 6. idempotency_keys
##    - Referenced by: supabase/functions/submit-exam/index.ts
##    - Columns: id (UUID PK), key (TEXT UNIQUE NOT NULL),
##      result (JSONB), created_at
##    - RLS: service_role only
##    - Index: (key)
##
## COLUMN TO ADD:
##    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
##
## RLS FOR ALL USER TABLES (calendar_diary, user_study_persona, clinical_logs,
## study_plan_history, user_notes):
##    - SELECT: auth.uid() = user_id
##    - INSERT: auth.uid() = user_id
##    - UPDATE: auth.uid() = user_id
##    - DELETE: auth.uid() = user_id (except user_study_persona — no delete)
##    - Superadmin: read all via role check on profiles table
##
## RLS FOR idempotency_keys:
##    - ALL: auth.role() = 'service_role'
##
## VERIFICATION:
##    1. supabase db push → no errors
##    2. supabase gen types typescript --local > frontend/src/lib/database.types.ts
##    3. Open Supabase Studio → all 6 tables visible with correct columns
##    4. Try INSERT as authenticated user → RLS allows
##    5. Try INSERT as different user → RLS blocks


## ═══════════════════════════════════════════════════════════════
## STEP 2 — Create Scoring System (score_rules + DB Trigger)
## ═══════════════════════════════════════════════════════════════
##
## WHY: activity_logs.score_delta is always 0. user_scores never updates.
##       Leaderboard shows 0 for everyone. Dashboard "My Score" = 0.
## WHAT: score_rules lookup table + trigger that auto-populates score_delta
##       and upserts user_scores on every activity log insert.
##
## MIGRATION: `supabase migration new scoring_system`
##
## TABLE: score_rules
##    - activity_type TEXT PRIMARY KEY
##    - points INTEGER NOT NULL
##    - description TEXT
##
## SEED DATA (INSERT with ON CONFLICT DO NOTHING):
##    daily_login: 5
##    article_read: 10
##    quiz_complete: 20
##    quiz_passed: 30
##    quiz_attempted: 5
##    exam_set_completed: 50
##    study_plan_completed: 15
##    spaced_rep_reviewed: 10
##    clinical_case_logged: 20
##    diary_entry: 5
##    webinar_attended: 25
##    arena_completed: 30
##    note_created: 5
##    smart_note_created: 10
##
## TRIGGER FUNCTION: fn_calculate_score_delta()
##    Language: plpgsql
##    Trigger: BEFORE INSERT ON activity_logs FOR EACH ROW
##    Logic:
##      1. SELECT points FROM score_rules WHERE activity_type = NEW.activity_type
##      2. IF found: NEW.score_delta := points
##      3. UPSERT user_scores:
##         INSERT INTO user_scores (user_id, total_score, updated_at)
##         VALUES (NEW.user_id, points, now())
##         ON CONFLICT (user_id) DO UPDATE SET
##           total_score = user_scores.total_score + EXCLUDED.total_score,
##           updated_at = now()
##      4. RETURN NEW
##
## IMPORTANT: Check user_scores table schema first. It may need a UNIQUE
##    constraint on user_id for the ON CONFLICT to work. Add if missing:
##    ALTER TABLE user_scores ADD CONSTRAINT user_scores_user_id_unique
##      UNIQUE (user_id) IF NOT EXISTS;
##
## VERIFICATION:
##    1. supabase db push → no errors
##    2. Manually INSERT into activity_logs via SQL → check score_delta is set
##    3. Check user_scores row was created/updated
##    4. Insert another activity → total_score increments


## ═══════════════════════════════════════════════════════════════
## STEP 3 — Add Server-Side Route Guards
## ═══════════════════════════════════════════════════════════════
##
## WHY: Doctor can access superadmin pages by calling setPage() from devtools
## WHAT: Role-based page access check in renderPage()
## FILE: frontend/src/App.jsx → renderPage() function
##
## IMPLEMENTATION:
##
## Add this constant at file top (or inside component before renderPage):
##
##   const ROLE_PAGES = {
##     doctor: [
##       'dashboard', 'ebooks', 'exams', 'studyplan', 'activity',
##       'leaderboard', 'arena', 'broadcast', 'flashcards', 'search',
##       'performance', 'smart-notes', 'case-simulator', 'doubt-buster'
##     ],
##     contentadmin: [
##       'ca-dashboard', 'upload', 'ca-manage', 'ca-notifications'
##     ],
##     superadmin: [
##       'sa-dashboard', 'reports', 'manage-admins', 'approvals',
##       'webinar-calendar', 'ai-insights', 'user-management',
##       'mci-verification', 'artifacts', 'arena-scheduler'
##     ]
##   };
##
## At the TOP of renderPage(), before the switch statement:
##
##   const userRole = authRole || role; // however role is accessed
##   const allowedPages = ROLE_PAGES[userRole] || [];
##   if (!allowedPages.includes(currentPage)) {
##     // Redirect to role's default page
##     const defaultPage = userRole === 'superadmin' ? 'sa-dashboard'
##       : userRole === 'contentadmin' ? 'ca-dashboard'
##       : 'dashboard';
##     setPage(defaultPage);
##     return null;
##   }
##
## VERIFICATION:
##   1. Login as doctor → try setPage('reports') in devtools → redirected to dashboard
##   2. Login as CA → try setPage('sa-dashboard') → redirected to ca-dashboard
##   3. Login as SA → can access all SA pages normally
##   4. All normal navigation still works for each role


## ═══════════════════════════════════════════════════════════════
## STEP 4 — Wire ExamPage to submit-exam Edge Function
## ═══════════════════════════════════════════════════════════════
##
## WHY: ExamPage.jsx calculates score in browser → can be cheated
## WHAT: Replace client-side scoring with server-side edge function call
## FILE: frontend/src/components/ExamPage.jsx
##
## CURRENT BROKEN FLOW:
##   1. User answers questions
##   2. handleSubmit() calculates correct answers client-side
##   3. Inserts score directly into exam_attempts table
##   4. Anyone can modify answers[] or score via devtools before submit
##
## FIXED FLOW:
##   1. User answers questions
##   2. handleSubmit() sends answers to edge function:
##      const { data, error } = await supabase.functions.invoke('submit-exam', {
##        body: {
##          exam_id: currentExam.id,
##          answers: userAnswers, // [{question_id, selected_option}]
##          idempotency_key: crypto.randomUUID()
##        }
##      });
##   3. Edge function validates answers server-side
##   4. Edge function inserts into exam_attempts (using service_role)
##   5. Edge function returns: { score, total, percentage, passed, results }
##   6. ExamPage displays results from response
##
## ALSO: Remove all client-side scoring logic (the loop that counts correct answers).
##       Keep only the UI display of results returned from the edge function.
##
## CHECK: submit-exam/index.ts exists and handles this payload. Read it first
##        to match the expected request body format exactly.
##
## ALSO ADD: trackActivity call after successful submission:
##   trackActivity('exam_set_completed', currentExam.id);
##   if (data.passed) trackActivity('quiz_passed', currentExam.id);
##   else trackActivity('quiz_attempted', currentExam.id);
##
## VERIFICATION:
##   1. Take an exam → score comes from edge function
##   2. Open devtools → can't find score calculation in client code
##   3. Activity log shows exam_set_completed entry
##   4. Leaderboard score increases by 50 points (from Step 2)


## ═══════════════════════════════════════════════════════════════
## STEP 5 — Fix SA Approval Email Gap
## ═══════════════════════════════════════════════════════════════
##
## WHY: Doctors approved via SADashboard onApproveUser() get no email.
##       MCIVerificationQueue sends emails correctly — inconsistency.
## WHAT: Add email trigger to onApproveUser() and onRejectUser()
## FILE: frontend/src/App.jsx → find onApproveUser() and onRejectUser()
##
## LOOK AT: MCIVerificationQueue.jsx lines ~88-94 for the correct pattern.
## Copy that same edge function call into onApproveUser():
##
##   // After profiles.status update succeeds:
##   await supabase.functions.invoke('send-approval-email', {
##     body: {
##       email: user.email,
##       name: user.full_name || user.name,
##       status: 'approved'
##     }
##   });
##
## Same for onRejectUser() with status: 'rejected'
##
## VERIFICATION:
##   1. Create test doctor account
##   2. Approve via SA Dashboard (not MCI queue)
##   3. Check if approval email is received


## ═══════════════════════════════════════════════════════════════
## STEP 6 — Fix Hardcoded Supabase Anon Key
## ═══════════════════════════════════════════════════════════════
##
## WHY: chatbotConstants.js has SUPABASE_ANON_KEY as string literal
## WHAT: Replace with env var
## FILE: frontend/src/lib/chatbotConstants.js
##
## FIND: const SUPABASE_ANON_KEY = 'eyJ...' (or similar)
## REPLACE WITH: const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
##
## VERIFICATION: `npm run build` succeeds, AI chat still works


## ═══════════════════════════════════════════════════════════════
## STEP 7 — Fix DiaryPanel (calendar_diary table now exists)
## ═══════════════════════════════════════════════════════════════
##
## WHY: After Step 1, calendar_diary table exists. Verify the feature works.
## FILES: Activity/DiaryPanel.jsx, ActivityPage.jsx
##
## CHECK:
##   1. Read DiaryPanel.jsx — find the INSERT/SELECT queries
##   2. Verify column names match the table created in Step 1
##   3. Verify the upsert logic handles UNIQUE(user_id, date) correctly
##   4. Fix any column name mismatches
##
## EXPECTED BEHAVIOR AFTER FIX:
##   - User opens ActivityPage → clicks a date on heatmap
##   - DiaryPanel opens with that date
##   - User writes entry, selects mood, clicks Save
##   - Data persists to calendar_diary
##   - Reload page → data still there
##   - Heatmap shows indicator dots for dates with diary entries
##   - Dashboard MonthlyCalendar also shows diary indicators
##
## COLUMN MAPPING TO VERIFY:
##   DiaryPanel expects: user_id, date, entries, mood, personal_notes
##   Table has: user_id, date, entries (jsonb), mood, personal_notes
##   → Should match. But verify field names in the JSX exactly.
##
## ALSO: Add trackActivity('diary_entry', null) after successful save.
##   (Check if it's already there — DiaryPanel.jsx line ~95)


## ═══════════════════════════════════════════════════════════════
## STEP 8 — Fix PersonaBuilder (user_study_persona table now exists)
## ═══════════════════════════════════════════════════════════════
##
## FILES: StudyPlan/PersonaBuilder.jsx
##
## CHECK:
##   1. Read PersonaBuilder.jsx — find the save/load functions
##   2. Verify column names match user_study_persona table from Step 1
##   3. This should be an upsert (one persona per user, UNIQUE on user_id)
##   4. On component mount, load existing persona if any
##   5. On save, upsert the persona
##
## EXPECTED BEHAVIOR:
##   - Doctor opens Study Plan → PersonaBuilder tab
##   - Fills in learning style, preferred subjects, weak areas, goals, etc.
##   - Clicks Save → data persists
##   - Reload → form pre-filled with saved data
##   - WeeklyPlanner can read persona to generate personalized AI plans


## ═══════════════════════════════════════════════════════════════
## STEP 9 — Fix ClinicalLogger (clinical_logs table now exists)
## ═══════════════════════════════════════════════════════════════
##
## FILES: StudyPlan/ClinicalLogger.jsx
##
## CHECK:
##   1. Read ClinicalLogger.jsx — find the save function
##   2. Verify column names match clinical_logs from Step 1
##   3. On save: INSERT into clinical_logs
##   4. Component should also load and display previous entries
##
## EXPECTED BEHAVIOR:
##   - Doctor opens Study Plan → Clinical Logger tab
##   - Fills in case title, presentation, diagnosis, learning points, tags
##   - Clicks Save → data persists
##   - Previous entries shown as a list below the form
##   - trackActivity('clinical_case_logged', logId) fires after save
##
## VERIFICATION: Save a case → reload → case still in list → activity_logs has entry


## ═══════════════════════════════════════════════════════════════
## STEP 10 — Fix WeeklyPlanner Persistence + Editable Tasks
## ═══════════════════════════════════════════════════════════════
##
## WHY: AI generates weekly plan → displayed → lost on page change
## FILES: StudyPlan/WeeklyPlanner.jsx, dashboard/StudyPlanCard.jsx
##
## CURRENT BROKEN FLOW:
##   1. WeeklyPlanner calls generateContextualPlan() → AI returns plan
##   2. Plan displayed in UI
##   3. User navigates away → plan is gone
##   4. No save to database
##
## FIXED FLOW:
##   1. On component mount: check study_plan_history for active plan this week
##      SELECT * FROM study_plan_history
##      WHERE user_id = auth.uid()
##        AND week_start = date_trunc('week', now())::date
##        AND is_active = true
##      ORDER BY created_at DESC LIMIT 1
##   2. If found → display saved plan + tasks + completed_tasks
##   3. If not found → show "Generate Plan" button
##   4. On generate → AI creates plan → SAVE to study_plan_history:
##      INSERT INTO study_plan_history (user_id, week_start, plan, tasks, ai_generated)
##      VALUES (auth.uid(), date_trunc('week', now())::date, planJson, tasksJson, true)
##   5. Deactivate any previous active plans:
##      UPDATE study_plan_history SET is_active = false
##      WHERE user_id = auth.uid() AND is_active = true AND id != newPlanId
##
## TASK EDITING:
##   - Each task in tasks JSONB array has: { id, title, type, completed, completedAt }
##   - User can add new tasks (append to array)
##   - User can edit task titles (update in array)
##   - User can remove tasks (filter from array)
##   - User can mark complete (set completed: true, completedAt: timestamp)
##   - On any change: UPDATE study_plan_history SET tasks = updatedTasks,
##     completed_tasks = tasksArray.filter(t => t.completed)
##
## DASHBOARD INTEGRATION:
##   - StudyPlanCard.jsx should query study_plan_history for active plan
##   - Display task count: "4/7 tasks completed"
##   - Show next uncompleted task
##   - Completed tasks shown with strikethrough/checkmark
##   - Link to full WeeklyPlanner page
##
## VERIFICATION:
##   1. Generate plan → navigate away → come back → plan still there
##   2. Mark task complete → reload → still checked
##   3. Add custom task → reload → still in list
##   4. Dashboard StudyPlanCard shows correct task progress
##   5. Next week → old plan deactivated → can generate new one


## ═══════════════════════════════════════════════════════════════
## STEP 11 — Fix PDF Reader Notes
## ═══════════════════════════════════════════════════════════════
##
## WHY: user_notes table now exists (Step 1). supabase.js has
##       getNotes/saveNote/deleteNote but they query a missing table.
## FILES: frontend/src/lib/supabase.js (notes section), EBooksPage.jsx
##        or PDFReaderView.jsx
##
## CHECK:
##   1. Read supabase.js — find getNotes(), saveNote(), deleteNote()
##   2. Verify they query 'user_notes' (matching table from Step 1)
##   3. Verify column names match: user_id, artifact_id, page_number,
##      note_content, highlight_text
##   4. Find where these functions are CALLED in the PDF reader
##   5. If not called → add the calls:
##      - On reader mount: load notes for this artifact
##      - On "Add Note" button: save note with current page_number
##      - Display notes as sidebar or overlay markers
##
## VERIFICATION:
##   1. Open a PDF in reader → add note on page 5
##   2. Navigate to page 10 → add another note
##   3. Close reader → reopen same PDF → both notes still there
##   4. Delete a note → reload → gone


## ═══════════════════════════════════════════════════════════════
## STEP 12 — Wire QuizPlayer to trackActivity
## ═══════════════════════════════════════════════════════════════
##
## WHY: QuizPlayer saves to quiz_attempts but never calls trackActivity.
##       Quizzes are invisible in activity heatmap and earn 0 points.
## FILE: frontend/src/components/quiz/QuizPlayer.jsx
##
## FIND: The submission handler (after quiz_attempts insert succeeds)
## ADD:
##   import { trackActivity } from '../../lib/trackActivity';
##   // After successful quiz submission:
##   trackActivity('quiz_complete', quizId);
##   if (score >= passingScore) {
##     trackActivity('quiz_passed', quizId);
##   } else {
##     trackActivity('quiz_attempted', quizId);
##   }
##
## VERIFICATION:
##   1. Take a quiz → pass it
##   2. Check activity_logs → quiz_complete + quiz_passed entries
##   3. Check user_scores → points increased by 20 + 30 = 50
##   4. Heatmap shows activity for today


## ═══════════════════════════════════════════════════════════════
## STEP 13 — Add Duration Tracking
## ═══════════════════════════════════════════════════════════════
##
## WHY: 3 components display "Weekly study hours" using hardcoded 30-min fallback
## FILES: frontend/src/lib/trackActivity.js + 4 call sites
##
## ADD TO trackActivity.js:
##
##   // Timer storage
##   const timers = {};
##
##   export function startTimer(activityType, referenceId = 'default') {
##     const key = `${activityType}_${referenceId}`;
##     timers[key] = Date.now();
##   }
##
##   export function stopTimer(activityType, referenceId = 'default') {
##     const key = `${activityType}_${referenceId}`;
##     const start = timers[key];
##     if (start) {
##       const minutes = Math.max(1, Math.round((Date.now() - start) / 60000));
##       delete timers[key];
##       return minutes;
##     }
##     return 0;
##   }
##
## MODIFY trackActivity() to accept optional duration_minutes param:
##   export function trackActivity(activityType, referenceId, durationMinutes = 0)
##   Include duration_minutes in the INSERT payload.
##
## CALL SITES TO ADD TIMERS:
##
##   1. EBooksPage.jsx / PDFReaderView.jsx:
##      - On open: startTimer('article_read', artifactId)
##      - On close/navigate away: const mins = stopTimer('article_read', artifactId);
##        trackActivity('article_read', artifactId, mins);
##
##   2. ExamPage.jsx:
##      - On exam start: startTimer('exam', examId)
##      - On submit: const mins = stopTimer('exam', examId);
##        (pass to edge function or track separately)
##
##   3. QuizPlayer.jsx:
##      - On quiz start: startTimer('quiz', quizId)
##      - On submit: const mins = stopTimer('quiz', quizId);
##        trackActivity('quiz_complete', quizId, mins);
##
##   4. SpacedRepetition.jsx:
##      - On session start: startTimer('spaced_rep', 'session')
##      - On session end: stopTimer + trackActivity
##
## VERIFICATION:
##   1. Open a book for 3 minutes → close
##   2. Check activity_logs → duration_minutes = 3 (not 0 or 30)
##   3. Dashboard "Study Hours" shows accurate calculation


## ═══════════════════════════════════════════════════════════════
## STEP 14 — Fix Arena Rejoin Score Reset
## ═══════════════════════════════════════════════════════════════
##
## WHY: Upsert on arena_participants sets score = 0 on rejoin.
##       Student disconnects + reconnects → loses all points.
## FILE: frontend/src/components/arena/LiveArenaStudent.jsx (~line 50)
##
## FIND: The upsert that inserts/updates arena_participants
##   Likely: .upsert({ arena_id, user_id, display_name, score: 0 })
##
## FIX: Change to:
##   .upsert(
##     { arena_id, user_id, display_name },
##     { onConflict: 'arena_id,user_id', ignoreDuplicates: false }
##   )
##   // Do NOT include score in the upsert payload
##   // This way: first join creates row with score default (0),
##   // rejoin updates display_name only, score preserved
##
## ALTERNATIVE if Supabase client upsert doesn't support excluding columns:
##   Check if row exists first:
##   const { data: existing } = await supabase
##     .from('arena_participants')
##     .select('id')
##     .eq('arena_id', arenaId)
##     .eq('user_id', userId)
##     .single();
##   if (!existing) {
##     // First join: insert with score: 0
##   }
##   // Rejoin: just reconnect to realtime channel, don't touch DB
##
## VERIFICATION:
##   1. Join arena → answer 3 questions correctly → score = X
##   2. Disconnect (close tab)
##   3. Rejoin same arena → score still = X


## ═══════════════════════════════════════════════════════════════
## STEP 15 — Build Calendar Date-Click Detail View
## ═══════════════════════════════════════════════════════════════
##
## WHY: Clicking a date on the calendar should show ALL activity for that day
## FILES:
##   - frontend/src/components/dashboard/MonthlyCalendar.jsx (modify)
##   - NEW: frontend/src/components/dashboard/DayDetailPanel.jsx (create)
##
## DayDetailPanel.jsx — NEW COMPONENT:
##
## Props: { date, userId, onClose }
##
## On mount, fetch 4 queries in parallel:
##   1. activity_logs WHERE user_id = userId AND created_at::date = date
##      ORDER BY created_at ASC
##   2. calendar_diary WHERE user_id = userId AND date = date
##   3. user_content_state JOIN artifacts WHERE updated_at::date = date
##      (books read that day)
##   4. quiz_attempts WHERE user_id = userId AND created_at::date = date
##      + exam_attempts WHERE user_id = userId AND created_at::date = date
##
## Display layout (Framer Motion animated panel, expands below calendar):
##   - Header: "March 20, 2026" with close button
##   - Timeline section: chronological list of activities with timestamps
##     "8:02 AM — Logged in (daily_login, +5 pts)"
##     "8:15 AM — Read Harrison's Principles Ch. 3 (45 min, +10 pts)"
##     "9:00 AM — Quiz: Cardiology Basics — 85% (+30 pts)"
##   - Stats row: Total study time | Points earned | Items completed
##   - Books section: titles + pages read + bookmark status
##   - Quiz/Exam results: name, score, pass/fail
##   - Diary section: show existing diary entry (editable)
##     If no entry → "Add a journal note for this day" button
##     On save → upsert to calendar_diary
##
## MonthlyCalendar.jsx modifications:
##   - On date click → set selectedDate state → show DayDetailPanel
##   - Highlight selected date visually
##   - Click same date again or click X → close panel
##
## STYLING: Use design tokens from tokens.js. Framer Motion for expand/collapse.
## Use Lucide icons for each activity type.
##
## VERIFICATION:
##   1. Do some activities today (read a book, take a quiz)
##   2. Go to dashboard → click today's date on calendar
##   3. Panel expands showing all activities with timestamps and points
##   4. Write a diary note → save → close → reopen → note persists


## ═══════════════════════════════════════════════════════════════
## STEP 16 — Fix Webinar Save/Interested Across Site
## ═══════════════════════════════════════════════════════════════
##
## WHY: No way for doctors to save/register interest in upcoming webinars
## FILES: dashboard/WebinarLeaderboardRow.jsx + BroadcastPage.jsx
##
## CHECK FIRST: Does webinar_registrations table exist?
##   If not → create migration:
##   CREATE TABLE IF NOT EXISTS webinar_registrations (
##     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
##     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
##     webinar_id UUID NOT NULL,
##     registered_at TIMESTAMPTZ DEFAULT now(),
##     UNIQUE(user_id, webinar_id)
##   );
##   + RLS: user reads/writes own rows
##
## ADD to every webinar card (dashboard, broadcast page):
##   - "Interested / Save" toggle button (bookmark icon)
##   - On click: INSERT INTO webinar_registrations (user_id, webinar_id)
##   - On un-click: DELETE FROM webinar_registrations WHERE user_id AND webinar_id
##   - Show filled bookmark icon if already saved
##
## DASHBOARD: Add "My Saved Webinars" mini-section:
##   - Query: webinar_registrations JOIN admin_webinars WHERE user_id = auth.uid()
##   - Show upcoming saved webinars with date/time
##   - "View" button opens webinar detail
##
## VERIFICATION:
##   1. See webinar on dashboard → click "Interested" → icon fills
##   2. Reload → still saved
##   3. Check "My Saved Webinars" section → webinar appears
##   4. Un-save → disappears


## ═══════════════════════════════════════════════════════════════
## STEP 17 — Auto-Generate Embeddings on Artifact Approval
## ═══════════════════════════════════════════════════════════════
##
## WHY: generate-embeddings edge function works but never auto-triggered.
##       New content has no embeddings → semantic search misses it.
## FILE: frontend/src/components/sadashboard/ArtifactsTab.jsx
##
## FIND: The onApprove handler (where artifact status changes to 'approved')
## ADD (after successful status update):
##
##   // Auto-generate embeddings for searchability
##   try {
##     await supabase.functions.invoke('generate-embeddings', {
##       body: { artifact_id: artifact.id }
##     });
##   } catch (embErr) {
##     console.warn('Embedding generation failed:', embErr);
##     // Non-blocking — content is still approved even if embedding fails
##   }
##
## VERIFICATION:
##   1. Upload new content as CA → SA approves
##   2. Search for keywords from that content → results appear


## ═══════════════════════════════════════════════════════════════
## STEP 18 — Fix AIInsightsTab Mock Data → Real Data
## ═══════════════════════════════════════════════════════════════
##
## WHY: SA sees fictional analytics generated by Math.random()
## FILE: frontend/src/components/sadashboard/AIInsightsTab.jsx
##
## CURRENT: Hardcoded mock data like:
##   avgScore: 0, topSubject: 'Internal Medicine'
##   subject.score = Math.floor(Math.random() * 100)
##
## FIX: Replace with real queries:
##
##   // Real average exam score
##   const { data: examStats } = await supabase
##     .from('exam_attempts')
##     .select('score')
##     .gte('created_at', thirtyDaysAgo);
##   const avgScore = examStats?.reduce((a,b) => a + b.score, 0) / examStats?.length || 0;
##
##   // Real activity counts by type
##   const { data: activityCounts } = await supabase
##     .from('activity_logs')
##     .select('activity_type')
##     .gte('created_at', thirtyDaysAgo);
##   // Group and count
##
##   // Real top subjects from content engagement
##   const { data: contentEngagement } = await supabase
##     .from('user_content_state')
##     .select('artifact_id, artifacts(subject)')
##     .order('updated_at', { ascending: false })
##     .limit(100);
##
## THEN: Feed real data to getPredictiveAlerts() and analyzeKnowledgeGap()
##       from aiService.js (currently dead code — now wire them in).
##
## VERIFICATION:
##   1. Login as SA → open AI Insights tab
##   2. Numbers reflect real platform usage, not random


## ═══════════════════════════════════════════════════════════════
## STEP 19 — Deprecate KahootPage.jsx
## ═══════════════════════════════════════════════════════════════
##
## WHY: Two competing quiz systems. KahootPage opens external kahoot.it.
##       arena/ system is the custom-built real-time quiz. Keep arena/, drop Kahoot.
## FILE: frontend/src/components/Sidebar.jsx
##
## FIND: Any sidebar link to KahootPage / kahoot
## REPLACE: Point "Live Quiz" to the arena system instead
##
## DO NOT DELETE KahootPage.jsx — rename to KahootPage.jsx.bak
## Add to .agent/architecture.md known tech debt section.
##
## VERIFICATION: Sidebar "Live Quiz" opens arena, not external Kahoot link


## ═══════════════════════════════════════════════════════════════
## STEP 20 — Add Leaderboard Cache TTL
## ═══════════════════════════════════════════════════════════════
##
## WHY: Leaderboard data cached indefinitely → stale scores shown
## FILE: frontend/src/components/LeaderboardPage.jsx
##
## FIND: Where data is cached (likely in state or useRef)
## ADD: TTL check — if data older than 5 minutes, refetch:
##
##   const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
##   const [lastFetch, setLastFetch] = useState(0);
##
##   useEffect(() => {
##     if (Date.now() - lastFetch > CACHE_TTL) {
##       fetchLeaderboard();
##       setLastFetch(Date.now());
##     }
##   }, []);
##
## VERIFICATION: Complete an activity → wait → leaderboard shows updated score within 5 min


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART C: DEPLOYMENT CHECKLIST
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After completing all 20 steps:

## Database
- [ ] supabase db push → zero errors
- [ ] supabase gen types typescript --local > frontend/src/lib/database.types.ts
- [ ] Verify all 6 new tables visible in Supabase Studio
- [ ] Verify score_rules has 14 rows
- [ ] Verify fn_calculate_score_delta trigger exists on activity_logs
- [ ] Verify user_scores has UNIQUE constraint on user_id

## Edge Functions
- [ ] supabase functions deploy submit-exam
- [ ] supabase functions deploy generate-embeddings (if modified)

## Build
- [ ] cd frontend && npm run build → ZERO errors, ZERO warnings
- [ ] Check bundle size hasn't exploded (new component: DayDetailPanel)

## Functional Testing (with real doctor account)

### Dashboard
- [ ] "My Score" shows non-zero after doing activities
- [ ] Activity heatmap shows colored cells for active days
- [ ] Monthly calendar shows dots on active days
- [ ] Click calendar date → DayDetailPanel opens with day's activities
- [ ] StudyPlanCard shows current week's plan with task progress
- [ ] "Recent Reads" shows books I've opened
- [ ] "Bookmarks" shows books I've bookmarked
- [ ] "Upcoming Webinar" shows next webinar with "Interested" button
- [ ] "My Saved Webinars" section shows saved ones

### Activity & Calendar
- [ ] Click date → full day activity breakdown with timestamps
- [ ] Write diary entry → save → reload → still there
- [ ] Mood selector works and persists
- [ ] Heatmap intensity matches actual activity volume

### Study Plan
- [ ] PersonaBuilder → fill form → save → reload → data persists
- [ ] ClinicalLogger → log case → save → reload → case in list
- [ ] WeeklyPlanner → generate AI plan → saved to DB → reload → plan still there
- [ ] Edit weekly tasks → add task → remove task → persists
- [ ] Mark task complete → strikethrough/checkmark → persists
- [ ] Dashboard shows task completion count

### Exams & Quizzes
- [ ] Take exam → score from edge function (not client-side)
- [ ] Score appears in leaderboard after exam
- [ ] Take quiz → activity logged → points earned
- [ ] Duration tracking: study hours accurate (not 30-min default)

### Arena
- [ ] Join arena → answer questions → accumulate score
- [ ] Disconnect → rejoin → score NOT reset to 0
- [ ] Arena results posted to activity_logs after session

### Webinars
- [ ] "Interested" button on webinar cards (dashboard + broadcast)
- [ ] Toggle save/unsave → persists
- [ ] "My Saved Webinars" section shows saved ones

### AI Features
- [ ] AI chat works (Gemini proxy)
- [ ] Smart notes generate and save
- [ ] Semantic search returns results for recently approved content
- [ ] AI Insights tab (SA) shows real data, not random

### Security
- [ ] Doctor cannot access SA pages via devtools setPage()
- [ ] CA cannot access SA pages
- [ ] Exam scores cannot be manipulated client-side

## Deploy
- [ ] git add + commit all changes
- [ ] git push → Vercel auto-deploys
- [ ] Verify production site works (not just localhost)
- [ ] Update .agent/handoff.md with everything that changed


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART D: FUTURE RECOMMENDATIONS (after Phase 1 deploy)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Architecture Improvements
- Split supabase.js (525 lines) into modules:
  supabase/client.js, auth.js, artifacts.js, contentState.js, notes.js, exam.js, activity.js
  with index.js re-exporting everything (backward compatible)

- Wire remaining 9 dead AI functions from aiService.js:
  explainQuestion → exam review screen
  generateSpacedRepetitionCards → auto-create flashcards from content
  gradeSubjectiveAnswer → long-form exam questions
  getPersonalizedSuggestions → ForYouWidget real recommendations

- Add rate limiting to gemini-proxy edge function:
  Per-user: 50 requests/hour. Daily cap: 200.
  Return 429 with retry-after header.

- Move OTP rate limiting server-side (edge function or RLS)

- Add quiz approval workflow (SA/CA review before doctors see quizzes)

## Testing
- Add Vitest or Jest for:
  - supabase.js function unit tests
  - Component render tests for dashboard widgets
  - Edge function tests (submit-exam validation logic)

## Monitoring
- Increase Sentry production sampling from 20% to 50%
- Add Sentry custom events for: exam_submitted, arena_completed, diary_saved
- Add performance monitoring for Gemini proxy response times

## Phase 2: Orchestration System
- .agent/next-actions.md — prioritized task backlog
- Cowork skill "plan-session" — handoff + next-actions → Sonnet prompt
- Cowork skill "review-session" — git diff vs CLAUDE.md rules → violation report
- Weekly Opus review — architecture.md → prioritized next-actions.md


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART E: COMPLETE FILE AUDIT LOG
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every file read during this audit:

## Configuration
- CLAUDE.md (root)
- frontend/CLAUDE.md
- supabase/CLAUDE.md
- server/CLAUDE.md
- .agent/architecture.md
- .agent/handoff.md
- scripts/iconnect_aliases.sh

## Auth & Routing
- frontend/src/App.jsx (routing, page rendering, global handlers)
- frontend/src/contexts/AuthContext.jsx
- frontend/src/stores/useAuthStore.js
- frontend/src/components/Login.jsx
- frontend/src/components/RegistrationPage.jsx
- frontend/src/components/ProfileSetupPage.jsx
- frontend/src/components/PendingApprovalScreen.jsx

## Core Libraries
- frontend/src/lib/supabase.js (525 lines — all Supabase functions)
- frontend/src/lib/trackActivity.js (82 lines — activity logging)
- frontend/src/lib/aiService.js (422 lines — 15 AI functions)
- frontend/src/lib/schemas.js (Zod validation)
- frontend/src/lib/auditLog.js (audit trail)
- frontend/src/lib/sm2.js (spaced repetition algorithm)
- frontend/src/lib/signedUrl.js (signed URLs)
- frontend/src/lib/offlineSync.js (IndexedDB + background sync)
- frontend/src/lib/tenantResolver.js (multi-tenant resolution)
- frontend/src/lib/sentry.js (HIPAA-safe monitoring)
- frontend/src/lib/chatbotConstants.js (hardcoded key issue)

## Zustand Stores
- frontend/src/stores/useAppStore.js
- frontend/src/stores/useAuthStore.js
- frontend/src/stores/useChatStore.js
- frontend/src/stores/useOfflineStore.js
- frontend/src/stores/useReaderStore.js
- frontend/src/stores/useTenantStore.js

## Doctor Dashboard (11 widgets)
- frontend/src/components/DoctorDashboard.jsx
- frontend/src/components/dashboard/MyActivitySection.jsx
- frontend/src/components/dashboard/CalendarGoalRow.jsx
- frontend/src/components/dashboard/ReadingBookmarksRow.jsx
- frontend/src/components/dashboard/MonthlyCalendar.jsx
- frontend/src/components/dashboard/GoalRing.jsx
- frontend/src/components/dashboard/ActivityDots.jsx
- frontend/src/components/dashboard/LatestAlerts.jsx
- frontend/src/components/dashboard/ForYouWidget.jsx
- frontend/src/components/dashboard/StudyPlanCard.jsx
- frontend/src/components/dashboard/WebinarLeaderboardRow.jsx
- frontend/src/components/dashboard/LatestContentSection.jsx

## Activity System
- frontend/src/components/ActivityPage.jsx
- frontend/src/components/Activity/ActivityHeatmapClickable.jsx
- frontend/src/components/Activity/DiaryPanel.jsx

## PDF / E-Books
- frontend/src/components/EBooksPage.jsx
- frontend/src/components/ebooks/PDFReaderView.jsx

## AI Features
- frontend/src/components/chatbot/ChatPanel.jsx
- frontend/src/components/chatbot/DoubtBusterPanel.jsx
- frontend/src/components/SmartNotesPanel.jsx
- frontend/src/components/CaseSimulator.jsx
- frontend/src/components/search/SemanticSearch.jsx
- frontend/src/components/ReadingQuizModal.jsx

## Study Plan
- frontend/src/components/StudyPlan/WeeklyPlanner.jsx
- frontend/src/components/StudyPlan/PersonaBuilder.jsx
- frontend/src/components/StudyPlan/ClinicalLogger.jsx
- frontend/src/components/StudyPlan/SpacedRepetition.jsx

## Exams & Quizzes
- frontend/src/components/ExamPage.jsx
- frontend/src/components/Exam/ExamManager.jsx
- frontend/src/components/Exam/QuestionEditor.jsx
- frontend/src/components/quiz/QuizBuilder.jsx
- frontend/src/components/quiz/QuizPlayer.jsx

## Arena
- frontend/src/components/arena/KahootScheduler.jsx
- frontend/src/components/arena/LiveArenaHost.jsx
- frontend/src/components/arena/LiveArenaStudent.jsx
- frontend/src/components/KahootPage.jsx

## Superadmin
- frontend/src/components/SADashboard.jsx
- frontend/src/components/sadashboard/AIInsightsTab.jsx
- frontend/src/components/sadashboard/ArtifactsTab.jsx
- frontend/src/components/sadashboard/DoctorApprovalsTab.jsx
- frontend/src/components/sadashboard/ManageAdminsTab.jsx
- frontend/src/components/sadashboard/ReportsTab.jsx
- frontend/src/components/sadashboard/WebinarCalendarTab.jsx
- frontend/src/components/MCIVerificationQueue.jsx

## Content Admin
- frontend/src/components/CADashboard.jsx

## Other Pages
- frontend/src/components/LeaderboardPage.jsx
- frontend/src/components/BroadcastPage.jsx
- frontend/src/components/MyPerformancePage.jsx
- frontend/src/components/Sidebar.jsx
- frontend/src/components/TopBar.jsx

## Edge Functions
- supabase/functions/submit-exam/index.ts
- supabase/functions/gemini-proxy/index.ts
- supabase/functions/generate-embeddings/index.ts
- supabase/functions/query-embedding/index.ts
- supabase/functions/send-approval-email/index.ts
- supabase/functions/send-notification-email/index.ts
- supabase/functions/welcome-email/index.ts
- supabase/functions/backfill-zones/index.ts
- supabase/functions/_shared/cors.ts

## Migrations
- All 23 files in supabase/migrations/

## Server (Express)
- server/CLAUDE.md (read, not audited in depth — Express is secondary)
