-- ─── 007_idempotency_keys.sql ────────────────────────────────────────────────
-- Prevents double-submission of exam/quiz/arena/doubt mutations.
-- Client generates a UUID idempotency key; server rejects duplicate inserts.

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text        NOT NULL UNIQUE,        -- client-generated UUID
  endpoint     text        NOT NULL,               -- e.g. 'quiz_attempt', 'exam_attempt'
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  payload_hash text        NOT NULL,               -- SHA-256 of the request body
  result       jsonb,                              -- stored response for replay
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);

-- Auto-cleanup: delete expired keys
CREATE OR REPLACE FUNCTION fn_cleanup_idempotency_keys()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < now();
END;
$$;

-- Index for fast duplicate lookup
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys (key);
CREATE INDEX IF NOT EXISTS idx_idempotency_user ON idempotency_keys (user_id, endpoint, created_at DESC);

-- RLS: each user can only see/insert their own keys
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_idempotency" ON idempotency_keys
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
