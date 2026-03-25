-- Patch: smart_notes table existed on remote without is_starred column
-- The 20260314_doctor_ux migration failed mid-way for this reason.
-- This adds the missing column + index safely.

ALTER TABLE smart_notes
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_smart_notes_starred
  ON smart_notes (user_id, is_starred)
  WHERE is_starred = true;
