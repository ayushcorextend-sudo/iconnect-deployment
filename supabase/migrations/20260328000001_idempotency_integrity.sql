-- Phase 2.3 — Fix idempotency_keys schema + add UNIQUE constraint
-- Eliminates TOCTOU race: DB-level uniqueness replaces app-level check-then-insert.
--
-- The table previously only had (id, key, result, created_at).
-- Adding missing columns and the composite UNIQUE index.

ALTER TABLE idempotency_keys
  ADD COLUMN IF NOT EXISTS user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS endpoint    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payload_hash TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours');

-- Composite UNIQUE constraint: one submission per (user, action type, payload) per 24h window
-- ON CONFLICT on (user_id, endpoint, payload_hash) now works atomically.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_idempotency_user_endpoint_hash'
  ) THEN
    ALTER TABLE idempotency_keys
      ADD CONSTRAINT uq_idempotency_user_endpoint_hash
      UNIQUE (user_id, endpoint, payload_hash);
  END IF;
END $$;

-- Index for expiry cleanup queries
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON idempotency_keys(expires_at);
