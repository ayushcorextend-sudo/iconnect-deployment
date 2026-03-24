-- ============================================================
-- Migration: Scoring system — score_rules table + auto-score trigger
-- user_scores already exists (user_id is PK, already unique).
-- This migration adds the rules lookup table and a trigger that
-- auto-populates score_delta on activity_logs INSERT and upserts
-- user_scores so the leaderboard always reflects real activity.
-- Author: Opus Architecture Blueprint — Phase 1
-- ============================================================

-- Score rules lookup table
CREATE TABLE IF NOT EXISTS score_rules (
  activity_type TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0,
  description TEXT
);
-- Patch missing columns on pre-existing score_rules
ALTER TABLE score_rules ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE score_rules ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO score_rules (activity_type, points, description) VALUES
  ('daily_login',           5,  'Daily login bonus'),
  ('article_read',          10, 'Read an article or book'),
  ('quiz_complete',         20, 'Completed a quiz'),
  ('quiz_passed',           30, 'Passed a quiz'),
  ('quiz_attempted',        5,  'Attempted quiz'),
  ('exam_set_completed',    50, 'Completed an exam set'),
  ('study_plan_completed',  15, 'Completed study plan task'),
  ('spaced_rep_reviewed',   10, 'Reviewed spaced repetition'),
  ('clinical_case_logged',  20, 'Logged clinical case'),
  ('diary_entry',           5,  'Wrote diary entry'),
  ('webinar_attended',      25, 'Attended webinar'),
  ('arena_completed',       30, 'Completed live arena'),
  ('note_created',          5,  'Created study note'),
  ('smart_note_created',    10, 'Generated AI smart note')
ON CONFLICT (activity_type) DO NOTHING;

-- Enable RLS on score_rules (read-only for everyone)
ALTER TABLE score_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Anyone can read score rules' AND tablename='score_rules') THEN
    CREATE POLICY "Anyone can read score rules" ON score_rules FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================================
-- TRIGGER: auto-populate score_delta + upsert user_scores
-- Fires BEFORE INSERT on activity_logs so score_delta is written
-- into the new row at insert time, and user_scores is updated.
-- Uses SECURITY DEFINER so it can write to user_scores regardless
-- of the calling user's RLS context.
-- ============================================================

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
      updated_at  = now();
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
