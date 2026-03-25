-- ═══════════════════════════════════════════════════════════════
-- iConnect Office — Migration 003: Server-Side Timestamps
-- ═══════════════════════════════════════════════════════════════

INSERT INTO schema_versions (version, name)
VALUES (3, 'server_side_timestamps')
ON CONFLICT (version) DO NOTHING;

-- ── Trusted server time RPC ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION server_now()
RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE
AS $$ SELECT now(); $$;

-- ── Ensure DEFAULT now() on all timestamp columns ────────────────────────────
ALTER TABLE activity_logs  ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE notifications  ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE audit_logs     ALTER COLUMN created_at SET DEFAULT now();

-- ── Exam server time RPC (prevents client-side time manipulation) ─────────────
-- Returns both ISO string and epoch milliseconds so client can compute elapsed time.
CREATE OR REPLACE FUNCTION get_exam_server_time()
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'server_time', now(),
    'epoch_ms',    extract(epoch FROM now()) * 1000
  );
$$;

-- Verify: SELECT server_now(), get_exam_server_time();
