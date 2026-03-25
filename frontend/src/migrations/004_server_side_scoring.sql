-- ═══════════════════════════════════════════════════════════════
-- iConnect Office — Migration 004: Server-Side Scoring Triggers
-- Replaces client-side SCORE_MAP in trackActivity.js
-- ═══════════════════════════════════════════════════════════════

INSERT INTO schema_versions (version, name)
VALUES (4, 'server_side_scoring')
ON CONFLICT (version) DO NOTHING;

-- ── Score rules table (single source of truth for all activity points) ────────
CREATE TABLE IF NOT EXISTS score_rules (
  activity_type TEXT PRIMARY KEY,
  score_delta   INT NOT NULL DEFAULT 0
);

INSERT INTO score_rules (activity_type, score_delta) VALUES
  ('quiz_attempted',          5),
  ('quiz_passed',            20),
  ('article_read',           10),
  ('note_viewed',             5),
  ('document_downloaded',     5),
  ('webinar_attended',       30),
  ('daily_login',             2),
  ('profile_complete',       25),
  ('verification_complete',  50),
  ('clinical_case_logged',   15),
  ('study_plan_completed',   25),
  ('spaced_rep_reviewed',     5),
  ('exam_set_completed',     30),
  ('doubt_asked',             5),
  ('diary_entry',             3),
  ('streak_7_day',           50),
  ('streak_30_day',         200)
ON CONFLICT (activity_type) DO NOTHING;

-- ── Trigger: auto-fill score_delta on activity_logs INSERT ───────────────────
CREATE OR REPLACE FUNCTION fn_fill_score_delta()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(score_delta, 0)
  INTO NEW.score_delta
  FROM score_rules
  WHERE activity_type = NEW.activity_type;

  IF NEW.score_delta IS NULL THEN NEW.score_delta := 0; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_score_delta ON activity_logs;
CREATE TRIGGER trg_fill_score_delta
  BEFORE INSERT ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION fn_fill_score_delta();

-- ── Trigger: auto-update user_scores on activity_logs INSERT ─────────────────
CREATE OR REPLACE FUNCTION fn_update_user_scores()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_scores (user_id, total_score, quiz_score, reading_score, updated_at)
  VALUES (
    NEW.user_id,
    NEW.score_delta,
    CASE WHEN NEW.activity_type LIKE 'quiz_%' THEN NEW.score_delta ELSE 0 END,
    CASE WHEN NEW.activity_type IN ('article_read', 'note_viewed') THEN NEW.score_delta ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_score   = user_scores.total_score + NEW.score_delta,
    quiz_score    = user_scores.quiz_score +
      CASE WHEN NEW.activity_type LIKE 'quiz_%' THEN NEW.score_delta ELSE 0 END,
    reading_score = user_scores.reading_score +
      CASE WHEN NEW.activity_type IN ('article_read', 'note_viewed') THEN NEW.score_delta ELSE 0 END,
    updated_at    = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_user_scores ON activity_logs;
CREATE TRIGGER trg_update_user_scores
  AFTER INSERT ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION fn_update_user_scores();

-- Verify: SELECT * FROM score_rules ORDER BY score_delta DESC;
