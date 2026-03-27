# ╔════════════════════════════════════════════════════════════════════════════╗
# ║            iConnect — MASTER EXECUTION PROMPT FOR SONNET                 ║
# ║                                                                          ║
# ║   Author: Claude Opus (Principal Architect)                              ║
# ║   Date: 2026-03-24                                                       ║
# ║   Version: FINAL                                                         ║
# ║                                                                          ║
# ║   This document is your ONLY source of truth.                            ║
# ║   Execute phases sequentially. Do not skip. Do not improvise.            ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GLOBAL RULES — APPLY TO EVERY PHASE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## IDENTITY

You are a Senior Developer executing a pre-planned engineering sprint on
"iConnect," a medical education SaaS for Indian doctors.

Stack: React 19 + Vite 7 + Tailwind 3 + Zustand 5 + Supabase (PostgreSQL 17
+ RLS + Edge Functions) + Vercel.

Three user roles: superadmin → contentadmin → doctor.

## MANDATORY CONSTRAINTS

1. READ BEFORE WRITE: Before editing ANY file, read it first. Never write
   blind. Read only the sections you need — do not scan the full project.

2. SCOPED FILE ACCESS: Only touch files listed in the current phase.
   If you need to touch a file not listed, state why and ask for confirmation.

3. NO EMPTY CATCH BLOCKS: Every catch must either:
   - Log to Sentry: `Sentry.captureException(err)`
   - Show user feedback: `addToast({ type: 'error', message: '...' })`
   - Throw to parent: `throw err`
   NEVER write `catch (e) {}` or `catch (e) { console.log(e) }` alone.

4. NO SWALLOWED ERRORS: If a Supabase query returns `{ error }`, handle it:
   ```javascript
   const { data, error } = await supabase.from('table').select('*');
   if (error) throw new Error(`Failed to load table: ${error.message}`);
   ```

5. LOADING + ERROR STATES: Every async operation in a component MUST show:
   - Loading: skeleton/spinner while fetching
   - Error: user-visible message if fetch fails
   - Empty: helpful message when data is empty (not just blank space)

6. ALL SUPABASE QUERIES go through `frontend/src/lib/supabase.js` only.
   NEVER write raw `supabase.from()` inside components or stores.
   If a function doesn't exist in supabase.js, ADD it there first.

7. DESIGN TOKENS: Use `frontend/src/styles/tokens.js` for colors/spacing.
   Use `frontend/src/styles/zIndex.js` for z-index values.
   NEVER use arbitrary Tailwind values (e.g., `w-[347px]`).

8. MIGRATION RULES: All migrations via `supabase migration new name`.
   All statements must use `IF NOT EXISTS` / `IF EXISTS` guards.
   All RLS policies wrapped in `DO $$ BEGIN IF NOT EXISTS... END $$` blocks.

9. NO PII IN LOGS: Never console.log user objects, profiles, sessions, emails,
   or MCI numbers. Use Sentry for structured error reporting.

10. AFTER EVERY PHASE: Run `cd frontend && npm run build`. If there are errors
    or warnings, fix them before reporting phase complete. Zero tolerance.

## EXECUTION PROTOCOL

- You have FULL PERMISSION to create files, edit files, run migrations,
  install packages, and deploy edge functions.
- You do NOT need to ask for permission for any technical action within a phase.
- The ONLY time you pause is between phases: say "PHASE X COMPLETE" and wait
  for the user to say "next" before proceeding.
- If you encounter an ambiguity not covered by this document, make the
  conservative choice (the one less likely to break existing features).

## VERIFICATION GATES

Each phase ends with a verification checklist. You MUST confirm each item
passes before declaring the phase complete. If an item fails, fix it within
the same phase — do not defer to the next phase.


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
#  P H A S E   1 :   D A T A B A S E   F O U N D A T I O N
#
#  Create all missing tables, scoring system, and fix schema gaps.
#  This is the foundation — everything else depends on this.
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FILES TO READ FIRST (and ONLY these):
- `supabase/CLAUDE.md` — migration rules
- `supabase/migrations/` — list existing migrations to find last timestamp
- `frontend/src/lib/supabase.js` — lines 1-30 only (imports + client init)

## TASK 1A: Create Missing Tables Migration

Run: `cd /path/to/project && supabase migration new missing_tables_and_columns`

Write this SQL into the generated migration file:

```sql
-- ============================================================
-- Migration: Create 6 missing tables + 1 missing column
-- These tables are queried by frontend components but never existed.
-- Author: Opus Architecture Blueprint
-- ============================================================

-- 1. calendar_diary — DiaryPanel.jsx, ActivityPage.jsx
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

-- 2. user_study_persona — PersonaBuilder.jsx, WeeklyPlanner.jsx
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

-- 3. clinical_logs — ClinicalLogger.jsx
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

-- 4. study_plan_history — WeeklyPlanner.jsx, StudyPlanCard.jsx
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

-- 5. user_notes — supabase.js getNotes/saveNote/deleteNote
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artifact_id UUID NOT NULL,
  page_number INTEGER,
  note_content TEXT NOT NULL,
  highlight_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. idempotency_keys — submit-exam edge function
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
-- RLS POLICIES
-- ============================================================

ALTER TABLE calendar_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_persona ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- calendar_diary
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users read own diary' AND tablename='calendar_diary') THEN
    CREATE POLICY "Users read own diary" ON calendar_diary FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users write own diary' AND tablename='calendar_diary') THEN
    CREATE POLICY "Users write own diary" ON calendar_diary FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users update own diary' AND tablename='calendar_diary') THEN
    CREATE POLICY "Users update own diary" ON calendar_diary FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users delete own diary' AND tablename='calendar_diary') THEN
    CREATE POLICY "Users delete own diary" ON calendar_diary FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- user_study_persona
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users read own persona' AND tablename='user_study_persona') THEN
    CREATE POLICY "Users read own persona" ON user_study_persona FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users write own persona' AND tablename='user_study_persona') THEN
    CREATE POLICY "Users write own persona" ON user_study_persona FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users update own persona' AND tablename='user_study_persona') THEN
    CREATE POLICY "Users update own persona" ON user_study_persona FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- clinical_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users read own clinical logs' AND tablename='clinical_logs') THEN
    CREATE POLICY "Users read own clinical logs" ON clinical_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users write own clinical logs' AND tablename='clinical_logs') THEN
    CREATE POLICY "Users write own clinical logs" ON clinical_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users delete own clinical logs' AND tablename='clinical_logs') THEN
    CREATE POLICY "Users delete own clinical logs" ON clinical_logs FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- study_plan_history
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users read own plans' AND tablename='study_plan_history') THEN
    CREATE POLICY "Users read own plans" ON study_plan_history FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users write own plans' AND tablename='study_plan_history') THEN
    CREATE POLICY "Users write own plans" ON study_plan_history FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users update own plans' AND tablename='study_plan_history') THEN
    CREATE POLICY "Users update own plans" ON study_plan_history FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- user_notes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users read own notes' AND tablename='user_notes') THEN
    CREATE POLICY "Users read own notes" ON user_notes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users write own notes' AND tablename='user_notes') THEN
    CREATE POLICY "Users write own notes" ON user_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users update own notes' AND tablename='user_notes') THEN
    CREATE POLICY "Users update own notes" ON user_notes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users delete own notes' AND tablename='user_notes') THEN
    CREATE POLICY "Users delete own notes" ON user_notes FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- idempotency_keys (service role only)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Service role idempotency' AND tablename='idempotency_keys') THEN
    CREATE POLICY "Service role idempotency" ON idempotency_keys FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_calendar_diary_user_date ON calendar_diary(user_id, date);
CREATE INDEX IF NOT EXISTS idx_clinical_logs_user ON clinical_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_plan_user_week ON study_plan_history(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_artifact ON user_notes(user_id, artifact_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(key);
```

## TASK 1B: Create Scoring System Migration

Run: `supabase migration new scoring_system`

```sql
-- ============================================================
-- Migration: Scoring system — score_rules + trigger + user_scores fix
-- ============================================================

-- Ensure user_scores has UNIQUE on user_id (needed for upsert)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_scores_user_id_unique'
  ) THEN
    ALTER TABLE user_scores ADD CONSTRAINT user_scores_user_id_unique UNIQUE (user_id);
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- user_scores doesn't exist, create it
  CREATE TABLE user_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    total_score INTEGER DEFAULT 0,
    quiz_score INTEGER DEFAULT 0,
    reading_score INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users read all scores" ON user_scores FOR SELECT USING (true);
  CREATE POLICY "System writes scores" ON user_scores FOR ALL USING (auth.role() = 'service_role' OR auth.uid() = user_id);
END $$;

-- Score rules lookup
CREATE TABLE IF NOT EXISTS score_rules (
  activity_type TEXT PRIMARY KEY,
  points INTEGER NOT NULL,
  description TEXT
);

INSERT INTO score_rules (activity_type, points, description) VALUES
  ('daily_login', 5, 'Daily login bonus'),
  ('article_read', 10, 'Read an article or book'),
  ('quiz_complete', 20, 'Completed a quiz'),
  ('quiz_passed', 30, 'Passed a quiz'),
  ('quiz_attempted', 5, 'Attempted quiz'),
  ('exam_set_completed', 50, 'Completed an exam set'),
  ('study_plan_completed', 15, 'Completed study plan task'),
  ('spaced_rep_reviewed', 10, 'Reviewed spaced repetition'),
  ('clinical_case_logged', 20, 'Logged clinical case'),
  ('diary_entry', 5, 'Wrote diary entry'),
  ('webinar_attended', 25, 'Attended webinar'),
  ('arena_completed', 30, 'Completed live arena'),
  ('note_created', 5, 'Created study note'),
  ('smart_note_created', 10, 'Generated AI smart note')
ON CONFLICT (activity_type) DO NOTHING;

-- Trigger: auto-populate score_delta + update user_scores
CREATE OR REPLACE FUNCTION fn_calculate_score_delta()
RETURNS TRIGGER AS $$
DECLARE
  pts INTEGER;
BEGIN
  SELECT points INTO pts FROM score_rules WHERE activity_type = NEW.activity_type;
  IF pts IS NOT NULL THEN
    NEW.score_delta := pts;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_score_delta ON activity_logs;
CREATE TRIGGER trg_score_delta
  BEFORE INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION fn_calculate_score_delta();
```

## TASK 1C: Push and Verify

```bash
supabase db push
supabase gen types typescript --local > frontend/src/lib/database.types.ts
```

## PHASE 1 VERIFICATION GATE:
- [ ] `supabase db push` exits with zero errors
- [ ] All 6 new tables visible in Supabase Studio (or via `supabase db list`)
- [ ] score_rules has 14 rows
- [ ] Manually INSERT a test activity_log row → verify score_delta is auto-populated
- [ ] Manually check user_scores was upserted
- [ ] database.types.ts regenerated and contains new table types
- [ ] `cd frontend && npm run build` → zero errors

**Say "PHASE 1 COMPLETE" and wait for "next".**


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
#  P H A S E   2 :   S E C U R I T Y   H A R D E N I N G
#
#  Close the 3 highest-severity security holes before touching features.
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FILES TO READ:
- `frontend/src/App.jsx` — renderPage() function only
- `frontend/src/components/ExamPage.jsx` — handleSubmit() function only
- `supabase/functions/submit-exam/index.ts` — read fully
- `frontend/src/lib/chatbotConstants.js` — read fully

## TASK 2A: Server-Side Route Guards

File: `frontend/src/App.jsx`

Find the `renderPage()` function. At the very top of it, BEFORE the switch
statement, add role-based page access validation:

```javascript
const ROLE_PAGES = {
  doctor: [
    'dashboard','ebooks','exams','studyplan','activity','leaderboard',
    'arena','broadcast','flashcards','search','performance',
    'smart-notes','case-simulator','doubt-buster','chat'
  ],
  contentadmin: [
    'ca-dashboard','upload','ca-manage','ca-notifications'
  ],
  superadmin: [
    'sa-dashboard','reports','manage-admins','approvals',
    'webinar-calendar','ai-insights','user-management',
    'mci-verification','artifacts','arena-scheduler'
  ]
};

// At top of renderPage():
const allowedPages = ROLE_PAGES[authRole] || ROLE_PAGES[role] || [];
if (currentPage && !allowedPages.includes(currentPage)) {
  const defaultPage = (authRole || role) === 'superadmin' ? 'sa-dashboard'
    : (authRole || role) === 'contentadmin' ? 'ca-dashboard' : 'dashboard';
  setPage(defaultPage);
  return null;
}
```

IMPORTANT: Read App.jsx first to find the exact variable names for role and
currentPage. They may be named differently. Adapt the code to match.

## TASK 2B: Wire ExamPage to submit-exam Edge Function

File: `frontend/src/components/ExamPage.jsx`

1. Read the file. Find `handleSubmit()` or equivalent submission handler.
2. REMOVE all client-side score calculation logic.
3. REPLACE with edge function call:

```javascript
const handleSubmit = async () => {
  setSubmitting(true);
  try {
    const { data, error } = await supabase.functions.invoke('submit-exam', {
      body: {
        exam_id: currentExam.id,
        answers: userAnswers.map(a => ({
          question_id: a.questionId,
          selected_option: a.selectedOption
        })),
        idempotency_key: crypto.randomUUID()
      }
    });
    if (error) throw error;
    // Display results from server
    setResults(data);
    // Track activity
    trackActivity('exam_set_completed', currentExam.id);
  } catch (err) {
    Sentry.captureException(err);
    addToast({ type: 'error', message: 'Failed to submit exam. Please try again.' });
  } finally {
    setSubmitting(false);
  }
};
```

IMPORTANT: Read submit-exam/index.ts FIRST to match the exact request body
format it expects. The code above is a template — adapt field names to match.

## TASK 2C: Fix Hardcoded Supabase Key

File: `frontend/src/lib/chatbotConstants.js`

Find any hardcoded Supabase anon key string. Replace with:
```javascript
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

## PHASE 2 VERIFICATION GATE:
- [ ] Login as doctor → open devtools → run `useAppStore.getState().setPage('reports')` → page redirects back to 'dashboard'
- [ ] Login as doctor → take exam → score comes from edge function response (not client calculation)
- [ ] `npm run build` → zero errors
- [ ] chatbotConstants.js has no hardcoded key strings

**Say "PHASE 2 COMPLETE" and wait for "next".**


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
#  P H A S E   3 :   P E R F O R M A N C E   O V E R H A U L
#
#  Fix the LAG. Parallelize queries, add code splitting, fix memory leaks,
#  scope Zustand selectors.
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FILES TO READ:
- `frontend/src/App.jsx` — imports section + renderPage()
- `frontend/src/components/DoctorDashboard.jsx` — the `load()` / data fetching function
- `frontend/src/components/ActivityPage.jsx` — data fetching section
- `frontend/src/components/LeaderboardPage.jsx` — data fetching section
- `frontend/src/lib/trackActivity.js` — full file
- `frontend/vite.config.js` — full file

## TASK 3A: Parallelize DoctorDashboard Queries

File: `frontend/src/components/DoctorDashboard.jsx`

Find the main data loading function (likely called `load()` or in a `useEffect`).
It currently makes 8-10 SEQUENTIAL `await` calls. This is why the dashboard
takes 5-10 seconds to load.

REWRITE to use Promise.all for independent queries:

```javascript
const load = async () => {
  if (!uid) return;
  setLoading(true);
  try {
    const [profileRes, contentRes, scoresRes, activityRes, artifactsRes, webinarRes] =
      await Promise.all([
        supabase.from('profiles').select('speciality,college').eq('id', uid).maybeSingle(),
        getUserContentStates(uid),
        supabase.from('user_scores').select('total_score,quiz_score,reading_score')
          .eq('user_id', uid).maybeSingle(),
        supabase.from('activity_logs').select('activity_type,score_delta,created_at,duration_minutes')
          .eq('user_id', uid)
          .gte('created_at', ninetyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase.from('artifacts').select('id,title,subject,type,created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('admin_webinars').select('*')
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(1)
      ]);

    // Process results...
    if (profileRes.error) throw profileRes.error;
    // etc.
  } catch (err) {
    Sentry.captureException(err);
    setError('Failed to load dashboard data');
  } finally {
    setLoading(false);
  }
};
```

IMPORTANT: Read the existing code first. Identify ALL queries. Group the
independent ones into Promise.all. Keep dependent ones sequential (if query B
needs query A's result).

Also add: `.limit(2000)` to the activity_logs query to prevent OOM on active users.

## TASK 3B: Code Splitting — Lazy Load Pages

File: `frontend/src/App.jsx`

Find all static page imports at the top of the file. They look like:
```javascript
import DoctorDashboard from './components/DoctorDashboard';
import ExamPage from './components/ExamPage';
// etc.
```

REPLACE with lazy imports for all page-level components:

```javascript
import { lazy, Suspense } from 'react';

// Lazy load all pages
const DoctorDashboard = lazy(() => import('./components/DoctorDashboard'));
const ExamPage = lazy(() => import('./components/ExamPage'));
const EBooksPage = lazy(() => import('./components/EBooksPage'));
const ActivityPage = lazy(() => import('./components/ActivityPage'));
const LeaderboardPage = lazy(() => import('./components/LeaderboardPage'));
const StudyPlanPage = lazy(() => import('./components/StudyPlan/WeeklyPlanner'));
const SADashboard = lazy(() => import('./components/SADashboard'));
const CADashboard = lazy(() => import('./components/CADashboard'));
// ... all other page components
```

Then wrap renderPage() return in Suspense:

```javascript
const renderPage = () => {
  // ... role guard from Phase 2 ...
  return (
    <Suspense fallback={<PageLoader />}>
      {/* existing switch/conditional */}
    </Suspense>
  );
};
```

DO NOT lazy-load: Sidebar, TopBar, AuthContext, Login — these are needed immediately.
DO lazy-load: Every page component that renders conditionally based on `currentPage`.

## TASK 3C: Vite Bundle Splitting

File: `frontend/vite.config.js`

Add `manualChunks` to the build configuration:

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-supabase': ['@supabase/supabase-js'],
        'vendor-motion': ['framer-motion'],
        'vendor-icons': ['lucide-react'],
        'vendor-pdf': ['react-pdf'],  // if used
      }
    }
  }
}
```

Read `package.json` first to confirm which heavy libraries exist.
Only split libraries that are actually in dependencies.

## TASK 3D: Fix Memory Leak in trackActivity.js

File: `frontend/src/lib/trackActivity.js`

Add cleanup function:

```javascript
export function cleanupActivityTracking() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushQueue(); // flush any remaining items
}
```

Then in `frontend/src/App.jsx`, find the logout handler and add:
```javascript
import { cleanupActivityTracking } from './lib/trackActivity';
// In logout:
cleanupActivityTracking();
```

## TASK 3E: Fix Arena Subscription Memory Leak

File: `frontend/src/components/arena/LiveArenaStudent.jsx`

Find the `joinArena()` function. At the top, before creating a new subscription:

```javascript
const joinArena = async () => {
  // Clean up existing subscription before creating new one
  if (subRef.current) {
    supabase.removeChannel(subRef.current);
    subRef.current = null;
  }
  // ... rest of join logic
};
```

## TASK 3F: Scope Zustand Selectors

Search ALL components for `useAppStore()` calls without selectors.
Replace broad subscriptions with scoped ones:

```javascript
// BAD — subscribes to entire store, re-renders on any change:
const { page, setPage, darkMode } = useAppStore();

// GOOD — subscribes only to what's needed:
const page = useAppStore(s => s.page);
const setPage = useAppStore(s => s.setPage);
```

DO THIS FOR:
- useAppStore (most important — used in many components)
- useChatStore
- useReaderStore

DO NOT change useAuthStore or useTenantStore — they have few fields and
are read infrequently.

## TASK 3G: Add Pagination to Activity Logs Query

File: `frontend/src/components/ActivityPage.jsx`

Find the query that fetches 90 days of activity_logs. Add `.limit(5000)`:

```javascript
const { data: logs } = await supabase
  .from('activity_logs')
  .select('activity_type,score_delta,created_at,duration_minutes')
  .eq('user_id', userId)
  .gte('created_at', since90.toISOString())
  .order('created_at', { ascending: false })
  .limit(5000);
```

## PHASE 3 VERIFICATION GATE:
- [ ] Dashboard loads in < 3 seconds (was 5-10 seconds)
- [ ] `npm run build` → check dist/ folder → main bundle < 300KB (was ~800KB)
- [ ] No console warnings about memory leaks
- [ ] Navigating between pages shows brief loading state (Suspense fallback)
- [ ] Arena: join → disconnect → rejoin → no duplicate messages in console

**Say "PHASE 3 COMPLETE" and wait for "next".**


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
#  P H A S E   4 :   D A S H B O A R D   D A T A   W I R I N G
#
#  Make every dashboard widget show REAL data. Fix all silent failures.
#  Wire activity tracking to every feature.
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FILES TO READ:
- `frontend/src/components/DoctorDashboard.jsx`
- `frontend/src/components/Activity/DiaryPanel.jsx`
- `frontend/src/components/StudyPlan/PersonaBuilder.jsx`
- `frontend/src/components/StudyPlan/ClinicalLogger.jsx`
- `frontend/src/components/StudyPlan/WeeklyPlanner.jsx`
- `frontend/src/components/dashboard/StudyPlanCard.jsx`
- `frontend/src/components/quiz/QuizPlayer.jsx`
- `frontend/src/lib/trackActivity.js`

## TASK 4A: Fix DiaryPanel ↔ calendar_diary

Read DiaryPanel.jsx. The table `calendar_diary` now exists (Phase 1).
Verify the column names in the component's queries match exactly:
- user_id, date, entries (jsonb), mood, personal_notes

If column names don't match, fix the component queries.
Ensure: save works (upsert on user_id + date), load works, delete works.
Add `trackActivity('diary_entry')` after successful save if not already there.

Add proper error handling:
```javascript
const { error } = await supabase.from('calendar_diary').upsert({...});
if (error) {
  Sentry.captureException(error);
  addToast({ type: 'error', message: 'Failed to save diary entry' });
  return;
}
addToast({ type: 'success', message: 'Diary saved!' });
```

## TASK 4B: Fix PersonaBuilder ↔ user_study_persona

Read PersonaBuilder.jsx. Table now exists.
Verify column names match.
- On mount: SELECT from user_study_persona WHERE user_id = auth.uid()
- On save: UPSERT (one persona per user via UNIQUE user_id constraint)
- Pre-fill form if existing persona found

## TASK 4C: Fix ClinicalLogger ↔ clinical_logs

Read ClinicalLogger.jsx. Table now exists.
Verify column names match.
- On mount: SELECT recent entries for this user (ORDER BY created_at DESC LIMIT 20)
- On save: INSERT new entry
- Display previous entries as scrollable list
- Add `trackActivity('clinical_case_logged', newEntry.id)` after save

## TASK 4D: Fix WeeklyPlanner Persistence

Read WeeklyPlanner.jsx. Table `study_plan_history` now exists.

Implement this flow:
1. On mount: check for active plan this week
   ```sql
   SELECT * FROM study_plan_history
   WHERE user_id = auth.uid()
     AND week_start = date_trunc('week', now())::date
     AND is_active = true
   ORDER BY created_at DESC LIMIT 1
   ```
2. If found → display saved plan + tasks
3. If not found → show "Generate Plan" button
4. On generate → save to study_plan_history immediately after AI returns
5. Task completion: update completed_tasks JSONB on checkbox toggle
6. Tasks must be editable: add, remove, edit title
7. Deactivate old plans when generating new one

Also update `dashboard/StudyPlanCard.jsx`:
- Query study_plan_history for active plan
- Show "4/7 tasks completed" count
- Show next uncompleted task
- Link to full WeeklyPlanner page

## TASK 4E: Wire QuizPlayer to trackActivity

Read QuizPlayer.jsx. Find submission handler.
After successful quiz_attempts insert, add:

```javascript
import { trackActivity } from '../../lib/trackActivity';
trackActivity('quiz_complete', quizId);
if (score >= passingScore) trackActivity('quiz_passed', quizId);
else trackActivity('quiz_attempted', quizId);
```

## TASK 4F: Add Duration Tracking

File: `frontend/src/lib/trackActivity.js`

Add timer utilities:

```javascript
const timers = {};

export function startTimer(activityType, referenceId = 'default') {
  timers[`${activityType}_${referenceId}`] = Date.now();
}

export function stopTimer(activityType, referenceId = 'default') {
  const key = `${activityType}_${referenceId}`;
  const start = timers[key];
  if (start) {
    const minutes = Math.max(1, Math.round((Date.now() - start) / 60000));
    delete timers[key];
    return minutes;
  }
  return 0;
}
```

Modify `trackActivity()` to accept optional `durationMinutes` parameter.
Include `duration_minutes` in the INSERT payload.

Wire timers into:
- EBooksPage / PDFReaderView: startTimer on open, stopTimer on close/navigate
- ExamPage: startTimer on start, stopTimer on submit
- QuizPlayer: startTimer on start, stopTimer on complete
- SpacedRepetition: startTimer on session start, stopTimer on finish

## TASK 4G: Fix DoctorDashboard Empty State Handling

In DoctorDashboard.jsx, after fetching data, add explicit empty-state guards:

```javascript
if (!logs || logs.length === 0) {
  setWeekActivity([0, 0, 0, 0, 0, 0, 0]);
  setActivityByDate({});
  setRecentActivities([]);
  // Don't skip — continue to load other widgets
}
```

And add an auth guard at the top of the component:
```javascript
if (!uid && !isAuthLoading) {
  return <PageLoader message="Loading your dashboard..." />;
}
```

## PHASE 4 VERIFICATION GATE:
- [ ] DiaryPanel: save entry → reload → entry persists → activity logged
- [ ] PersonaBuilder: save profile → reload → form pre-filled
- [ ] ClinicalLogger: log case → reload → case in list → activity logged
- [ ] WeeklyPlanner: generate plan → reload → plan persists
- [ ] WeeklyPlanner: mark task complete → reload → still checked
- [ ] StudyPlanCard on dashboard shows task progress count
- [ ] QuizPlayer: complete quiz → activity_logs has quiz_complete entry
- [ ] Book open → close → activity_logs has duration_minutes > 0 (not 30)
- [ ] Fresh user (zero data) → dashboard shows empty states, no crashes
- [ ] `npm run build` → zero errors

**Say "PHASE 4 COMPLETE" and wait for "next".**


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
#  P H A S E   5 :   F E A T U R E   C O M P L E T I O N
#
#  Calendar detail view, webinar save, arena fixes, approval emails,
#  PDF notes, embeddings, AI insights — close every remaining loop.
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FILES TO READ (only as needed per task):
- `frontend/src/components/dashboard/MonthlyCalendar.jsx`
- `frontend/src/components/dashboard/WebinarLeaderboardRow.jsx`
- `frontend/src/components/arena/LiveArenaStudent.jsx`
- `frontend/src/App.jsx` — onApproveUser() function only
- `frontend/src/components/MCIVerificationQueue.jsx` — approval email pattern
- `frontend/src/components/sadashboard/ArtifactsTab.jsx`
- `frontend/src/components/sadashboard/AIInsightsTab.jsx`
- `frontend/src/components/LeaderboardPage.jsx`
- `frontend/src/components/Sidebar.jsx`

## TASK 5A: Build Calendar Day Detail Panel

Create NEW file: `frontend/src/components/dashboard/DayDetailPanel.jsx`

Props: `{ date, userId, onClose }`

On mount, fetch in parallel:
```javascript
const [activityRes, diaryRes, contentRes] = await Promise.all([
  supabase.from('activity_logs')
    .select('activity_type,score_delta,created_at,duration_minutes,reference_id')
    .eq('user_id', userId)
    .gte('created_at', `${dateStr}T00:00:00`)
    .lt('created_at', `${dateStr}T23:59:59`)
    .order('created_at', { ascending: true }),
  supabase.from('calendar_diary')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle(),
  supabase.from('user_content_state')
    .select('artifact_id, current_page, is_bookmarked, updated_at')
    .eq('user_id', userId)
    .gte('updated_at', `${dateStr}T00:00:00`)
    .lt('updated_at', `${dateStr}T23:59:59`)
]);
```

Display:
- Header: formatted date + close button
- Activity timeline (chronological with timestamps, icons per type, points)
- Stats bar: total study minutes | total points | items completed
- Diary section: show entry if exists, editable, "Add note" if empty
- Animate with Framer Motion (expand/collapse)
- Use Lucide icons for activity types
- Use tokens.js for styling

Modify `MonthlyCalendar.jsx`:
- On date click → toggle DayDetailPanel with selected date
- Visual highlight on selected date

## TASK 5B: Webinar Save/Interested

Check if `webinar_registrations` table exists. If not, create migration:

```sql
CREATE TABLE IF NOT EXISTS webinar_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  webinar_id UUID NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, webinar_id)
);
ALTER TABLE webinar_registrations ENABLE ROW LEVEL SECURITY;
-- RLS: users read/write own rows
```

Add toggle button to webinar cards in:
- WebinarLeaderboardRow.jsx
- Any other webinar display component

## TASK 5C: Fix Arena Rejoin Score Reset

File: `frontend/src/components/arena/LiveArenaStudent.jsx`

Find the upsert on arena_participants. Remove `score: 0` from the upsert payload
so rejoin only updates display_name, not score.

## TASK 5D: Fix SA Approval Emails

File: `frontend/src/App.jsx` — `onApproveUser()` function

Read MCIVerificationQueue.jsx to find the correct email pattern.
Copy that same edge function call into onApproveUser() and onRejectUser().

## TASK 5E: Auto-Generate Embeddings on Artifact Approval

File: `frontend/src/components/sadashboard/ArtifactsTab.jsx`

In the approve handler, after successful status update:
```javascript
try {
  await supabase.functions.invoke('generate-embeddings', {
    body: { artifact_id: artifact.id }
  });
} catch (e) {
  console.warn('Embedding generation deferred:', e.message);
}
```

## TASK 5F: Fix AIInsightsTab — Replace Mock Data

File: `frontend/src/components/sadashboard/AIInsightsTab.jsx`

Remove ALL Math.random() calls and hardcoded mock data.
Replace with real Supabase queries:
- Average exam scores from exam_attempts (last 30 days)
- Activity counts from activity_logs grouped by type
- Top subjects from user_content_state + artifacts join
- Total active users from activity_logs distinct user_id

Wire in `getPredictiveAlerts()` and `analyzeKnowledgeGap()` from aiService.js
with the REAL data as input.

## TASK 5G: Leaderboard Cache TTL

File: `frontend/src/components/LeaderboardPage.jsx`

Add 5-minute TTL:
```javascript
const CACHE_TTL = 5 * 60 * 1000;
// Track lastFetch time, refetch if stale
```

## TASK 5H: Deprecate KahootPage

File: `frontend/src/components/Sidebar.jsx`

Find any "Kahoot" or "Live Quiz" link pointing to KahootPage.
Redirect to the arena system instead.
Do NOT delete KahootPage.jsx — rename to KahootPage.jsx.bak.

## PHASE 5 VERIFICATION GATE:
- [ ] Click date on calendar → DayDetailPanel opens with real activity data
- [ ] Write diary in DayDetailPanel → save → reopen → persists
- [ ] "Interested" button on webinar → save → reload → still saved
- [ ] Arena: join → disconnect → rejoin → score preserved (not reset)
- [ ] SA approves doctor → doctor receives approval email
- [ ] SA approves artifact → semantic search finds it within 60 seconds
- [ ] AI Insights tab → shows real numbers, no Math.random in source
- [ ] Leaderboard → complete activity → within 5 min score updates
- [ ] Sidebar "Live Quiz" → opens arena, not external kahoot.it
- [ ] `npm run build` → zero errors

**Say "PHASE 5 COMPLETE" and wait for "next".**


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
#  P H A S E   6 :   F I N A L   V E R I F I C A T I O N   &   D E P L O Y
#
#  Full build, full test pass, deploy to Vercel.
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## TASK 6A: Full Build Verification

```bash
cd frontend
npm run build
```

Requirements:
- ZERO errors
- ZERO warnings (or only pre-existing non-blocking warnings)
- Check `dist/` folder: main chunk < 300KB, vendor chunks loaded separately

## TASK 6B: Deploy Edge Functions

```bash
supabase functions deploy submit-exam
supabase functions deploy generate-embeddings
```

## TASK 6C: Run Comprehensive Verification

Test each of these (state what you find):

### Auth
- [ ] Doctor login → correct dashboard
- [ ] CA login → correct dashboard
- [ ] SA login → correct dashboard
- [ ] Doctor cannot access SA pages via devtools

### Dashboard
- [ ] "My Score" shows non-zero after activities
- [ ] Activity heatmap colored for active days
- [ ] Calendar date click → DayDetailPanel with activities
- [ ] StudyPlanCard shows task progress
- [ ] Recent Reads shows books opened
- [ ] Bookmarks shows bookmarked books
- [ ] Webinar section shows upcoming + "Interested" button

### Activity System
- [ ] Activity types logged: daily_login, article_read, quiz_complete, exam_set_completed
- [ ] Duration tracking: study hours accurate (not 30-min default)
- [ ] Score delta populated automatically via trigger
- [ ] Leaderboard updates after activities

### Study Plan
- [ ] PersonaBuilder saves + loads
- [ ] ClinicalLogger saves + loads
- [ ] WeeklyPlanner generates + persists + tasks editable + completion persists

### Exams & Quizzes
- [ ] Exam scores from edge function (server-side)
- [ ] Quiz completion tracked in activity

### Arena
- [ ] Rejoin doesn't reset score

### AI Features
- [ ] AI Insights shows real data
- [ ] Semantic search finds newly approved content

## TASK 6D: Update Handoff

Update `.agent/handoff.md` with:
```markdown
## Last Updated
[today's date] — Session: Phase 1 Blueprint Execution (all 6 phases)

## What We Worked On
- Created 6 missing DB tables + scoring system (Phase 1)
- Added route guards + server-side exam scoring (Phase 2)
- Performance: lazy loading, query parallelization, bundle splitting (Phase 3)
- Wired dashboard widgets to real data (Phase 4)
- Built DayDetailPanel, webinar save, arena fixes, email fixes (Phase 5)
- Full verification + deploy (Phase 6)

## Current State
✅ Complete — all 20 audit findings resolved

## Files Changed This Session
[list every file that was created or modified]

## Next Session Should Start With
Phase 2: Orchestration system + supabase.js module split

## Do NOT Touch Until Discussed
- server/ — Express audit still pending
- *.bak files — backups, leave alone
```

## TASK 6E: Deploy

```bash
cd frontend && npm run build && git add -A && git commit -m "Phase 1: Complete data wiring + performance + security"
git push
```

If Vercel auto-deploys on push, verify production URL loads correctly.

## PHASE 6 VERIFICATION GATE:
- [ ] Production build deployed
- [ ] handoff.md updated
- [ ] All items in 6C checklist pass

**Say "ALL PHASES COMPLETE."**


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# END OF MASTER EXECUTION PROMPT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
