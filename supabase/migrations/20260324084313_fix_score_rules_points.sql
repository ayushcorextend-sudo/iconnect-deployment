-- ============================================================
-- Migration: Fix score_rules point values
-- score_rules existed on remote but was missing the 'points' column.
-- Previous migration added the column (DEFAULT 0) and used
-- ON CONFLICT DO NOTHING, so existing rows have points = 0.
-- This migration sets the correct point values for all rows.
-- ============================================================

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
ON CONFLICT (activity_type) DO UPDATE SET
  points      = EXCLUDED.points,
  description = EXCLUDED.description;
