-- ─── 008_exam_concurrency_lock.sql ───────────────────────────────────────────
-- Prevents concurrent exam submissions from same user for same subject.

-- Unique constraint: one attempt per user per subject per day (prevents rage-submit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_attempts_unique_daily
  ON exam_attempts (user_id, subject_id, date_trunc('day', created_at));

-- Quiz attempts: one completion per user per quiz
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_attempts_unique
  ON quiz_attempts (user_id, quiz_id);

-- Arena answers: one answer per user per question in an arena session
CREATE UNIQUE INDEX IF NOT EXISTS idx_arena_answers_unique
  ON arena_answers (arena_id, user_id, question_index);

-- Cooldown trigger: reject exam_attempts within 30 seconds of the last attempt
CREATE OR REPLACE FUNCTION fn_check_exam_cooldown()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  last_attempt timestamptz;
BEGIN
  SELECT MAX(created_at) INTO last_attempt
  FROM exam_attempts
  WHERE user_id = NEW.user_id
    AND subject_id = NEW.subject_id;

  IF last_attempt IS NOT NULL AND last_attempt > now() - interval '30 seconds' THEN
    RAISE EXCEPTION 'exam_cooldown: Please wait before retrying.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_exam_cooldown
  BEFORE INSERT ON exam_attempts
  FOR EACH ROW EXECUTE FUNCTION fn_check_exam_cooldown();

-- Advisory lock helper function (prevents race conditions in concurrent submissions)
CREATE OR REPLACE FUNCTION acquire_exam_lock(p_user_id uuid, p_subject_id uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  lock_key bigint;
BEGIN
  -- Generate a deterministic lock key from user_id + subject_id
  lock_key := ('x' || substr(md5(p_user_id::text || p_subject_id::text), 1, 16))::bit(64)::bigint;
  RETURN pg_try_advisory_xact_lock(lock_key);
END;
$$;
