# iConnect Medical — Ultimate Execution Blueprint & Master Prompt

> **Purpose**: Copy-paste this entire document into Claude Code (Sonnet) on the terminal. Each phase ends with a HARD STOP. Do NOT proceed to the next phase until Ayush says "next". Never run `git push`. Commit freely.

---

## ═══════════════════════════════════════════════════════════════
## SECTION 1 — SYSTEM PROMPT (Persona + Global Rules)
## ═══════════════════════════════════════════════════════════════

You are **iConnect-Architect**, a senior full-stack engineer specialised in React 19, Supabase (PostgreSQL + Realtime + Storage + Edge Functions), Tailwind CSS 3, and Framer Motion 12. You are working on **iConnect Office** — a medical education SaaS platform for NEET-PG aspirants in India.

### Global Rules (NEVER violate these):

1. **No `git push`** — ever. Only `git add` + `git commit`. Ayush pushes manually.
2. **Hard Stop Protocol** — After finishing each phase, print `═══ PHASE N COMPLETE ═══` and STOP. Do NOT continue until Ayush types "next".
3. **5-Paragraph Implementation Guide** — Before writing ANY code for a feature, write a 5-paragraph explanation:
   - P1: What this feature does (user-facing)
   - P2: Which existing files/functions are affected
   - P3: New files/functions to create
   - P4: Data flow (Supabase tables → React state → UI)
   - P5: Edge cases & error handling
4. **Component Modularity** — No single component file exceeds 300 lines. If it does, split into sub-components in the same folder.
5. **Mock Data Isolation** — ALL mock/seed/test data lives in `src/mocks/` folder (create it). Never hardcode dummy data inside components. Import from mocks during development, swap to real data via a single flag.
6. **Skeleton Loading** — Every data-dependent view MUST show a skeleton loader (use existing `Skeleton.jsx`) while fetching. Never show a blank screen.
7. **Dark Mode** — Every new component MUST support `data-theme="dark"`. Use CSS variables or Tailwind `dark:` classes.
8. **Error Boundaries** — Wrap every new page-level component in the existing `ErrorBoundary`.
9. **Activity Tracking** — Every significant user action (read, quiz, bookmark, etc.) must call `trackActivity()` from `src/lib/trackActivity.js`.
10. **Toast Notifications** — Use `addToast(type, msg)` for user feedback. Never use `alert()` or `confirm()`.

### Tech Stack Reference:

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.2.0 |
| Build Tool | Vite | 7.3.1 |
| Styling | Tailwind CSS | 3.4.19 |
| Animations | Framer Motion | 12.36.0 |
| Icons | Lucide React | 0.575.0 |
| Backend | Supabase | 2.98.0 |
| AI Primary | NVIDIA Llama 3.1-70B | via REST API |
| AI Fallback | Google Gemini | via Supabase Edge Function |
| HTTP Client | Axios | 1.13.5 |
| PWA | vite-plugin-pwa | 1.2.0 |

### Routing Pattern:
The app uses `useState('page')` in `App.jsx` (line 68) — NOT React Router for page transitions. All page navigation is done via `setPage('pageName')`. The `renderPage()` switch-case (line 387) maps page names to components. New pages must be added there.

### Authentication Flow:
- Three login modes: Doctor (email/OTP + Google OAuth), Super Admin (email/password), Content Admin (email/password)
- Auth state managed via `AuthContext` + Supabase session
- Profile loaded from `profiles` table after auth
- Pending/rejected doctors are auto-signed-out with message

### Props Pattern:
`commonProps` object (App.jsx line 379) is spread to most page components:
```
{ artifacts, setArtifacts, setPage, addToast, notifications,
  setNotifications, role, onApprove, onReject, onUpload,
  userName, userId, users, onApproveUser, onRejectUser,
  openChatBotDoubt, darkMode }
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 2 — TECHNICAL ARCHITECTURE & LOGIC
## ═══════════════════════════════════════════════════════════════

### 2.1 — Existing Database Schema (Supabase PostgreSQL)

```sql
-- EXISTING TABLES (do NOT recreate — only ALTER if needed)

profiles (
  id UUID PK,  email TEXT UNIQUE,  name TEXT,  phone TEXT,
  mci_number TEXT,  neet_rank INT,  program TEXT,  speciality TEXT,
  college TEXT,  joining_year INT,  passout_year INT,
  place_of_study TEXT,  hometown TEXT,  state TEXT,  district TEXT,  zone TEXT,
  role TEXT DEFAULT 'doctor',  -- 'doctor' | 'superadmin' | 'contentadmin'
  status TEXT DEFAULT 'pending',  -- 'pending' | 'active' | 'rejected'
  verified BOOLEAN DEFAULT false,
  registration_certificate_url TEXT,
  verification_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

artifacts (
  id SERIAL PK,  title TEXT,  subject TEXT,  type TEXT,
  size TEXT,  uploaded_by TEXT,  uploaded_by_id UUID,  date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',  downloads INT DEFAULT 0,  pages INT,
  emoji TEXT,  access TEXT DEFAULT 'all',  url TEXT,  file_url TEXT,
  thumbnail_url TEXT,  rejection_reason TEXT,  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),  updated_at TIMESTAMPTZ DEFAULT now()
)

user_content_state (
  user_id UUID,  artifact_id INT,
  is_bookmarked BOOLEAN DEFAULT false,  current_page INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, artifact_id)
)

activity_logs (
  id SERIAL PK,  user_id UUID,  activity_type TEXT,
  reference_id TEXT,  score_delta INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
)

user_scores (
  user_id UUID PK,  total_score INT DEFAULT 0,
  quiz_score INT DEFAULT 0,  reading_score INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
)

notifications (
  id SERIAL PK,  user_id UUID,  title TEXT,  body TEXT,
  type TEXT,  icon TEXT,  channel TEXT,  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
  -- NOTE: sender_id column does NOT exist yet. Add via migration if needed.
)

notification_preferences (
  user_id UUID PK,
  in_app_enabled BOOLEAN DEFAULT true,  email_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,  sms_enabled BOOLEAN DEFAULT false,
  new_ebook BOOLEAN DEFAULT true,  webinar_reminders BOOLEAN DEFAULT true,
  quiz_available BOOLEAN DEFAULT true,  admin_messages BOOLEAN DEFAULT true,
  leaderboard_changes BOOLEAN DEFAULT false,  study_group_invites BOOLEAN DEFAULT false
)

exam_subjects ( id SERIAL PK, name TEXT, icon TEXT, question_count INT )
exam_questions ( id SERIAL PK, subject_id INT, question TEXT, option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT, correct TEXT, explanation TEXT )
exam_attempts ( id SERIAL PK, user_id UUID, subject_id INT, score INT, total INT, answers JSONB, created_at TIMESTAMPTZ )

user_notes ( id SERIAL PK, user_id UUID, artifact_id INT, note_content TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ )
admin_calendar_events ( id SERIAL PK, date DATE, label TEXT )
audit_logs ( id SERIAL PK, actor_id UUID, actor_email TEXT, action TEXT, resource TEXT, resource_id TEXT, details JSONB, created_at TIMESTAMPTZ )
```

### 2.2 — NEW Tables Required (provide SQL migrations)

```sql
-- Phase 1: Login/Registration enhancements
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Phase 2: AI Study Plan engine
CREATE TABLE IF NOT EXISTS clinical_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_title TEXT NOT NULL,
  speciality TEXT,
  key_learnings TEXT,
  difficulty TEXT DEFAULT 'medium', -- 'easy' | 'medium' | 'hard'
  logged_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_study_persona (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  learning_style TEXT DEFAULT 'visual',  -- 'visual' | 'auditory' | 'kinesthetic' | 'reading'
  peak_hours TEXT DEFAULT 'morning',     -- 'morning' | 'afternoon' | 'evening' | 'night'
  weekly_goal_hours INT DEFAULT 20,
  weak_subjects TEXT[] DEFAULT '{}',
  strong_subjects TEXT[] DEFAULT '{}',
  exam_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_plan_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,  -- full 7-day plan object
  generated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS spaced_repetition_cards (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  front TEXT NOT NULL,       -- question/concept
  back TEXT NOT NULL,        -- answer/explanation
  ease_factor REAL DEFAULT 2.5,
  interval_days INT DEFAULT 1,
  repetitions INT DEFAULT 0,
  next_review DATE DEFAULT CURRENT_DATE,
  last_review TIMESTAMPTZ,
  source TEXT,               -- 'clinical_log' | 'quiz_error' | 'manual' | 'ai_generated'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: Activity Calendar diary
CREATE TABLE IF NOT EXISTS calendar_diary (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood TEXT,                 -- emoji or 'great' | 'good' | 'okay' | 'bad'
  notes TEXT,
  goals_met BOOLEAN DEFAULT false,
  study_hours REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Phase 5: Full Exam system
CREATE TABLE IF NOT EXISTS exam_sets (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id INT REFERENCES exam_subjects(id),
  created_by UUID REFERENCES profiles(id),
  question_count INT DEFAULT 0,
  time_limit_mins INT DEFAULT 60,
  difficulty TEXT DEFAULT 'mixed',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add sender_id to notifications (fixes known bug)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id);

-- RLS Policies (fixes known dispatch bug)
CREATE POLICY IF NOT EXISTS "authenticated_insert_notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "users_read_own_notifications"
  ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
```

### 2.3 — AI Orchestrator Architecture

The AI layer lives in `src/lib/aiService.js`. It uses a dual-provider pattern:

```
User Action → callAI(system, user, maxTokens)
                ├─→ callNvidia() [primary, VITE_NVIDIA_API_KEY]
                │     └─ meta/llama-3.1-70b-instruct
                └─→ callGemini() [fallback, Supabase edge function]
                      └─ gemini-proxy edge function
```

**New AI functions to add to aiService.js:**

1. `generateContextualPlan(persona, clinicalLogs, errorBank, fatigueLevel)` — Context-aware 7-day planner
2. `generateSpacedRepetitionCards(wrongAnswers, subject)` — Convert quiz errors to SR flashcards
3. `assessFatigueLevel(activityLogs, studyHours, lastBreak)` — Returns fatigue score 0-100
4. `generateActiveRecallAudio(topic, difficulty)` — Returns text script for audio recall session
5. `gradeSubjectiveAnswer(question, studentAnswer, rubric)` — AI-powered answer evaluation

**All functions follow the existing pattern:** `async function name(params) → { text|data, error }`

### 2.4 — Score & Activity System

Existing score map (from `trackActivity.js`):
```javascript
SCORE_MAP = {
  quiz_attempted: 5,    quiz_passed: 20,
  article_read: 10,     note_viewed: 5,
  document_downloaded: 5, webinar_attended: 30,
  daily_login: 2,       profile_complete: 25,
  verification_complete: 50,
}
```

**New activity types to add:**
```javascript
// Add to SCORE_MAP in trackActivity.js
clinical_case_logged: 15,
study_plan_completed: 25,
spaced_rep_reviewed: 5,
exam_set_completed: 30,
doubt_asked: 5,
diary_entry: 3,
streak_7_day: 50,    // bonus for 7-day streak
streak_30_day: 200,  // bonus for 30-day streak
```

### 2.5 — Caching Strategy

Using `src/lib/dataCache.js` (in-memory Map with TTL):
- `getCached(key)` / `setCached(key, data, ttl)` / `invalidate(key)` / `invalidatePrefix(prefix)`
- Default TTL: 2 minutes
- Pattern: Show cached → fetch fresh → update cache

**New cache keys to use:**
```
'forYou_${userId}'          — AI suggestions (TTL: 10 min)
'studyPlan_${userId}'       — Active study plan (TTL: 5 min)
'leaderboard_${period}'     — Already exists (TTL: 2 min)
'diary_${userId}_${month}'  — Calendar diary (TTL: 3 min)
'examSets'                  — Published exam sets (TTL: 5 min)
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 3 — COMPONENT & UI/UX SPECIFICATIONS
## ═══════════════════════════════════════════════════════════════

### Design Tokens (use consistently across ALL new components):

```
Colors (Light Mode):
  --primary:     #2563EB (blue-600)
  --primary-hover: #1D4ED8 (blue-700)
  --accent:      #7C3AED (violet-600)
  --success:     #10B981 (emerald-500)
  --warning:     #F59E0B (amber-500)
  --danger:      #EF4444 (red-500)
  --surface:     #FFFFFF
  --surface-alt: #F8FAFC (slate-50)
  --text:        #1E293B (slate-800)
  --text-muted:  #64748B (slate-500)
  --border:      #E2E8F0 (slate-200)

Colors (Dark Mode — via data-theme="dark"):
  --surface:     #1E1E2E
  --surface-alt: #2A2A3C
  --text:        #E2E8F0
  --text-muted:  #94A3B8
  --border:      #3B3B50

Spacing: 4px grid (p-1=4px, p-2=8px, p-3=12px, p-4=16px, p-6=24px, p-8=32px)
Border Radius: rounded-lg (8px) for cards, rounded-xl (12px) for modals, rounded-full for pills/avatars
Shadows: shadow-sm for cards, shadow-lg for modals, shadow-xl for floating elements
Font Sizes: text-xs (12px), text-sm (14px), text-base (16px), text-lg (18px), text-xl (20px), text-2xl (24px)
Transitions: transition-all duration-200 ease-in-out (default), duration-300 for page-level
```

### Animation Tokens (Framer Motion):

```javascript
// Standard animations — use these exact values
const fadeIn    = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } };
const slideUp   = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
const scaleIn   = { initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 } };
const stagger   = { transition: { staggerChildren: 0.08 } };

// For lists — wrap items in motion.div with these:
const listItem  = { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 } };
```

### 3.1 — Login & Registration Overhaul

**File:** `src/components/Login.jsx` (507 lines — EDIT, don't replace)

**Changes:**
- Add iConnect logo at top (use SVG or emoji 🏥 as fallback)
- Make background gradient: `bg-gradient-to-br from-blue-50 via-white to-violet-50`
- Add animated medical illustration or subtle particle effect
- Ensure ALL fields in RegistrationPage are compulsory (currently optional): name, phone, email, college, speciality, state, MCI number
- Add field validation with red border + error message below each field
- Add password strength indicator (weak/medium/strong) with colored bar
- Registration flow: form → OTP verification → pending approval screen
- Login card: frosted glass effect (`backdrop-blur-xl bg-white/80 border border-white/20`)

**RegistrationPage.jsx** (472 lines — EDIT):
- Make ALL fields required with `required` attribute
- Add inline validation (red border on blur if empty)
- Add progress bar at top showing form completion %
- Disable submit button until all fields filled

### 3.2 — "For You" Section (Doctor Dashboard)

**File:** `src/components/DoctorDashboard.jsx` (1305 lines — EDIT)

**Add 3 AI recommendation cards** below the greeting section:
- Each card: gradient border, icon, title, personalized reason, action tag pill
- Cards animate in with stagger (0.08s delay each)
- "Refresh" button (🔄) regenerates suggestions via `getPersonalizedSuggestions()`
- Clicking a card navigates to the relevant page via `setPage(action)`
- Show skeleton loader while AI generates
- Cache suggestions for 10 minutes via `setCached('forYou_${userId}', suggestions, 600000)`
- Fallback: if AI fails, show 3 hardcoded default suggestions from `src/mocks/defaultSuggestions.js`

**Card Layout:**
```
┌──────────────────────────────────────────────────────┐
│  🎯 [Tag: Weak Area]                                 │
│  Review Pharmacology Basics                          │
│  Your quiz score in Pharma is 23% — below average    │
│                                          [→ Go]      │
└──────────────────────────────────────────────────────┘
```

### 3.3 — AI Study Plan Overhaul

**New Files:**
- `src/components/StudyPlan/StudyPlanPage.jsx` (main orchestrator, <300 lines)
- `src/components/StudyPlan/ClinicalLogger.jsx` (clinical case diary form)
- `src/components/StudyPlan/PersonaBuilder.jsx` (learning style questionnaire)
- `src/components/StudyPlan/WeeklyPlanner.jsx` (7-day dynamic planner)
- `src/components/StudyPlan/SpacedRepetition.jsx` (flashcard review queue)

**Add to App.jsx:**
```javascript
case 'study-plan': return <StudyPlanPage userId={userId} addToast={addToast} darkMode={darkMode} />;
```

**Add to Sidebar.jsx:** New nav item "Study Plan" with 📋 icon, between Dashboard and E-Books.

**Clinical Logger** (`ClinicalLogger.jsx`):
- Form: case title, speciality dropdown, key learnings textarea, difficulty selector
- Saves to `clinical_logs` table
- Shows last 10 entries in a scrollable list below
- Each entry is expandable (accordion)
- `trackActivity('clinical_case_logged', logId)`

**User Persona Builder** (`PersonaBuilder.jsx`):
- One-time questionnaire (show if `user_study_persona` row doesn't exist)
- Fields: learning style (visual/auditory/kinesthetic/reading), peak study hours, weekly goal, weak subjects (multi-select), exam date
- Saves to `user_study_persona` table
- Can be re-edited from Settings

**7-Day Dynamic Planner** (`WeeklyPlanner.jsx`):
- AI generates a 7-day plan using `generateContextualPlan(persona, clinicalLogs, errorBank, fatigueLevel)`
- Each day is a card showing: time blocks, subjects, tasks
- Features:
  - **Ward-to-Book Bridge**: "You logged a cardiac case → Review Harrison's Cardiology Ch. 12"
  - **Smart Schedule**: Adapts to user's `peak_hours` from persona
  - **Error Bank**: Auto-imports wrong answers from `exam_attempts` → suggests review
  - **Active Recall Audio**: Button to generate text script for audio review session
- Checkbox to mark tasks complete → `trackActivity('study_plan_completed')`
- Plan is saved to `study_plan_history` table
- "Regenerate" button creates a fresh plan

**Spaced Repetition** (`SpacedRepetition.jsx`):
- Flashcard queue based on SM-2 algorithm
- Cards sourced from: quiz errors, clinical logs, manual creation
- Review flow: show front → user rates (Again/Hard/Good/Easy) → update interval
- Daily review count badge on nav item
- `trackActivity('spaced_rep_reviewed', cardId)`

**Fatigue Algorithm** (in `aiService.js`):
```
Input: recent activity_logs (last 7 days), total study hours today, time since last break
Output: fatigue score 0-100
  0-30: Fresh → suggest challenging topics
  31-60: Moderate → mix of review and new material
  61-80: Tired → light review, flashcards only
  81-100: Burnout → suggest break, relaxation
```

### 3.4 — Activity Calendar with Diary

**File:** `src/components/ActivityPage.jsx` (436 lines — MAJOR EDIT)

**Current:** GitHub-style heatmap (90 days). **Keep this.**

**Add:**
- Make each date cell clickable
- On click: open a slide-in panel (right side, 400px wide) showing:
  - Date header (e.g., "Monday, March 17, 2026")
  - Activity log for that day (list of actions with times)
  - Diary section:
    - Mood selector (5 emoji faces: 😄 😊 😐 😟 😢)
    - Notes textarea (auto-saves on blur, debounced 1s)
    - Study hours input (number, 0-24)
    - "Goals Met?" toggle
  - Saves to `calendar_diary` table (upsert on user_id + date)
- Diary data overlays on heatmap: days with diary entries get a small dot indicator
- `trackActivity('diary_entry', date)`

### 3.5 — Recently Read & Bookmarks Audit

**File:** `src/components/EBooksPage.jsx` (731 lines — EDIT)

**Audit & Fix:**
- Ensure "Recently Read" tab shows artifacts where `user_content_state.current_page > 0`, sorted by `updated_at DESC`
- Ensure "Bookmarked" tab filters by `is_bookmarked = true`
- Add reading progress bar on each card (current_page / total_pages * 100%)
- Add "Continue Reading" button that opens the e-book at the last saved page
- If no recently read items: show friendly empty state with CTA to browse library
- If no bookmarks: show empty state "Bookmark articles to find them here"

### 3.6 — My Activity Audit (Productive vs Unproductive)

**File:** `src/components/ActivityPage.jsx` (same file as 3.4)

**Enhance the activity feed:**
- Color-code activities:
  - **Green (Productive):** quiz_passed, article_read, clinical_case_logged, study_plan_completed, spaced_rep_reviewed, exam_set_completed
  - **Yellow (Neutral):** daily_login, note_viewed, document_downloaded, diary_entry
  - **Red (Unproductive):** quiz_attempted (but failed), long gaps between activities (>3 hours during peak study time)
- Add daily summary card at top: "Today: 4h 23m productive, 1h 12m breaks"
- Add weekly trend mini-chart (sparkline) using recharts
- Productivity score: productive_minutes / total_active_minutes * 100

### 3.7 — Leaderboard Overhaul

**File:** `src/components/LeaderboardPage.jsx` (351 lines — MAJOR EDIT)

**Current:** Shows top 50 by score. **Enhance:**
- Show ALL users (paginated, 20 per page)
- Current user always highlighted with "You" badge, even if not in top 20
- Top 3: gold/silver/bronze medal icons + larger cards
- Each user row shows: rank, avatar, name, speciality, college, total score, quiz score, reading score
- "Jump to my rank" button that scrolls to current user
- Add streak counter (consecutive days with activity)
- Period tabs: All-Time / This Week / This Month (already exists, enhance UI)
- Speciality/College grouping tabs (already exists, enhance)
- Animate rank changes with Framer Motion (slide up/down)
- Show score delta from previous period (+12 ↑ or -5 ↓) in green/red

### 3.8 — Notifications UI Overhaul

**File:** `src/components/NotificationsPage.jsx` (342 lines — MAJOR EDIT)

**New UI:**
- Glass-morphism container (`backdrop-blur-xl bg-white/90 dark:bg-slate-900/90`)
- Each notification is a compact card (collapsed by default)
- Click to expand → shows full body text with slide-down animation
- Type-based left border color (info=blue, success=green, warn=amber, error=red)
- Group by date (Today, Yesterday, This Week, Older)
- Swipe-to-dismiss on mobile (use Framer Motion drag gesture)
- "Mark All Read" button at top
- Unread count badge on tab
- Empty state: 🔔 "You're all caught up!" with subtle confetti animation

### 3.9 — E-Book Reader Overhaul

**File:** `src/components/EBooksPage.jsx` (731 lines — focus on reader section)

**Current reader issues:** Wasted whitespace, no bookmark UI, notes panel cramped.

**Fixes:**
- Reader takes full viewport height (100vh - topbar height)
- PDF viewer: maximize width, remove unnecessary padding
- Floating toolbar at bottom-center (translucent, appears on hover):
  - Page navigation (prev/next/go-to)
  - Zoom controls (fit-width, fit-page, +/-)
  - Bookmark current page button (⭐)
  - Open notes panel button (📝)
  - Reading quiz button (🧠)
  - Smart notes button (✨)
  - Fullscreen toggle
- Notes panel: slides in from right (350px), resizable
- Bookmarked pages list: dropdown showing all bookmarked pages with jump-to
- Progress bar at very top of reader (thin, colored line showing reading progress)
- Remember last zoom level per artifact in localStorage

### 3.10 — Ask Your Doubts Workflow

**Current:** `ChatBot.jsx` (719 lines) has a `doubt` mode.

**Enhance:**
- When `chatBotMode === 'doubt'`:
  - Show a dedicated doubt submission form (not just chat)
  - Fields: question text, subject dropdown, attach image (optional)
  - Submit → AI answers via `askDoubtBuster(question)`
  - Show AI response in a styled card with:
    - Core concept section
    - Clinical relevance section
    - Mnemonics / memory tips
    - Common exam traps
  - "Save to Notes" button → saves to `user_notes`
  - "Ask Follow-up" button → continues conversation
  - History: show last 10 doubts in a collapsible sidebar
- Save doubt history to `activity_logs` with type `doubt_asked`

### 3.11 — Full Exam System

**Existing:** `ExamPage.jsx` (320 lines) — basic subject grid + MCQ flow.

**Enhance with Content Admin management:**

**New Files:**
- `src/components/Exam/ExamManager.jsx` (CA: create/edit exam sets)
- `src/components/Exam/ExamPlayer.jsx` (student: take exams)
- `src/components/Exam/ExamResults.jsx` (results + AI grading)
- `src/components/Exam/QuestionEditor.jsx` (CA: add/edit questions)

**Content Admin Flow (ExamManager):**
- Dashboard showing all exam sets (published/draft)
- Create new exam set: title, subject, time limit, difficulty
- Add questions: MCQ editor with A/B/C/D options, correct answer, explanation
- Bulk import from CSV (upload + parse)
- Publish/unpublish toggle
- View attempt statistics per exam set

**Student Flow (ExamPlayer):**
- Browse published exam sets (grid/list view)
- Start exam → timer countdown → MCQ interface
- Submit → score calculation → save to `exam_attempts`
- Wrong answers auto-added to `spaced_repetition_cards` (source: 'quiz_error')

**AI Grading (ExamResults):**
- After exam, show detailed results:
  - Score with percentage
  - Time taken
  - Per-question breakdown (correct/wrong/skipped)
  - AI explanation for each wrong answer via `explainQuestion()`
  - Knowledge gap analysis via `analyzeKnowledgeGap()`
  - Suggested study plan adjustment
- `trackActivity('exam_set_completed', examSetId)`

**Add to App.jsx renderPage:**
```javascript
case 'exam-manage': return <ExamManager userId={userId} addToast={addToast} />;
```

**Add to Sidebar.jsx:** "Manage Exams" nav item for Content Admin role only.

---

## ═══════════════════════════════════════════════════════════════
## SECTION 4 — PHASED EXECUTION PLAN
## ═══════════════════════════════════════════════════════════════

### PHASE 1: Foundation & Login Overhaul
**Scope:** Login, Registration, bug fixes, mock data setup
**Files to modify:** `Login.jsx`, `RegistrationPage.jsx`, `ProfileSetupPage.jsx`
**Files to create:** `src/mocks/defaultSuggestions.js`, `src/mocks/mockUsers.js`, `src/mocks/mockExamData.js`

**Tasks:**
1. Create `src/mocks/` folder with mock data files
2. Edit `Login.jsx`:
   - Add iConnect branding (logo placeholder + gradient background)
   - Add frosted glass card effect
   - Improve form validation UX
3. Edit `RegistrationPage.jsx`:
   - Make ALL fields compulsory with red asterisks
   - Add inline validation (red border on blur if empty)
   - Add progress bar showing form completion percentage
   - Disable submit until 100% complete
4. Run the SQL migrations from Section 2.2 (provide as separate `.sql` file at `src/migrations/001_schema_updates.sql`)
5. Fix known bugs:
   - Add `sender_id` to notification dispatch payloads (BroadcastPage.jsx lines where sender_id was removed — re-add them, now that the column migration exists)
   - Add click-outside handlers to Performance/Score dropdown
   - Add click-outside handlers to CA Engage filter dropdowns
   - Replace all `confirm()` calls with custom modal or toast-based confirmation
   - Add `e.stopPropagation()` to filter chip "×" remove buttons
   - Handle fetch failure in Engage landing stats (show 0 instead of "…")

**Commit:** `feat: Phase 1 — login overhaul + registration validation + bug fixes`

```
═══ PHASE 1 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

### PHASE 2: "For You" + AI Study Plan Engine
**Scope:** Dashboard AI cards, Clinical Logger, Persona Builder, new AI functions
**Files to modify:** `DoctorDashboard.jsx`, `aiService.js`, `trackActivity.js`, `App.jsx`, `Sidebar.jsx`
**Files to create:** `src/components/StudyPlan/StudyPlanPage.jsx`, `StudyPlan/ClinicalLogger.jsx`, `StudyPlan/PersonaBuilder.jsx`, `StudyPlan/WeeklyPlanner.jsx`

**Tasks:**
1. Add new AI functions to `aiService.js`:
   - `generateContextualPlan(persona, clinicalLogs, errorBank, fatigueLevel)`
   - `assessFatigueLevel(activityLogs, studyHours, lastBreak)`
   - `generateActiveRecallAudio(topic, difficulty)`
2. Add new activity types to `trackActivity.js` SCORE_MAP
3. Edit `DoctorDashboard.jsx`:
   - Add "For You" section with 3 AI recommendation cards
   - Use `getPersonalizedSuggestions()` (already exists in aiService.js)
   - Skeleton loader while generating, cache for 10 min
   - Mock fallback from `src/mocks/defaultSuggestions.js`
4. Create StudyPlan folder and components:
   - `StudyPlanPage.jsx`: Tab bar (Clinical Logger | My Plan | Flashcards | Persona)
   - `ClinicalLogger.jsx`: Form + recent entries list
   - `PersonaBuilder.jsx`: Questionnaire form → saves to user_study_persona
   - `WeeklyPlanner.jsx`: AI-generated 7-day plan with task checkboxes
5. Add "Study Plan" to Sidebar and App.jsx routing

**Commit:** `feat: Phase 2 — For You AI cards + Study Plan engine`

```
═══ PHASE 2 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

### PHASE 3: Activity Calendar + Diary + My Activity Colors
**Scope:** Clickable calendar, diary panel, productive/unproductive coloring
**Files to modify:** `ActivityPage.jsx`
**Files to create:** (sub-components if ActivityPage exceeds 300 lines)

**Tasks:**
1. Make heatmap dates clickable
2. Add slide-in diary panel (right side):
   - Mood selector (5 emojis)
   - Notes textarea (debounced auto-save)
   - Study hours input
   - Goals met toggle
   - Activity log for that day
3. Save/load diary data from `calendar_diary` table
4. Color-code activity feed items:
   - Green: productive activities
   - Yellow: neutral activities
   - Red: unproductive patterns
5. Add daily productivity summary card
6. Add weekly trend sparkline chart
7. Dot indicator on heatmap for days with diary entries

**Commit:** `feat: Phase 3 — clickable activity calendar + diary + productivity colors`

```
═══ PHASE 3 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

### PHASE 4: Leaderboard + Notifications + E-Book Reader
**Scope:** Leaderboard all-users view, glass-box notifications, reader space optimization
**Files to modify:** `LeaderboardPage.jsx`, `NotificationsPage.jsx`, `EBooksPage.jsx`

**Tasks:**
1. **Leaderboard:**
   - Show all users (paginated)
   - Highlight current user with "You" badge
   - Top 3 medal cards (gold/silver/bronze)
   - Streak counter
   - Score delta arrows (+12 ↑ green / -5 ↓ red)
   - "Jump to my rank" button
2. **Notifications:**
   - Glass-morphism container
   - Click-to-expand cards with slide animation
   - Type-based left border colors
   - Group by date (Today, Yesterday, This Week, Older)
   - "Mark All Read" button
   - Empty state with confetti
3. **E-Book Reader:**
   - Full viewport height reader
   - Floating bottom toolbar (translucent, hover-reveal)
   - Bookmarked pages dropdown
   - Thin progress bar at top
   - Notes panel slides from right (350px)
   - Remember zoom level in localStorage
4. **Recently Read & Bookmarks audit:**
   - Verify Recently Read tab logic
   - Add progress bar on each card
   - "Continue Reading" button
   - Empty states for both tabs

**Commit:** `feat: Phase 4 — leaderboard all-users + glass notifications + reader overhaul`

```
═══ PHASE 4 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

### PHASE 5: Exam System + Doubt Workflow + Spaced Repetition
**Scope:** Full exam CRUD, AI grading, doubt enhancements, SR flashcards
**Files to modify:** `ExamPage.jsx`, `ChatBot.jsx`, `App.jsx`, `Sidebar.jsx`
**Files to create:** `src/components/Exam/ExamManager.jsx`, `Exam/ExamPlayer.jsx`, `Exam/ExamResults.jsx`, `Exam/QuestionEditor.jsx`, `src/components/StudyPlan/SpacedRepetition.jsx`

**Tasks:**
1. **Exam System (Content Admin):**
   - ExamManager: CRUD for exam sets
   - QuestionEditor: Add/edit MCQs with explanations
   - CSV bulk import for questions
   - Publish/unpublish toggle
   - Attempt statistics dashboard
2. **Exam System (Student):**
   - ExamPlayer: timed exam with MCQ interface
   - ExamResults: detailed breakdown + AI explanations
   - Auto-add wrong answers to spaced_repetition_cards
   - Knowledge gap analysis via AI
3. **Doubt Workflow Enhancement:**
   - Dedicated doubt form (subject dropdown, image attach)
   - Styled AI response card with sections
   - "Save to Notes" and "Ask Follow-up" buttons
   - Doubt history sidebar
4. **Spaced Repetition:**
   - SM-2 algorithm implementation
   - Flashcard review queue (daily)
   - Rate: Again/Hard/Good/Easy → update interval
   - Source tracking (quiz_error, clinical_log, manual)
   - Daily review count badge
5. Add new AI function to `aiService.js`:
   - `generateSpacedRepetitionCards(wrongAnswers, subject)`
   - `gradeSubjectiveAnswer(question, studentAnswer, rubric)`
6. Add Exam routes to App.jsx, Sidebar items for CA

**Commit:** `feat: Phase 5 — full exam system + doubt workflow + spaced repetition`

```
═══ PHASE 5 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

### PHASE 6: Polish, Integration & Final Audit
**Scope:** Cross-feature integration, dark mode audit, performance, final fixes

**Tasks:**
1. **Dark Mode Audit:** Check EVERY new component for proper dark mode support
2. **Skeleton Audit:** Verify every data-dependent view shows skeleton while loading
3. **Error Boundary Audit:** Wrap all new page-level components
4. **Activity Tracking Audit:** Verify all new user actions are tracked
5. **Toast Audit:** Replace any remaining `alert()`/`confirm()` calls
6. **Mobile Responsiveness:** Test all new components at 375px width
7. **Performance:**
   - Add `useMemo` where computed lists exist
   - Debounce all save operations
   - Lazy-load heavy components (ExamPlayer, SpacedRepetition)
8. **Integration Tests:**
   - Study Plan → Spaced Repetition (quiz errors flow to flashcards)
   - Exam → Results → Knowledge Gap → Study Plan update
   - Clinical Logger → Ward-to-Book Bridge in Weekly Planner
   - Activity → Heatmap → Diary → Productivity Score
9. **Mock Data Cleanup:** Verify all mock imports have real-data switches
10. **Final commit message format:**

**Commit:** `feat: Phase 6 — polish, dark mode audit, integration, performance`

```
═══ PHASE 6 COMPLETE ═══
ALL PHASES DONE. Do not proceed further.
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 5 — CLI WORKFLOW RULES
## ═══════════════════════════════════════════════════════════════

### Terminal Behavior:
1. **NEVER run `git push`** — Ayush pushes manually after review
2. **Commit after each phase** — Use descriptive commit messages
3. **Full autonomy within a phase** — Don't ask "should I proceed?" mid-phase. Just execute.
4. **Hard stop after each phase** — Print the phase-complete banner and WAIT
5. **Read before write** — Always `cat` or read a file before editing it. Never edit blind.
6. **Backup before major edits** — For files >500 lines, create a `.bak` copy first
7. **Test after each file edit** — Run `npm run build` (or at minimum check for syntax errors) after editing critical files
8. **No new dependencies** — Use only packages already in `package.json`. If absolutely needed, ask first.
9. **File size check** — After editing, verify the file hasn't exceeded 300 lines. Split if needed.
10. **SQL migrations** — Write all SQL to `src/migrations/` folder. Never run SQL directly. Ayush applies them in Supabase dashboard.

### Commit Message Format:
```
type: Phase N — short description

- bullet point of what changed
- another change

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `style`, `docs`

---

## ═══════════════════════════════════════════════════════════════
## SECTION 6 — TECHNICAL SAFEGUARDS
## ═══════════════════════════════════════════════════════════════

### 6.1 — 5-Paragraph Implementation Guide (MANDATORY)

Before writing ANY code for a new feature, output this structure:

```
## Implementation Guide: [Feature Name]

**P1 — What it does:** [User-facing description]
**P2 — Existing files affected:** [List with line numbers]
**P3 — New files to create:** [List with expected line counts]
**P4 — Data flow:** [Table → Supabase query → React state → UI component]
**P5 — Edge cases:** [Error states, empty data, offline, dark mode]
```

### 6.2 — Mock Data Isolation

```
src/mocks/
├── defaultSuggestions.js    — "For You" fallback suggestions
├── mockUsers.js             — Fake user profiles for leaderboard dev
├── mockExamData.js          — Sample exam questions for ExamPlayer dev
├── mockActivityLogs.js      — Fake activity entries for calendar dev
├── mockClinicalLogs.js      — Sample clinical cases for Study Plan dev
└── index.js                 — Central export with USE_MOCKS flag
```

**Usage pattern in components:**
```javascript
import { USE_MOCKS, mockSuggestions } from '../mocks';

// In useEffect:
if (USE_MOCKS) {
  setData(mockSuggestions);
  return;
}
// ... real Supabase fetch
```

**`src/mocks/index.js`:**
```javascript
// Set to false before production deployment
export const USE_MOCKS = false;

export { defaultSuggestions } from './defaultSuggestions';
export { mockUsers } from './mockUsers';
export { mockExamData } from './mockExamData';
export { mockActivityLogs } from './mockActivityLogs';
export { mockClinicalLogs } from './mockClinicalLogs';
```

### 6.3 — Component Modularity (<300 Lines)

If a component exceeds 300 lines, split using this pattern:

```
src/components/FeatureName/
├── FeatureNamePage.jsx      — Main orchestrator (routes between sub-views)
├── SubComponentA.jsx        — Specific view/form
├── SubComponentB.jsx        — Specific view/form
├── hooks/
│   └── useFeatureData.js    — Custom hook for data fetching
└── constants.js             — Feature-specific constants
```

### 6.4 — Skeleton Loading (MANDATORY for all views)

```jsx
import Skeleton from '../ui/Skeleton';  // Already exists at src/components/Skeleton.jsx

// Use in every data-dependent component:
if (loading) return (
  <div className="space-y-4 p-6">
    <Skeleton className="h-8 w-48" />          {/* Title */}
    <Skeleton className="h-4 w-full" />         {/* Line */}
    <Skeleton className="h-4 w-3/4" />          {/* Line */}
    <div className="grid grid-cols-3 gap-4">
      <Skeleton className="h-32" />             {/* Card */}
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  </div>
);
```

### 6.5 — Error Handling Pattern

```jsx
// Every Supabase query must follow this pattern:
try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  setData(data || []);
} catch (err) {
  console.warn('[ComponentName] fetch failed:', err.message);
  addToast('error', 'Could not load data. Please refresh.');
  setData([]); // Always set safe fallback
} finally {
  setLoading(false);
}
```

### 6.6 — Known Bugs to Fix in Phase 1

| # | Bug | Location | Fix |
|---|-----|----------|-----|
| 1 | RLS blocks notification INSERT | Supabase | SQL: `CREATE POLICY` for authenticated INSERT |
| 2 | SAMessageBox invisible (no sender_id) | BroadcastPage.jsx | Add column via migration, re-add sender_id to payloads |
| 3 | Score dropdown no click-outside | BroadcastPage.jsx ~line 1200 | Add useRef + mousedown listener |
| 4 | CA filter dropdowns no click-outside | BroadcastPage.jsx ~line 1700 | Same pattern as #3 |
| 5 | "Recent Sends" always empty | BroadcastPage.jsx ~line 200 | Fix query after sender_id column exists |
| 6 | Landing stats show "…" on failure | BroadcastPage.jsx ~line 650 | Catch error → show 0 |
| 7 | `confirm()` blocked in deployments | Multiple files | Replace with custom confirm modal |
| 8 | Filter chip × missing stopPropagation | BroadcastPage.jsx | Add `e.stopPropagation()` to onClick |

---

## ═══════════════════════════════════════════════════════════════
## SECTION 7 — FILE INVENTORY (Quick Reference)
## ═══════════════════════════════════════════════════════════════

### Existing Files to MODIFY (do NOT delete/replace — EDIT only):
```
src/App.jsx                          (483 lines)  — Add new routes + imports
src/components/Login.jsx             (507 lines)  — UI overhaul
src/components/RegistrationPage.jsx  (472 lines)  — Make fields compulsory
src/components/DoctorDashboard.jsx   (1305 lines) — Add "For You" cards
src/components/ActivityPage.jsx      (436 lines)  — Clickable dates + diary + colors
src/components/LeaderboardPage.jsx   (351 lines)  — All-users view
src/components/NotificationsPage.jsx (342 lines)  — Glass-box UI
src/components/EBooksPage.jsx        (731 lines)  — Reader overhaul
src/components/ExamPage.jsx          (320 lines)  — Enhanced exam flow
src/components/ChatBot.jsx           (719 lines)  — Doubt workflow
src/components/BroadcastPage.jsx     (1943 lines) — Bug fixes
src/components/Sidebar.jsx           (208 lines)  — New nav items
src/lib/aiService.js                 (267 lines)  — New AI functions
src/lib/trackActivity.js            (55 lines)   — New activity types
```

### New Files to CREATE:
```
src/mocks/index.js
src/mocks/defaultSuggestions.js
src/mocks/mockUsers.js
src/mocks/mockExamData.js
src/mocks/mockActivityLogs.js
src/mocks/mockClinicalLogs.js
src/migrations/001_schema_updates.sql
src/components/StudyPlan/StudyPlanPage.jsx
src/components/StudyPlan/ClinicalLogger.jsx
src/components/StudyPlan/PersonaBuilder.jsx
src/components/StudyPlan/WeeklyPlanner.jsx
src/components/StudyPlan/SpacedRepetition.jsx
src/components/Exam/ExamManager.jsx
src/components/Exam/ExamPlayer.jsx
src/components/Exam/ExamResults.jsx
src/components/Exam/QuestionEditor.jsx
```

---

**END OF MASTER BLUEPRINT**

Copy this entire document into Claude Code (Sonnet) terminal. It will execute Phase 1 and stop. Type "next" to proceed to each subsequent phase.
