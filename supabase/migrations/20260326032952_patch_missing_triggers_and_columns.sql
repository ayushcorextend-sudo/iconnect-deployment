-- ============================================================
-- Migration: Patch gaps in 20260324083653_missing_tables_and_columns.sql
-- Adds:
--   1. updated_at auto-trigger on all 6 tables (was missing)
--   2. calendar_diary: study_hours, goals_met columns (used by DayDetailPanel)
--   3. user_study_persona: weekly_target_mins column (used by GoalRing)
--   4. clinical_logs: updated_at column (was missing)
--   5. Commented-out DOWN migration at the bottom
-- Author: Opus — 2026-03-26
-- ============================================================

-- ── 1. Shared updated_at trigger function ──────────────────────
-- Safe: CREATE OR REPLACE doesn't fail if it already exists.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Attach trigger to all 6 tables ─────────────────────────
-- DROP IF EXISTS ensures idempotency (safe to re-run).

DROP TRIGGER IF EXISTS trg_calendar_diary_updated_at ON calendar_diary;
CREATE TRIGGER trg_calendar_diary_updated_at
  BEFORE UPDATE ON calendar_diary
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_study_persona_updated_at ON user_study_persona;
CREATE TRIGGER trg_user_study_persona_updated_at
  BEFORE UPDATE ON user_study_persona
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_study_plan_history_updated_at ON study_plan_history;
CREATE TRIGGER trg_study_plan_history_updated_at
  BEFORE UPDATE ON study_plan_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_notes_updated_at ON user_notes;
CREATE TRIGGER trg_user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- clinical_logs was missing updated_at column entirely — add it first
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS trg_clinical_logs_updated_at ON clinical_logs;
CREATE TRIGGER trg_clinical_logs_updated_at
  BEFORE UPDATE ON clinical_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- idempotency_keys doesn't need updated_at (write-once, read-only),
-- but adding the trigger anyway for consistency with the blueprint spec.
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS trg_idempotency_keys_updated_at ON idempotency_keys;
CREATE TRIGGER trg_idempotency_keys_updated_at
  BEFORE UPDATE ON idempotency_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Missing columns on calendar_diary ──────────────────────
-- DayDetailPanel.jsx reads study_hours and goals_met; DiaryPanel uses them too.
ALTER TABLE calendar_diary ADD COLUMN IF NOT EXISTS study_hours NUMERIC(4,1) DEFAULT 0;
ALTER TABLE calendar_diary ADD COLUMN IF NOT EXISTS goals_met BOOLEAN DEFAULT false;

-- ── 4. Missing column on user_study_persona ───────────────────
-- GoalRing.jsx persists weekly target to DB (upsert on user_id).
ALTER TABLE user_study_persona ADD COLUMN IF NOT EXISTS weekly_target_mins INTEGER DEFAULT 300;

-- ── 5. Index for the new column (GoalRing queries by user_id, already indexed via UNIQUE) ──
-- No additional index needed — user_study_persona.user_id is already UNIQUE.

-- ============================================================
-- DOWN MIGRATION (rollback) — Run manually if needed.
-- Uncomment and execute to reverse this migration ONLY.
-- ============================================================
/*
-- Drop triggers
DROP TRIGGER IF EXISTS trg_calendar_diary_updated_at ON calendar_diary;
DROP TRIGGER IF EXISTS trg_user_study_persona_updated_at ON user_study_persona;
DROP TRIGGER IF EXISTS trg_study_plan_history_updated_at ON study_plan_history;
DROP TRIGGER IF EXISTS trg_user_notes_updated_at ON user_notes;
DROP TRIGGER IF EXISTS trg_clinical_logs_updated_at ON clinical_logs;
DROP TRIGGER IF EXISTS trg_idempotency_keys_updated_at ON idempotency_keys;

-- Drop the shared trigger function (only if no other tables use it)
-- DROP FUNCTION IF EXISTS public.set_updated_at();

-- Drop added columns
ALTER TABLE calendar_diary DROP COLUMN IF EXISTS study_hours;
ALTER TABLE calendar_diary DROP COLUMN IF EXISTS goals_met;
ALTER TABLE user_study_persona DROP COLUMN IF EXISTS weekly_target_mins;
ALTER TABLE clinical_logs DROP COLUMN IF EXISTS updated_at;
ALTER TABLE idempotency_keys DROP COLUMN IF EXISTS updated_at;

-- NOTE: This does NOT drop the 6 tables themselves.
-- To fully reverse the original migration, also run:
-- DROP TABLE IF EXISTS calendar_diary CASCADE;
-- DROP TABLE IF EXISTS user_study_persona CASCADE;
-- DROP TABLE IF EXISTS clinical_logs CASCADE;
-- DROP TABLE IF EXISTS study_plan_history CASCADE;
-- DROP TABLE IF EXISTS user_notes CASCADE;
-- DROP TABLE IF EXISTS idempotency_keys CASCADE;
-- ALTER TABLE activity_logs DROP COLUMN IF EXISTS duration_minutes;
*/
