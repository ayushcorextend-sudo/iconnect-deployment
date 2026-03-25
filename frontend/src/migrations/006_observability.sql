-- ─── 006_observability.sql ───────────────────────────────────────────────────
-- Enable pg_stat_statements, create slow_queries view, health_checks table.
-- Run in Supabase SQL Editor (superuser required for pg_stat_statements).

-- 1. Enable query statistics extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 2. Slow queries view — identifies queries over 500 ms average
CREATE OR REPLACE VIEW slow_queries AS
SELECT
  query,
  calls,
  ROUND((total_exec_time / calls)::numeric, 2) AS avg_ms,
  ROUND(total_exec_time::numeric, 2)           AS total_ms,
  rows
FROM pg_stat_statements
WHERE calls > 5
  AND (total_exec_time / calls) > 500
ORDER BY avg_ms DESC
LIMIT 50;

-- 3. Health checks table — used by monitoring pings and Edge Function probes
CREATE TABLE IF NOT EXISTS health_checks (
  id         bigserial PRIMARY KEY,
  checked_at timestamptz NOT NULL DEFAULT now(),
  source     text        NOT NULL DEFAULT 'api',       -- 'api' | 'edge' | 'cron'
  status     text        NOT NULL DEFAULT 'ok',        -- 'ok' | 'degraded' | 'error'
  latency_ms int,
  details    jsonb
);

-- Restrict read/write: only service_role can insert; anyone authenticated can read latest
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_insert_health" ON health_checks
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_health" ON health_checks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Auto-purge checks older than 7 days (keep table small)
CREATE OR REPLACE FUNCTION fn_purge_old_health_checks()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM health_checks WHERE checked_at < now() - interval '7 days';
END;
$$;

-- 4. DB-level audit log index (supports SA Dashboard audit queries by user + date range)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (action, created_at DESC);

-- 5. Activity logs index for heatmap + streak queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date
  ON activity_logs (user_id, created_at DESC);
