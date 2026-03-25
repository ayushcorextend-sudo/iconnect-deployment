-- ═══════════════════════════════════════════════════════════════
-- iConnect Office — Migration 000: Schema Version Tracking
-- Apply in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schema_versions (
  version    INT PRIMARY KEY,
  name       TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO schema_versions (version, name)
VALUES (0, 'initial_schema_tracking')
ON CONFLICT (version) DO NOTHING;

-- Verify: SELECT * FROM schema_versions ORDER BY version;
