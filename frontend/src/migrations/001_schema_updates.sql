-- ═══════════════════════════════════════════════════════════════
-- iConnect Office — Schema Update Migration 001
-- Apply in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Profile enhancements ─────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- ── 2. Notifications: add sender_id (fixes SAMessageBox + Recent Sends) ──
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id);

-- ── 3. Notification RLS policies (fixes INSERT permission for authenticated users) ──
-- Allow authenticated users to insert notifications (needed for broadcast dispatch)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'authenticated_insert_notifications'
  ) THEN
    CREATE POLICY "authenticated_insert_notifications"
      ON notifications FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Allow users to read their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'users_read_own_notifications'
  ) THEN
    CREATE POLICY "users_read_own_notifications"
      ON notifications FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ── 4. AI Study Plan Engine tables ──────────────────────────────

CREATE TABLE IF NOT EXISTS clinical_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  case_title TEXT NOT NULL,
  speciality TEXT,
  key_learnings TEXT,
  difficulty TEXT DEFAULT 'medium', -- 'easy' | 'medium' | 'hard'
  logged_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clinical_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clinical_logs' AND policyname = 'users_manage_own_clinical_logs'
  ) THEN
    CREATE POLICY "users_manage_own_clinical_logs"
      ON clinical_logs FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 5. User Study Persona ────────────────────────────────────────

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

ALTER TABLE user_study_persona ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_study_persona' AND policyname = 'users_manage_own_persona'
  ) THEN
    CREATE POLICY "users_manage_own_persona"
      ON user_study_persona FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 6. Study Plan History ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS study_plan_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE study_plan_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'study_plan_history' AND policyname = 'users_manage_own_study_plans'
  ) THEN
    CREATE POLICY "users_manage_own_study_plans"
      ON study_plan_history FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 7. Spaced Repetition Cards ───────────────────────────────────

CREATE TABLE IF NOT EXISTS spaced_repetition_cards (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  ease_factor REAL DEFAULT 2.5,
  interval_days INT DEFAULT 1,
  repetitions INT DEFAULT 0,
  next_review DATE DEFAULT CURRENT_DATE,
  last_review TIMESTAMPTZ,
  source TEXT, -- 'clinical_log' | 'quiz_error' | 'manual' | 'ai_generated'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE spaced_repetition_cards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'spaced_repetition_cards' AND policyname = 'users_manage_own_sr_cards'
  ) THEN
    CREATE POLICY "users_manage_own_sr_cards"
      ON spaced_repetition_cards FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 8. Calendar Diary ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_diary (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood TEXT,
  notes TEXT,
  goals_met BOOLEAN DEFAULT false,
  study_hours REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE calendar_diary ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'calendar_diary' AND policyname = 'users_manage_own_diary'
  ) THEN
    CREATE POLICY "users_manage_own_diary"
      ON calendar_diary FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 9. Exam Sets ─────────────────────────────────────────────────

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

ALTER TABLE exam_sets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exam_sets' AND policyname = 'published_exam_sets_readable'
  ) THEN
    CREATE POLICY "published_exam_sets_readable"
      ON exam_sets FOR SELECT TO authenticated
      USING (is_published = true OR created_by = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exam_sets' AND policyname = 'ca_manage_exam_sets'
  ) THEN
    CREATE POLICY "ca_manage_exam_sets"
      ON exam_sets FOR ALL TO authenticated
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

-- ── Done ─────────────────────────────────────────────────────────
-- After applying, verify with:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'notifications' AND column_name = 'sender_id';
