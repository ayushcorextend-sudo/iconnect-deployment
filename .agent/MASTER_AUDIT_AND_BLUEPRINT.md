# iConnect — Complete Audit Report & Master Blueprint
# ════════════════════════════════════════════════════════════════
# Generated: 2026-03-24 by Opus deep audit (full codebase)
# Purpose: Honest assessment + actionable fix plan for Sonnet
# READ-ONLY audit — no code was modified
# ════════════════════════════════════════════════════════════════

---

## ── THE HONEST VERDICT ──────────────────────────────────────────

**Your app is approximately 65% built.** The UI layer is 90% done — it looks
like a complete product. But the data layer is 40-50% connected. Many features
have beautiful frontends that silently fail because the database tables don't
exist, the functions write to nowhere, or the data never flows back to the
dashboard.

This is NOT unusual for AI-assisted development. Sonnet builds fast and
prioritizes the visible layer. But the result is a demo, not a product.

---

## ── COMPLETE STATUS MAP ─────────────────────────────────────────────

### ✅ FULLY WORKING (End-to-End)

| Feature | Files | Data Flow |
|---------|-------|-----------|
| Auth (OTP + Google + password) | Login.jsx, AuthContext.jsx, supabase.js | Real auth → profile → role routing |
| Registration (4-step + MCI) | RegistrationPage.jsx | Form → profiles table (status: pending) |
| Profile setup (OAuth users) | ProfileSetupPage.jsx | 3-step → profiles table |
| Pending approval screen | PendingApprovalScreen.jsx | Blocks login until SA approves |
| SA: Approve/reject doctors | DoctorApprovalsTab.jsx, MCIVerificationQueue.jsx | Updates profiles.status |
| SA: Manage admins | ManageAdminsTab.jsx | Updates profiles.role |
| SA: Reports + CSV export | ReportsTab.jsx | Real geo/speciality analytics |
| SA: Webinar scheduling | WebinarCalendarTab.jsx | CRUD → admin_webinars table |
| SA: Artifact approval | ArtifactsTab.jsx | Approve/reject + notifications |
| CA: Upload + manage content | CADashboard.jsx | Upload → storage → artifacts table |
| CA: Re-submit rejected | CADashboard.jsx | Status back to pending |
| Artifact browsing + search | EBooksPage.jsx | Filter, sort, search, bookmark toggle |
| PDF reader + page tracking | PDFReaderView.jsx | Signed URLs + user_content_state |
| Bookmarks (toggle + dashboard) | EBooksPage.jsx, ReadingBookmarksRow.jsx | user_content_state.is_bookmarked |
| Recent reads (dashboard) | ReadingBookmarksRow.jsx | user_content_state.current_page > 1 |
| Activity logging (11 types) | trackActivity.js | Batched inserts → activity_logs |
| 90-day activity heatmap | ActivityHeatmapClickable.jsx | Reads activity_logs, 5-level color |
| Exam taking | ExamPage.jsx | Load questions → answer → exam_attempts |
| Quiz creation + taking | QuizBuilder.jsx, QuizPlayer.jsx | CRUD → quizzes table + quiz_attempts |
| AI chat (Gemini proxy) | ChatBot.jsx, ChatPanel.jsx | gemini-proxy edge function |
| AI doubt resolution | DoubtBusterPanel.jsx | askDoubtBuster() → Gemini |
| AI smart notes (create + star) | SmartNotesPanel.jsx | Generate → smart_notes table |
| AI case simulator | CaseSimulator.jsx | getClinicalCase() → Gemini |
| AI reading quiz | ReadingQuizModal.jsx | generateReadingQuiz() → Gemini |
| AI semantic search | SemanticSearch.jsx | query-embedding edge function |
| AI weekly plan generation | WeeklyPlanner.jsx | generateContextualPlan() → Gemini |
| Spaced repetition (SM-2) | SpacedRepetition.jsx | Real flashcard data + algorithm |
| Arena: Schedule live quiz | KahootScheduler.jsx | live_arenas table + PIN gen |
| Arena: Host real-time | LiveArenaHost.jsx | Supabase Realtime + scoring |
| Arena: Student join + play | LiveArenaStudent.jsx | Real-time answers + leaderboard |
| Leaderboard (filters) | LeaderboardPage.jsx | user_scores + activity_logs |
| Sidebar (role-based nav) | Sidebar.jsx | Doctor / CA / SA menus |
| Mobile responsive (768px) | Sidebar.jsx, TopBar.jsx | Hamburger menu, slide-in |
| Error boundaries | AppErrorBoundary.jsx | Catches React errors |
| Sentry monitoring | sentry.js | HIPAA-safe, masks PII |
| PWA + offline sync | offlineSync.js, vite.config.js | IndexedDB queue + Workbox |
| Multi-tenancy | tenantResolver.js, useTenantStore.js | JWT → subdomain → default |
| Dark mode | TopBar.jsx, useAppStore | Toggle + persist |

### ❌ UI EXISTS BUT DATABASE TABLE IS MISSING (Silent Failures)

| Feature | Component | Missing Table | Impact |
|---------|-----------|---------------|--------|
| Daily diary / journal | DiaryPanel.jsx | `calendar_diary` | Diary saves go nowhere |
| Learning persona builder | PersonaBuilder.jsx | `user_study_persona` | Profile saves go nowhere |
| Clinical case logger | ClinicalLogger.jsx | `clinical_logs` | Case saves go nowhere |
| Weekly plan persistence | WeeklyPlanner.jsx | `study_plan_history` | AI plans lost on reload |
| PDF reader notes | EBooksPage.jsx → getNotes() | `user_notes` | Notes saves go nowhere |
| Admin calendar events | (queried in dashboard) | `admin_calendar_events` | Events never load |

### ⚠️ DATABASE EXISTS BUT LOGIC IS BROKEN

| Feature | What's Wrong | Impact |
|---------|-------------|--------|
| Scoring system | No score_rules table, no DB trigger. score_delta always = 0 | Leaderboard scores frozen at 0 |
| User scores aggregation | user_scores table exists, nothing updates it | Dashboard "My Score" = 0 |
| Exam security | ExamPage.jsx scores client-side, never calls submit-exam edge function | Scores can be manipulated |
| Duration tracking | activity_logs missing `duration_minutes` column, 3 components fallback to 30min | Study hours wildly inaccurate |
| Quiz → activity logging | QuizPlayer.jsx never calls trackActivity() | Quizzes don't appear in activity |
| Arena rejoin | LiveArenaStudent.jsx upsert resets score to 0 on rejoin | Students lose points |
| SA approval emails | SADashboard onApproveUser() doesn't send email (MCIVerificationQueue does) | Approved doctors never notified |
| Arena score aggregation | arena_answers stores is_correct but never updates arena_participants.score | Live scores unreliable |
| Embedding auto-trigger | generate-embeddings exists but never auto-called on artifact upload | Semantic search misses new content |
| Webinar reminders | user_reminders table exists, no dispatcher function | Reminders never sent |
| Quiz approval workflow | quizzes.status field exists, no SA/CA UI to approve/reject | Quizzes bypass review |

### 🔴 SECURITY ISSUES

| Issue | Location | Severity |
|-------|----------|----------|
| No server-side route guards | App.jsx renderPage() | HIGH — doctor can call setPage('reports') via devtools |
| Client-side exam scoring | ExamPage.jsx | HIGH — scores can be manipulated |
| OTP rate limit in localStorage | Login.jsx | MEDIUM — clear localStorage bypasses lockout |
| Hardcoded SUPABASE_ANON_KEY | chatbotConstants.js | MEDIUM — should use env var |
| No rate limiting on gemini-proxy | gemini-proxy/index.ts | MEDIUM — can be abused |
| Two parallel quiz systems | KahootPage.jsx vs arena/ | LOW — confusing, should unify |

### 📊 AI SERVICE: 15 FUNCTIONS, ONLY 6 USED

| Function | Used? | Called By |
|----------|-------|----------|
| getClinicalCase() | ✅ | CaseSimulator.jsx |
| askDoubtBuster() | ✅ | ChatBot.jsx |
| generateReadingQuiz() | ✅ | ReadingQuizModal.jsx |
| generateSmartNote() | ✅ | SmartNotesPanel.jsx |
| generateContextualPlan() | ✅ | WeeklyPlanner.jsx |
| (direct gemini-proxy calls) | ✅ | ChatPanel.jsx |
| explainQuestion() | ❌ | Nowhere |
| generateStudyPlan() | ❌ | Nowhere |
| auditContent() | ❌ | Nowhere |
| getPredictiveAlerts() | ❌ | AIInsightsTab (mock data) |
| analyzeKnowledgeGap() | ❌ | AIInsightsTab (mock data) |
| assessFatigueLevel() | ❌ | Nowhere |
| generateActiveRecallAudio() | ❌ | Nowhere |
| generateSpacedRepetitionCards() | ❌ | Nowhere |
| gradeSubjectiveAnswer() | ❌ | Nowhere |
| getPersonalizedSuggestions() | ❌ | Nowhere |

---

## ── PHASE 1: MAKE IT FUNCTIONAL ─────────────────────────────────────

### Fix in this exact sequence. Each step builds on the previous.

---

### STEP 1: Create 6 missing tables + 1 missing column

**Migration:** `supabase migration new missing_tables_and_columns`

```sql
-- ============================================================
-- STEP 1: Create all missing tables that frontend code queries
-- ============================================================

-- 1. calendar_diary (DiaryPanel.jsx, ActivityPage.jsx)
CREATE TABLE IF NOT EXISTS calendar_diary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  entries JSONB DEFAULT '[]'::jsonb,
  mood TEXT CHECK (mood IN ('great','good','okay','tired','stressed')),
  personal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 2. user_study_persona (PersonaBuilder.jsx, WeeklyPlanner.jsx)
CREATE TABLE IF NOT EXISTS user_study_persona (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  learning_style TEXT,
  study_hours_per_day INTEGER DEFAULT 4,
  preferred_subjects TEXT[] DEFAULT '{}',
  weak_areas TEXT[] DEFAULT '{}',
  strong_areas TEXT[] DEFAULT '{}',
  peak_hours TEXT,
  exam_date DATE,
  weekly_goal_hours INTEGER DEFAULT 20,
  goals TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. clinical_logs (ClinicalLogger.jsx)
CREATE TABLE IF NOT EXISTS clinical_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  case_title TEXT NOT NULL,
  presentation TEXT,
  diagnosis TEXT,
  learning_points TEXT,
  tags TEXT[] DEFAULT '{}',
  speciality TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. study_plan_history (WeeklyPlanner.jsx, StudyPlanCard.jsx)
CREATE TABLE IF NOT EXISTS study_plan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_tasks JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. user_notes (PDF reader notes — separate from AI smart_notes)
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER,
  note_content TEXT NOT NULL,
  highlight_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. idempotency_keys (submit-exam edge function)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Missing column on activity_logs
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;

-- ============================================================
-- RLS POLICIES (all user tables: own rows only + superadmin)
-- ============================================================

ALTER TABLE calendar_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_persona ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Pattern: user reads/writes own rows
-- Repeat for each table (calendar_diary, user_study_persona, clinical_logs,
-- study_plan_history, user_notes)

DO $$ BEGIN
  -- calendar_diary policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own diary' AND tablename = 'calendar_diary') THEN
    CREATE POLICY "Users read own diary" ON calendar_diary FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users write own diary' AND tablename = 'calendar_diary') THEN
    CREATE POLICY "Users write own diary" ON calendar_diary FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own diary' AND tablename = 'calendar_diary') THEN
    CREATE POLICY "Users update own diary" ON calendar_diary FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own diary' AND tablename = 'calendar_diary') THEN
    CREATE POLICY "Users delete own diary" ON calendar_diary FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- user_study_persona policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own persona' AND tablename = 'user_study_persona') THEN
    CREATE POLICY "Users read own persona" ON user_study_persona FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users write own persona' AND tablename = 'user_study_persona') THEN
    CREATE POLICY "Users write own persona" ON user_study_persona FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own persona' AND tablename = 'user_study_persona') THEN
    CREATE POLICY "Users update own persona" ON user_study_persona FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- clinical_logs policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own clinical logs' AND tablename = 'clinical_logs') THEN
    CREATE POLICY "Users read own clinical logs" ON clinical_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users write own clinical logs' AND tablename = 'clinical_logs') THEN
    CREATE POLICY "Users write own clinical logs" ON clinical_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own clinical logs' AND tablename = 'clinical_logs') THEN
    CREATE POLICY "Users delete own clinical logs" ON clinical_logs FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- study_plan_history policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own plans' AND tablename = 'study_plan_history') THEN
    CREATE POLICY "Users read own plans" ON study_plan_history FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users write own plans' AND tablename = 'study_plan_history') THEN
    CREATE POLICY "Users write own plans" ON study_plan_history FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own plans' AND tablename = 'study_plan_history') THEN
    CREATE POLICY "Users update own plans" ON study_plan_history FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- user_notes policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own notes' AND tablename = 'user_notes') THEN
    CREATE POLICY "Users read own notes" ON user_notes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users write own notes' AND tablename = 'user_notes') THEN
    CREATE POLICY "Users write own notes" ON user_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own notes' AND tablename = 'user_notes') THEN
    CREATE POLICY "Users update own notes" ON user_notes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own notes' AND tablename = 'user_notes') THEN
    CREATE POLICY "Users delete own notes" ON user_notes FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- idempotency_keys: service role only (edge functions)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role only idempotency' AND tablename = 'idempotency_keys') THEN
    CREATE POLICY "Service role only idempotency" ON idempotency_keys FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_diary_user_date ON calendar_diary(user_id, date);
CREATE INDEX IF NOT EXISTS idx_clinical_logs_user ON clinical_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_plan_user_week ON study_plan_history(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_artifact ON user_notes(user_id, artifact_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(key);
```

**After running:** `supabase db push` then `supabase gen types typescript --local > frontend/src/lib/database.types.ts`

---

### STEP 2: Create scoring system (score_rules + trigger)

**Migration:** `supabase migration new scoring_system`

```sql
-- ============================================================
-- Scoring system: auto-calculate score_delta + update user_scores
-- ============================================================

-- Score rules lookup table
CREATE TABLE IF NOT EXISTS score_rules (
  activity_type TEXT PRIMARY KEY,
  points INTEGER NOT NULL,
  description TEXT
);

-- Seed point values
INSERT INTO score_rules (activity_type, points, description) VALUES
  ('daily_login', 5, 'Daily login bonus'),
  ('article_read', 10, 'Read an article or book'),
  ('quiz_complete', 20, 'Completed a quiz'),
  ('quiz_passed', 30, 'Passed a quiz'),
  ('quiz_attempted', 5, 'Attempted but did not pass quiz'),
  ('exam_set_completed', 50, 'Completed an exam set'),
  ('study_plan_completed', 15, 'Completed a study plan task'),
  ('spaced_rep_reviewed', 10, 'Reviewed spaced repetition cards'),
  ('clinical_case_logged', 20, 'Logged a clinical case'),
  ('diary_entry', 5, 'Wrote a diary entry'),
  ('webinar_attended', 25, 'Attended a webinar or live quiz'),
  ('arena_completed', 30, 'Completed a live arena quiz'),
  ('note_created', 5, 'Created a study note'),
  ('smart_note_created', 10, 'Generated an AI smart note')
ON CONFLICT (activity_type) DO NOTHING;

-- Trigger function: on activity_logs INSERT, set score_delta + update user_scores
CREATE OR REPLACE FUNCTION fn_calculate_score_delta()
RETURNS TRIGGER AS $$
DECLARE
  pts INTEGER;
BEGIN
  SELECT points INTO pts FROM score_rules WHERE activity_type = NEW.activity_type;
  IF pts IS NOT NULL THEN
    NEW.score_delta := pts;
    -- Upsert user_scores
    INSERT INTO user_scores (user_id, total_score, updated_at)
    VALUES (NEW.user_id, pts, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_score = user_scores.total_score + pts,
      updated_at = now();
  ELSE
    NEW.score_delta := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_score_delta ON activity_logs;
CREATE TRIGGER trg_score_delta
  BEFORE INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION fn_calculate_score_delta();
```

**What this fixes:** Leaderboard now shows real scores. Dashboard "My Score" updates. Every activity earns points automatically.

---

### STEP 3: Add server-side route guards

**File:** `frontend/src/App.jsx` — in `renderPage()` function

```
Current (BROKEN):
  Routes are protected only by sidebar UI hiding menu items.
  A doctor can call setPage('reports') via devtools and access superadmin pages.

Fix:
  At the top of renderPage(), add role validation:

  const ROLE_PAGES = {
    doctor: ['dashboard','ebooks','exams','studyplan','activity','leaderboard',
             'arena','broadcast','flashcards','search','performance'],
    contentadmin: ['ca-dashboard','upload','ca-manage'],
    superadmin: ['sa-dashboard','reports','manage-admins','approvals',
                 'webinar-calendar','ai-insights','user-management']
  };

  If currentPage is not in ROLE_PAGES[userRole], redirect to role's default page.
  This is a 10-line fix that closes the biggest security hole.
```

---

### STEP 4: Fix SA approval emails

**File:** `frontend/src/App.jsx` — `onApproveUser()` and `onRejectUser()` functions

```
Current (BROKEN):
  MCIVerificationQueue.jsx sends approval/rejection emails correctly.
  But SADashboard's onApproveUser() / onRejectUser() do NOT send emails.
  Doctors approved via the main approval tab are never notified.

Fix:
  After updating profiles.status in onApproveUser(), add:
    await supabase.functions.invoke('send-approval-email', {
      body: { email: user.email, name: user.full_name, status: 'approved' }
    });

  Same pattern for onRejectUser() with status: 'rejected'.
  Copy the exact pattern from MCIVerificationQueue.jsx lines 88-94.
```

---

### STEP 5: Wire ExamPage to submit-exam edge function

**File:** `frontend/src/components/ExamPage.jsx`

```
Current (SECURITY HOLE):
  Client calculates score in browser
  Client inserts directly to exam_attempts
  Anyone can manipulate answers/score via devtools

Fix:
  Replace handleSubmit() to:
  1. Collect answers array: [{question_id, selected_option}]
  2. Call: supabase.functions.invoke('submit-exam', {
       body: { exam_id, answers, idempotency_key: crypto.randomUUID() }
     })
  3. Edge function validates answers server-side, returns { score, passed, results }
  4. Display results from response (not client calculation)
  5. Remove all client-side scoring logic
```

---

### STEP 6: Fix arena rejoin score reset bug

**File:** `frontend/src/components/arena/LiveArenaStudent.jsx`

```
Current (BUG):
  Line ~50: upsert on arena_participants sets score = 0
  If student's connection drops and they rejoin, score resets to 0

Fix:
  Change upsert to: INSERT ... ON CONFLICT (arena_id, user_id)
  DO UPDATE SET display_name = EXCLUDED.display_name
  (never overwrite score on rejoin)

  OR: Use a separate join check — if already exists, just reconnect.
```

---

### STEP 7: Fix DiaryPanel + PersonaBuilder + ClinicalLogger + WeeklyPlanner

**After Step 1 creates the tables, verify these components actually work:**

```
Files to test:
1. Activity/DiaryPanel.jsx — open, write entry, save, reload, check data persists
2. StudyPlan/PersonaBuilder.jsx — fill form, save, reload, check data persists
3. StudyPlan/ClinicalLogger.jsx — log case, save, reload, check data persists
4. StudyPlan/WeeklyPlanner.jsx — generate plan, check saved to study_plan_history

For WeeklyPlanner specifically:
- On "Generate Plan" → save to study_plan_history with is_active=true
- Deactivate any previous active plan for this user
- Task completion: update completed_tasks JSONB array
- Dashboard StudyPlanCard should load from study_plan_history FIRST
- Only generate via AI if no active plan for current week
- Tasks must be editable (add/remove/modify)
- Completed tasks show strikethrough/checkmark
```

---

### STEP 8: Wire QuizPlayer to trackActivity

**File:** `frontend/src/components/quiz/QuizPlayer.jsx`

```
Current: Saves to quiz_attempts but never calls trackActivity()
Quizzes never appear in activity heatmap or earn points.

Fix: After quiz submission result:
  import { trackActivity } from '../lib/trackActivity';
  trackActivity('quiz_complete', quizId);
  if (passed) trackActivity('quiz_passed', quizId);
```

---

### STEP 9: Add duration tracking

**File:** `frontend/src/lib/trackActivity.js`

```
Current: No duration tracking. 3 dashboard components fallback to 30min per activity.

Fix — add timer utilities:

  const timers = {};
  export function startTimer(activityType, referenceId) {
    timers[`${activityType}_${referenceId}`] = Date.now();
  }
  export function stopTimer(activityType, referenceId) {
    const key = `${activityType}_${referenceId}`;
    const start = timers[key];
    if (start) {
      const minutes = Math.round((Date.now() - start) / 60000);
      delete timers[key];
      return minutes;
    }
    return 0;
  }

Then update trackActivity() to accept optional duration_minutes parameter.

Call sites:
- EBooksPage: startTimer('article_read', artifactId) on open, stopTimer on close
- ExamPage: startTimer('exam', examId) on start, stopTimer on submit
- SpacedRepetition: startTimer on start, stopTimer on finish
- QuizPlayer: startTimer on start, stopTimer on complete
```

---

### STEP 10: Enhance calendar date-click detail view

**Files:**
- `frontend/src/components/dashboard/MonthlyCalendar.jsx`
- NEW: `frontend/src/components/dashboard/DayDetailPanel.jsx`

```
Current: Calendar shows dots. Clicking opens DiaryPanel only (which fails due to missing table).

Build DayDetailPanel.jsx — when user clicks a date:
1. Query activity_logs WHERE date(created_at) = selected_date AND user_id = auth.uid()
2. Query calendar_diary WHERE date = selected_date AND user_id = auth.uid()
3. Query user_content_state for books read that day (join with artifacts for titles)
4. Query exam_attempts / quiz_attempts for that day

Display in an expandable panel:
- Timeline of activities with timestamps
- Total study time (sum of duration_minutes)
- Points earned that day (sum of score_delta)
- Books read (titles + pages)
- Quizzes/exams taken (scores)
- Diary entry (editable — save to calendar_diary)
- "Add journal note" button

MonthlyCalendar: on date click → toggle DayDetailPanel with selected date
```

---

### STEP 11: Fix webinar save/interested across site

```
Current: admin_webinars table has webinars. No "save" or "I'm interested" button.

Fix:
1. Create webinar_registrations table if not exists:
   (id, user_id, webinar_id, registered_at)
   With RLS: user reads/writes own rows

2. Add "Save / Interested" toggle button to webinar cards in:
   - dashboard/WebinarLeaderboardRow.jsx
   - BroadcastPage.jsx (if webinars shown there)

3. On click: INSERT INTO webinar_registrations (user_id, webinar_id)
4. On un-click: DELETE FROM webinar_registrations WHERE user_id AND webinar_id

5. Dashboard: Add "My Saved Webinars" section showing registered webinars
```

---

### STEP 12: Fix embedding auto-generation

```
Current: generate-embeddings edge function works but never auto-triggered.
New content uploaded by CA has no embeddings → semantic search misses it.

Fix option A (recommended): Add a webhook/trigger
- After SA approves artifact (ArtifactsTab.jsx onApprove),
  call: supabase.functions.invoke('generate-embeddings', { body: { artifact_id } })

Fix option B: Add "Generate Embeddings" button in SA ArtifactsTab
- Manual trigger per artifact

Either way, semantic search only works for content WITH embeddings.
```

---

### STEP 13: Remove hardcoded SUPABASE_ANON_KEY

**File:** `frontend/src/lib/chatbotConstants.js`

```
Current: SUPABASE_ANON_KEY is hardcoded as a string literal in the source.

Fix: Replace with:
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

---

### STEP 14: Fix AIInsightsTab mock data

**File:** `frontend/src/components/sadashboard/AIInsightsTab.jsx`

```
Current: Uses hardcoded mock data (avgScore: 0, topSubject: 'Internal Medicine').
Creates fake subject scores with random percentages.

Fix:
- Query real data: activity_logs grouped by activity_type for last 30 days
- Query real data: quiz_attempts/exam_attempts for average scores
- Query real data: user_content_state for most-read subjects
- Feed REAL data to getPredictiveAlerts() and analyzeKnowledgeGap()
- Remove all Math.random() and hardcoded values
```

---

### STEP 15: Deprecate KahootPage.jsx

```
Current: Two parallel quiz systems:
1. KahootPage.jsx → opens external kahoot.it link (legacy)
2. arena/ → custom real-time quiz system (working)

Fix:
- Remove KahootPage.jsx from sidebar navigation
- Route "Live Quiz" to arena/ system instead
- Keep KahootPage.jsx file as .bak if needed for reference
```

---

### STEP 16: Add leaderboard cache TTL

**File:** `frontend/src/components/LeaderboardPage.jsx`

```
Current: Leaderboard data cached indefinitely. Stale scores shown.

Fix: Add 5-minute TTL to cached data.
  Store lastFetchTime alongside data.
  On mount, if (now - lastFetchTime > 5 * 60 * 1000) refetch.
```

---

## ── DEPLOYMENT CHECKLIST ─────────────────────────────────────────────

After all 16 steps:

1. [ ] Run migrations: `supabase db push`
2. [ ] Regenerate types: `supabase gen types typescript --local > frontend/src/lib/database.types.ts`
3. [ ] Deploy edge functions: `supabase functions deploy submit-exam`
4. [ ] Build: `cd frontend && npm run build` (ZERO errors, ZERO warnings)
5. [ ] Test every feature with real user account:
   - [ ] Register new doctor → pending screen → SA approves → EMAIL received → login works
   - [ ] Open a book → dashboard shows in recent reads
   - [ ] Bookmark a book → dashboard shows bookmark
   - [ ] Take a quiz → activity logged → points earned → leaderboard updates
   - [ ] Take an exam → server-side scoring → score shows correctly
   - [ ] Open calendar → click a date → see full day activity breakdown
   - [ ] Write diary entry → save → reload → still there
   - [ ] Fill PersonaBuilder → save → reload → data persists
   - [ ] Log clinical case → save → reload → data persists
   - [ ] Generate weekly plan → tasks editable → mark complete → persists
   - [ ] Check heatmap reflects real activity with correct intensity
   - [ ] Check leaderboard scores update after activities
   - [ ] Join arena → answer questions → score doesn't reset on reconnect
   - [ ] SA approval → doctor receives email notification
   - [ ] Save webinar as interested → shows in saved section
   - [ ] Check semantic search returns results for new content
   - [ ] Check devtools can't access SA pages as doctor
6. [ ] Deploy: `git push` (auto-deploy to Vercel)

---

## ── PHASE 2 PREVIEW: ORCHESTRATION SYSTEM ────────────────────────────

NOT for now. After Phase 1 is deployed and working:

1. `.agent/next-actions.md` — prioritized task backlog with scoped instructions
2. Cowork skill "plan-session" — reads handoff + next-actions + architecture → Sonnet-ready prompt
3. Cowork skill "review-session" — git diff → check against CLAUDE.md rules → flag violations
4. Weekly planning rhythm — Opus reviews architecture weekly → prioritized next-actions.md
5. Token budgeting — morning (Opus planning), afternoon (Sonnet execution), evening (handoff)
6. supabase.js split into modules (auth, artifacts, contentState, notes, exam, activity)

---

## ── FULL FILES AUDITED ──────────────────────────────────────────────────

```
Root config:
  CLAUDE.md, frontend/CLAUDE.md, supabase/CLAUDE.md, server/CLAUDE.md
  .agent/architecture.md, .agent/handoff.md
  scripts/iconnect_aliases.sh

Auth:
  frontend/src/components/Login.jsx
  frontend/src/components/RegistrationPage.jsx
  frontend/src/components/ProfileSetupPage.jsx
  frontend/src/components/PendingApprovalScreen.jsx
  frontend/src/contexts/AuthContext.jsx
  frontend/src/stores/useAuthStore.js

Core Libraries:
  frontend/src/lib/supabase.js (525 lines)
  frontend/src/lib/trackActivity.js
  frontend/src/lib/aiService.js (422 lines)
  frontend/src/lib/schemas.js
  frontend/src/lib/auditLog.js
  frontend/src/lib/sm2.js
  frontend/src/lib/signedUrl.js
  frontend/src/lib/offlineSync.js
  frontend/src/lib/tenantResolver.js
  frontend/src/lib/sentry.js
  frontend/src/lib/chatbotConstants.js

Doctor Dashboard:
  frontend/src/components/DoctorDashboard.jsx
  frontend/src/components/dashboard/MyActivitySection.jsx
  frontend/src/components/dashboard/CalendarGoalRow.jsx
  frontend/src/components/dashboard/ReadingBookmarksRow.jsx
  frontend/src/components/dashboard/MonthlyCalendar.jsx
  frontend/src/components/dashboard/GoalRing.jsx
  frontend/src/components/dashboard/ActivityDots.jsx
  frontend/src/components/dashboard/LatestAlerts.jsx
  frontend/src/components/dashboard/ForYouWidget.jsx
  frontend/src/components/dashboard/StudyPlanCard.jsx
  frontend/src/components/dashboard/WebinarLeaderboardRow.jsx
  frontend/src/components/dashboard/LatestContentSection.jsx

Activity:
  frontend/src/components/ActivityPage.jsx
  frontend/src/components/Activity/ActivityHeatmapClickable.jsx
  frontend/src/components/Activity/DiaryPanel.jsx

PDF/E-Books:
  frontend/src/components/EBooksPage.jsx
  frontend/src/components/ebooks/PDFReaderView.jsx
  frontend/src/stores/useReaderStore.js

AI Features:
  frontend/src/components/chatbot/ChatPanel.jsx
  frontend/src/components/chatbot/DoubtBusterPanel.jsx
  frontend/src/components/SmartNotesPanel.jsx
  frontend/src/components/CaseSimulator.jsx
  frontend/src/components/search/SemanticSearch.jsx

Study Plan:
  frontend/src/components/StudyPlan/WeeklyPlanner.jsx
  frontend/src/components/StudyPlan/PersonaBuilder.jsx
  frontend/src/components/StudyPlan/ClinicalLogger.jsx
  frontend/src/components/StudyPlan/SpacedRepetition.jsx

Exams & Quizzes:
  frontend/src/components/ExamPage.jsx
  frontend/src/components/Exam/ExamManager.jsx
  frontend/src/components/Exam/QuestionEditor.jsx
  frontend/src/components/quiz/QuizBuilder.jsx
  frontend/src/components/quiz/QuizPlayer.jsx

Arena:
  frontend/src/components/arena/KahootScheduler.jsx
  frontend/src/components/arena/LiveArenaHost.jsx
  frontend/src/components/arena/LiveArenaStudent.jsx
  frontend/src/components/KahootPage.jsx

Admin Dashboards:
  frontend/src/components/SADashboard.jsx
  frontend/src/components/sadashboard/AIInsightsTab.jsx
  frontend/src/components/sadashboard/ArtifactsTab.jsx
  frontend/src/components/sadashboard/DoctorApprovalsTab.jsx
  frontend/src/components/sadashboard/ManageAdminsTab.jsx
  frontend/src/components/sadashboard/ReportsTab.jsx
  frontend/src/components/sadashboard/WebinarCalendarTab.jsx
  frontend/src/components/CADashboard.jsx
  frontend/src/components/MCIVerificationQueue.jsx

Other:
  frontend/src/components/LeaderboardPage.jsx
  frontend/src/components/BroadcastPage.jsx
  frontend/src/components/Sidebar.jsx
  frontend/src/components/TopBar.jsx
  frontend/src/App.jsx

Infrastructure:
  frontend/src/stores/useAppStore.js
  frontend/src/stores/useOfflineStore.js
  frontend/src/stores/useTenantStore.js
  frontend/src/stores/useChatStore.js

Edge Functions:
  supabase/functions/submit-exam/index.ts
  supabase/functions/gemini-proxy/index.ts
  supabase/functions/generate-embeddings/index.ts
  supabase/functions/query-embedding/index.ts
  supabase/functions/send-approval-email/index.ts
  supabase/functions/send-notification-email/index.ts
  supabase/functions/welcome-email/index.ts
  supabase/functions/backfill-zones/index.ts

Migrations:
  supabase/migrations/* (all 23 files)
```
