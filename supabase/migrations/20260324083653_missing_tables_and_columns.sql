-- ============================================================
-- Migration: Create 6 missing tables + 2 missing columns
-- NOTE: Some tables already existed on remote with partial schemas.
-- This migration uses IF NOT EXISTS guards throughout and also
-- patches missing columns on pre-existing tables.
-- Author: Opus Architecture Blueprint — Phase 1
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
-- Patch missing columns on pre-existing calendar_diary
ALTER TABLE calendar_diary ADD COLUMN IF NOT EXISTS entries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE calendar_diary ADD COLUMN IF NOT EXISTS mood TEXT;
ALTER TABLE calendar_diary ADD COLUMN IF NOT EXISTS personal_notes TEXT;
ALTER TABLE calendar_diary ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE calendar_diary ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

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
-- Patch missing columns on pre-existing user_study_persona
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS learning_style TEXT;
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS study_hours_per_day INTEGER DEFAULT 4;
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS preferred_subjects TEXT[] DEFAULT '{}';
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS weak_areas TEXT[] DEFAULT '{}';
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS strong_areas TEXT[] DEFAULT '{}';
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS peak_hours TEXT;
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS exam_date DATE;
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS weekly_goal_hours INTEGER DEFAULT 20;
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

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
-- Patch missing columns on pre-existing clinical_logs
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS presentation TEXT;
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS learning_points TEXT;
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS speciality TEXT;
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

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
-- Patch missing columns on pre-existing study_plan_history
ALTER TABLE study_plan_history ADD COLUMN IF NOT EXISTS week_start DATE;
ALTER TABLE study_plan_history ADD COLUMN IF NOT EXISTS plan JSONB DEFAULT '[]'::jsonb;
ALTER TABLE study_plan_history ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE study_plan_history ADD COLUMN IF NOT EXISTS completed_tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE study_plan_history ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE study_plan_history ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE study_plan_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE study_plan_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

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
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS page_number INTEGER;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS highlight_text TEXT;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 6. idempotency_keys — submit-exam edge function
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS result JSONB;
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 7. duration_minutes on activity_logs (was always 0, now tracked properly)
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
