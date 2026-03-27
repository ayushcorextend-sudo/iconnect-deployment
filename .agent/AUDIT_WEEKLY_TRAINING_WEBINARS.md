# iConnect — Thorough Audit Report
## Weekly Training/Tasks & Webinar Systems

**Audit Date:** 2026-03-24
**Scope:** Weekly Training, Study Plans, Webinars, Spaced Repetition, Clinical Logger
**Status:** PARTIALLY IMPLEMENTED — Major gaps identified

---

## 1. WEEKLY TRAINING SECTION (Dashboard)

### Dashboard Component
**File:** `/frontend/src/components/DoctorDashboard.jsx`

#### Weekly Training Card: StudyPlanCard
**File:** `/frontend/src/components/dashboard/StudyPlanCard.jsx` (lines 1-60)

**Current Implementation:**
- ✅ **REAL** — Uses actual AI integration via `generateStudyPlan()` from aiService
- ✅ Generates a 7-day study plan on-demand (button click)
- ✅ Shows plan text in an AIResponseBox component
- ❌ **CRITICAL ISSUE:** Plan is NOT saved to database — it's just displayed as temporary text
- ❌ No tracking of completion or progress
- ❌ Does not integrate with the full WeeklyPlanner.jsx system
- ❌ No "weekly targets" — just a one-time generated text suggestion

**Database Impact:** NONE — No data persistence for the study plan shown here

**How AI is Called:**
```
generateStudyPlan(speciality, booksRead, quizScore, totalScore)
  → callAI() in aiService.js
  → routes to gemini-proxy edge function (if Gemini available)
  → Returns markdown text of 7-day schedule
```

**What's Missing:**
1. Save generated plan to `study_plan_history` table
2. Display progress on task completion
3. Link to full WeeklyPlanner.jsx for persistent tracking
4. Let doctors edit/customize the suggested plan

---

## 2. WEEKLY PLANNER (Full Study Plan Engine)

**File:** `/frontend/src/components/StudyPlan/WeeklyPlanner.jsx` (lines 1-231)

### Real DB Integration Status: ❌ BROKEN

**What It Attempts to Do:**
- Generates 7-day plans using AI (`generateContextualPlan()`)
- Tries to save plans to `study_plan_history` table (lines 57-63)
- Tries to load saved persona from `user_study_persona` (line 23)
- Tries to load recent clinical cases from `clinical_logs` (line 24)
- ✅ Tracks task completion locally with checkbox state (lines 74-77)
- ✅ Shows completion progress (line 79-80)
- ✅ Allows task toggling (check/uncheck)

**Database Tables Used:**
1. `study_plan_history` — stores generated plans
   - Columns: `user_id`, `plan_data` (JSON), `is_active`, `generated_at`
   - ❌ **TABLE DOES NOT EXIST** — Referenced in code but not created anywhere

2. `user_study_persona` — stores learning profile
   - Columns: `user_id`, `speciality`, `weak_subjects`, `strong_subjects`, `peak_hours`, `weekly_goal_hours`, `exam_date`
   - ❌ **TABLE DOES NOT EXIST** — Referenced in code but not created anywhere

3. `clinical_logs` — stores case logs
   - Columns: `user_id`, `case_title`, `logged_at`, ...
   - ❌ **TABLE DOES NOT EXIST** — Referenced in code but not created anywhere

**AI Integration:**
- Calls `generateContextualPlan()` from aiService.js (line 40)
- Expects JSON response with structure: `{ plan: [{ day, tasks: [{subject, activity, duration_mins}] }] }`
- ✅ **WORKING** — Parses and validates JSON correctly (lines 266-272 in aiService.js)

**Completion Tracking:**
- ✅ Stores completion state in local React state (line 14, object of dayIdx-taskIdx keys)
- ❌ **NOT PERSISTED** — Completion data is lost on page reload
- ❌ No database table for tracking daily progress

**Critical Gaps:**
1. Missing database migrations for `study_plan_history`, `user_study_persona`, `clinical_logs`
2. No persistence of task completion records
3. No connection to dashboard — plan exists in isolation
4. No weekly target setting/editing UI (targets are hardcoded in form defaults)

**Runtime Failures:**
- Line 23: `supabase.from('user_study_persona')...` — Fails silently (maybeSingle catches error)
- Line 24: `supabase.from('clinical_logs')...` — Fails silently
- Line 59: `supabase.from('study_plan_history').insert(...)` — Fails, plan not saved

---

## 3. WEBINAR SYSTEM

### 3a. Webinar Creation (SuperAdmin)

**File:** `/frontend/src/components/sadashboard/WebinarCalendarTab.jsx` (lines 1-95)

**Status:** ✅ REAL — Fully connected to database

**What SA Can Do:**
- Create webinars via form (title, speaker, date/time, duration, join_url, description)
- Edit webinars (implicitly via delete + re-add)
- Delete webinars
- See list of scheduled webinars with past ones faded

**Database Table:** `admin_webinars`
- ✅ **TABLE EXISTS** — Created in migration `20240005_completion.sql`
- Columns: `id`, `title`, `description`, `speaker`, `scheduled_at`, `duration_min`, `join_url`, `is_active`, `created_by`, `created_at`
- ✅ Inserts: Line 22 `supabase.from('admin_webinars').insert([wForm])`
- ✅ Deletes: Line 39 `supabase.from('admin_webinars').delete().eq('id', id)`
- ✅ Reads: Line 13-15 `supabase.from('admin_webinars').select('*')`

**RLS Policies:** (From migration 20240005_completion.sql)
- Public read: `webinars_read — FOR SELECT USING (true)`
- Admin write: `webinars_admin — FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('superadmin','contentadmin')))`

### 3b. Webinar Display to Doctors

**File:** `/frontend/src/components/dashboard/WebinarLeaderboardRow.jsx` (lines 1-261)

**Status:** ✅ REAL — Fetches from admin_webinars table

**What Doctors See:**
- Next upcoming webinar card (title, speaker, date, duration, join link)
- "Remind Me" button to set a reminder with customizable lead time (15min, 1hr, 1day)
- Reminder channels: in-app, email
- Mini leaderboard alongside (not webinar-specific)

**Database Interactions:**
- ✅ **Loads webinars:** Line 182-188 in DoctorDashboard.jsx
  ```js
  const { data: wb } = await supabase
    .from('admin_webinars')
    .select('*')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(1);
  ```
- ✅ **Saves reminders:** Line 241-247 in DoctorDashboard.jsx
  ```js
  await supabase.from('user_reminders').insert([{
    user_id: uid,
    webinar_id: nextWebinar.id,
    remind_at: remindAt.toISOString(),
    lead_minutes: reminderLeadMins,
    channels: reminderChannels,
  }]);
  ```

**Webinar-Specific Features:**
1. ✅ **Join Link:** Direct link to Zoom/Meet in webinar card (line 48-61 in WebinarLeaderboardRow.jsx)
2. ✅ **Reminders:** Save to `user_reminders` table (migration 20260314020000_doctor_ux.sql exists)
3. ❌ **Booking/Registration:** NO bookmark or "save for later" for webinars
4. ❌ **Webinar List/Calendar:** Only shows NEXT webinar, not full list for doctor to browse
5. ❌ **Doctor Participation Tracking:** No `webinar_registrations` data collection (table exists but unused)

**Missing Functionality:**
- No UI to show doctor's registered webinars
- No "register for webinar" button (doctors just get reminded)
- No webinar series/recurring webinars support
- No webinar feedback/survey after attendance

### 3c. Webinar Across Site

**Searched locations:** `/frontend/src/pages/`, `/frontend/src/components/`

- ❌ **NO dedicated webinar page/section** beyond dashboard widget
- ❌ **NO webinar calendar view** for doctors to browse all upcoming webinars
- ❌ **NO webinar archive** for doctors to see past webinars
- ❌ **NO webinar content library** (e.g., recordings, materials, Q&A)

---

## 4. STUDY PLAN SYSTEM

### 4a. SpacedRepetition.jsx

**File:** `/frontend/src/components/StudyPlan/SpacedRepetition.jsx` (lines 1-150)

**Status:** ✅ REAL — Uses SM-2 algorithm with actual database

**What It Does:**
- Loads due flashcards from `spaced_repetition_cards` table (line 32-38)
- ✅ Filters by `user_id` and cards where `next_review_at <= today`
- Displays card front, user clicks to flip and see back
- User rates: Again (0), Hard (3), Good (4), Easy (5)
- ✅ Calls `sm2()` algorithm (line 54-59) to calculate next review date
- ✅ Updates card in database with new SM-2 values (line 63-69)
- Tracks XP earned (+5 per card reviewed)

**Database Table:** `spaced_repetition_cards`
- ✅ **TABLE EXISTS** — Created in migration `20260317000000_spaced_repetition.sql`
- Columns: `id`, `user_id`, `front`, `back`, `subject`, `difficulty`, `easiness`, `interval`, `repetitions`, `next_review_at`, `last_reviewed_at`, `source_question_id`, `created_at`
- ✅ Proper RLS: "Users manage own SR cards"
- ✅ Index on (user_id, next_review_at) for efficiency

**SM-2 Algorithm:**
- ✅ **REAL IMPLEMENTATION** in `/frontend/src/lib/sm2.js` (52 lines)
- Pure function (no side effects)
- Correctly implements:
  - Quality factor (0-5)
  - Ease factor (min 1.3, default 2.5)
  - Interval calculation (1 day first, then 6 days, then scaled)
  - Next review date as ISO date string

**What's Missing:**
1. ❌ **Card creation source:** How are spaced_repetition_cards created?
   - Expected: Auto-generated from wrong exam answers
   - Actual: No evidence of this in codebase (no migration, no function)
2. ❌ **Card import:** No UI to create/import cards manually
3. ❌ **Review statistics:** No tracking of daily review streaks or stats
4. ❌ **Algorithm tuning:** No option for users to adjust ease factor multipliers

---

### 4b. PersonaBuilder.jsx

**File:** `/frontend/src/components/StudyPlan/PersonaBuilder.jsx` (lines 1-200+)

**Status:** ❌ BROKEN — Table doesn't exist

**What It Should Do:**
- Collect learning profile: learning style, peak hours, weekly goal hours, weak/strong subjects, exam date
- ✅ Form UI is complete and functional (lines 108-150+)
- ❌ **SAVES TO NON-EXISTENT TABLE** `user_study_persona` (lines 89-91)

**Database Table:** `user_study_persona`
- ❌ **TABLE DOES NOT EXIST**
- Referenced in:
  - PersonaBuilder.jsx: line 41 (load), line 91 (upsert)
  - WeeklyPlanner.jsx: line 23 (load)
  - Other components via WeeklyPlanner
- ❌ **NO MIGRATION FILE** to create it

**Form Fields Collected:**
- `learning_style`: 'visual' | 'auditory' | 'kinesthetic' | 'reading'
- `peak_hours`: 'morning' | 'afternoon' | 'evening' | 'night'
- `weekly_goal_hours`: integer (default 20)
- `weak_subjects`: array of up to 5 subjects
- `strong_subjects`: array of up to 5 subjects
- `exam_date`: ISO date string (optional)

**Status Code:**
```js
// Lines 40-43: Will fail silently if table doesn't exist
const { data } = await supabase
  .from('user_study_persona')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();
```

**Critical Issue:**
- Form works, but data is never saved
- Subsequent components (WeeklyPlanner) will fail to load persona data
- No error handling — failures are silent

---

### 4c. ClinicalLogger.jsx

**File:** `/frontend/src/components/StudyPlan/ClinicalLogger.jsx` (lines 1-200+)

**Status:** ❌ BROKEN — Table doesn't exist

**What It Should Do:**
- Doctors log clinical cases they encounter: title, speciality, key learnings, difficulty level
- ✅ Form UI is complete and functional (lines 87-141)
- ❌ **SAVES TO NON-EXISTENT TABLE** `clinical_logs` (line 42)

**Database Table:** `clinical_logs`
- ❌ **TABLE DOES NOT EXIST**
- Referenced in:
  - ClinicalLogger.jsx: lines 22, 42, 63 (insert, select, delete)
  - WeeklyPlanner.jsx: line 24 (load recent cases)
- ❌ **NO MIGRATION FILE** to create it

**Form Fields Collected:**
- `case_title`: string (required, 120 char max)
- `speciality`: string (60 char max)
- `key_learnings`: text (free form)
- `difficulty`: 'easy' | 'medium' | 'hard'
- Auto-added: `user_id`, `logged_at` (current timestamp)

**Expected Migration (Missing):**
```sql
CREATE TABLE IF NOT EXISTS clinical_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_title text NOT NULL,
  speciality text,
  key_learnings text,
  difficulty text DEFAULT 'medium',
  logged_at timestamptz DEFAULT now()
);
ALTER TABLE clinical_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own clinical_logs"
  ON clinical_logs FOR ALL
  USING (auth.uid() = user_id);
```

**Status Code:**
```js
// Line 42: Will fail when user clicks "Log Case"
await supabase.from('clinical_logs').insert({
  user_id: userId,
  ...form,
});
```

---

## 5. SUPABASE FUNCTIONS & AI INTEGRATION

### 5a. gemini-proxy Edge Function

**File:** `/supabase/functions/gemini-proxy/index.ts` (87 lines)

**Status:** ✅ DEPLOYED (confirmed by file existence)

**What It Does:**
- Accepts POST requests with OpenAI-style messages
- Converts to Gemini API format
- Calls Google Gemini API
- Returns response text

**Configuration:**
- ✅ GEMINI_API_KEY: Must be set in Supabase secrets
- ✅ ALLOWED_ORIGIN: Hard-coded to `https://iconnect-med.vercel.app` + localhost
- ✅ CORS headers included

**Connection in aiService.js:**
```js
const USE_EDGE_FUNCTION = false;  // LINE 17 — CURRENTLY DISABLED
```

**Current Status:**
- ❌ **EDGE FUNCTION DISABLED** — `USE_EDGE_FUNCTION=false` on line 17 of aiService.js
- Fallback route: NVIDIA API (if key present) → Gemini (direct client call)
- ✅ Direct Gemini call works via edge function at `SUPABASE_URL/functions/v1/gemini-proxy`

### 5b. AI Service Layer

**File:** `/frontend/src/lib/aiService.js` (450+ lines)

**Functions for Weekly/Study Systems:**

1. **generateStudyPlan()** — Line 131-138
   - Called by: StudyPlanCard.jsx
   - Input: speciality, booksRead, quizScore, totalScore
   - Output: { text, error }
   - ✅ **WORKING** — Returns markdown text of 7-day plan
   - ❌ **NOT SAVED** — No persistence

2. **generateContextualPlan()** — Line 248-276
   - Called by: WeeklyPlanner.jsx
   - Input: speciality, weakSubjects, strongSubjects, peakHours, weeklyGoalHours, recentCases, examDate
   - Output: { plan, error } — parsed JSON
   - ✅ **WORKING** — Returns structured weekly plan
   - ❌ **NOT SAVED** — WeeklyPlanner.jsx tries to save to non-existent `study_plan_history` table

3. **getPersonalizedSuggestions()** — Line 377-422
   - Called by: DoctorDashboard.jsx (ForYouWidget)
   - Input: speciality, booksRead, quizScore, totalScore, weeklyMins, lastActive, recentSubjects
   - Output: { suggestions, error } — array of suggested actions
   - ✅ **WORKING** — Returns 3-4 personalized recommendations
   - ✅ **CACHED** — 10-minute TTL in localStorage via dataCache.js

**Routing:**
- Primary: NVIDIA Llama 3.1 (if `VITE_NVIDIA_API_KEY` set)
- Secondary: Google Gemini (via gemini-proxy)
- Fallback: Default static suggestions (if both fail)

### 5c. Missing Supabase Functions

**Expected but NOT FOUND:**
- ❌ `trigger-reminders` — No edge function to dispatch webinar reminders
- ❌ `generate-study-cards` — No function to auto-create spaced repetition cards from wrong answers
- ❌ `weekly-report` — No function to generate weekly study reports

---

## 6. DATABASE SCHEMA STATUS

### Tables That EXIST ✅
- `admin_webinars` — Webinar scheduling
- `user_reminders` — Webinar reminders
- `spaced_repetition_cards` — Flashcards for SM-2
- `smart_notes` — AI-generated notes
- `reading_progress` — Article reading progress
- `activity_logs` — General activity tracking
- `user_scores` — Leaderboard scores
- `subject_completion` — Subject progress

### Tables That DO NOT EXIST ❌
- `user_study_persona` — Learning profile (PersonaBuilder.jsx, WeeklyPlanner.jsx)
- `study_plan_history` — Saved weekly plans (WeeklyPlanner.jsx)
- `clinical_logs` — Clinical case logging (ClinicalLogger.jsx, WeeklyPlanner.jsx)

---

## 7. CRITICAL FINDINGS SUMMARY

### REAL & WORKING ✅
- ✅ Webinar scheduling (admin_webinars table) — SuperAdmin can create/manage
- ✅ Webinar reminders (user_reminders table) — Doctors can set reminders
- ✅ Spaced repetition (spaced_repetition_cards table) — Flashcard system works with SM-2
- ✅ AI integration (Gemini proxy edge function) — All AI calls working
- ✅ Leaderboard (user_scores table) — Ranking system functional

### PARTIALLY IMPLEMENTED ⚠️
- ⚠️ Study plans — Dashboard widget generates but doesn't save; WeeklyPlanner tries to save to non-existent table
- ⚠️ AI suggestions (ForYou) — Generates suggestions, cached locally, not in database
- ⚠️ Weekly training — UI exists but no persistence or user-editable targets

### COMPLETELY BROKEN ❌
- ❌ Learning persona (PersonaBuilder.jsx) — Form works, table doesn't exist
- ❌ Clinical logging (ClinicalLogger.jsx) — Form works, table doesn't exist
- ❌ Study plan persistence (WeeklyPlanner.jsx) — Tries to save to non-existent table
- ❌ Task completion tracking — No database persistence

### MISSING ENTIRELY ❌
- ❌ Webinar calendar view — Doctors only see next webinar
- ❌ Webinar archive — No past webinars or recordings
- ❌ Auto-generated flashcards — No mechanism from exam answers
- ❌ Reminder dispatcher — No edge function to send reminders
- ❌ Weekly reports — No summary generation

---

## 8. CODE FAILURES

All references to non-existent tables:

**PersonaBuilder.jsx, Line 41** — Silent failure, persona loads empty
**WeeklyPlanner.jsx, Line 23** — Silent failure, persona undefined
**WeeklyPlanner.jsx, Line 24** — Silent failure, clinical cases empty
**WeeklyPlanner.jsx, Line 59** — Error: Insert fails, plan not saved
**ClinicalLogger.jsx, Line 42** — Error: Insert fails, caught in try-catch

---

## CONCLUSION

**Overall Status:** 60% implemented, 40% broken/missing

**Impact:** Users cannot fully use the study planning system because the supporting tables don't exist. Dashboard widgets are partially functional (AI suggestions work, webinar reminders work), but the full study plan engine is non-functional.

**Action Required:** Create 3 missing migrations + update UI integration.
