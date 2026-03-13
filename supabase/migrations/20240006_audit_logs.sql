-- Audit logs for admin actions

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action      text NOT NULL,
  resource    text DEFAULT '',
  resource_id text DEFAULT '',
  details     jsonb DEFAULT '{}',
  ip_address  text DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "audit_logs_admin_read" ON audit_logs FOR SELECT
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'superadmin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor    ON audit_logs (actor_id);
