-- Doctor UX Enhancement Migration
-- Tables: reading_progress, smart_notes, user_reminders
-- Run in Supabase Dashboard → SQL Editor

-- ─────────────────────────────────────────
-- 1. reading_progress
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id   uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  subject       text,
  quiz_score    int NOT NULL DEFAULT 0,
  quiz_total    int NOT NULL DEFAULT 0,
  points_awarded int NOT NULL DEFAULT 0,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, artifact_id)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reading_progress"
  ON reading_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reading_progress"
  ON reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reading_progress"
  ON reading_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user
  ON reading_progress (user_id);

-- ─────────────────────────────────────────
-- 2. smart_notes
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smart_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id   uuid REFERENCES artifacts(id) ON DELETE SET NULL,
  subject       text,
  original_text text NOT NULL,
  ai_note       text,
  ai_mnemonic   text,
  tags          text[] DEFAULT '{}',
  is_starred    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE smart_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own smart_notes"
  ON smart_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own smart_notes"
  ON smart_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own smart_notes"
  ON smart_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own smart_notes"
  ON smart_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_smart_notes_user
  ON smart_notes (user_id);

CREATE INDEX IF NOT EXISTS idx_smart_notes_starred
  ON smart_notes (user_id, is_starred)
  WHERE is_starred = true;

-- ─────────────────────────────────────────
-- 3. user_reminders
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_reminders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webinar_id    uuid REFERENCES admin_webinars(id) ON DELETE CASCADE,
  remind_at     timestamptz NOT NULL,
  lead_minutes  int NOT NULL DEFAULT 60,
  channels      text[] NOT NULL DEFAULT '{in_app}',
  dispatched    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reminders"
  ON user_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reminders"
  ON user_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reminders"
  ON user_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own reminders"
  ON user_reminders FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_reminders_user
  ON user_reminders (user_id);

CREATE INDEX IF NOT EXISTS idx_user_reminders_dispatch
  ON user_reminders (remind_at)
  WHERE dispatched = false;
