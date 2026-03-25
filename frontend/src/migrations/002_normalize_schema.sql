-- ═══════════════════════════════════════════════════════════════
-- iConnect Office — Migration 002: Database Normalization + Indexes
-- Apply AFTER 000 and 001.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO schema_versions (version, name)
VALUES (2, 'normalize_schema')
ON CONFLICT (version) DO NOTHING;

-- ── Lookup tables for medical data ───────────────────────────────────────────
-- Reduces string repetition in profiles and enables analytics/filtering.

CREATE TABLE IF NOT EXISTS specialities (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS colleges (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  state TEXT,
  UNIQUE(name, state)
);

-- ── Populate from existing profile data ──────────────────────────────────────
INSERT INTO specialities (name)
SELECT DISTINCT speciality
FROM profiles
WHERE speciality IS NOT NULL AND speciality != ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO colleges (name, state)
SELECT DISTINCT college, state
FROM profiles
WHERE college IS NOT NULL AND college != ''
ON CONFLICT (name, state) DO NOTHING;

-- ── Add FK columns to profiles (nullable; old string columns remain intact) ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS speciality_id INT REFERENCES specialities(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_id    INT REFERENCES colleges(id);

-- ── Backfill FK columns (non-destructive) ────────────────────────────────────
UPDATE profiles p
SET speciality_id = s.id
FROM specialities s
WHERE p.speciality = s.name AND p.speciality_id IS NULL;

UPDATE profiles p
SET college_id = c.id
FROM colleges c
WHERE p.college = c.name AND p.state = c.state AND p.college_id IS NULL;

-- ── Performance indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
  ON activity_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_type
  ON activity_logs (activity_type);

CREATE INDEX IF NOT EXISTS idx_user_scores_total
  ON user_scores (total_score DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artifacts_status
  ON artifacts (status, created_at DESC);

-- Verify: SELECT * FROM schema_versions ORDER BY version;
