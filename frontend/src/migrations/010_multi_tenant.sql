-- ─── 010_multi_tenant.sql ────────────────────────────────────────────────────
-- Multi-tenant architecture: tenants table, tenant_id on data tables,
-- JWT custom claim hook, tenant-aware RLS policies.
--
-- Each "tenant" is a medical institution (hospital, college, coaching center).
-- Data is siloed per tenant. Superadmins see all tenants.

-- 1. Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        NOT NULL UNIQUE,          -- URL-safe identifier e.g. 'aiims-delhi'
  name            text        NOT NULL,
  logo_url        text,
  primary_color   text        DEFAULT '#4F46E5',
  secondary_color text        DEFAULT '#818CF8',
  custom_domain   text UNIQUE,                          -- e.g. 'learn.aiims.edu'
  is_active       boolean     NOT NULL DEFAULT true,
  plan            text        NOT NULL DEFAULT 'basic', -- 'basic' | 'pro' | 'enterprise'
  max_users       int         DEFAULT 100,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Default "public" tenant for existing data
INSERT INTO tenants (id, slug, name, primary_color)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'iConnect', '#4F46E5')
ON CONFLICT DO NOTHING;

-- 2. Add tenant_id to all data tables
ALTER TABLE profiles        ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE artifacts       ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE quizzes         ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE video_lectures  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE doubts          ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE live_arenas     ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE conferences     ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE notifications   ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tenant        ON profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_tenant       ON artifacts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_tenant         ON quizzes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant   ON notifications (tenant_id);

-- 4. Helper function: get current user's tenant_id from JWT custom claim
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'tenant_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );
$$;

-- 5. Custom Access Token Hook — adds tenant_id to the JWT
--    Run this in Supabase Dashboard → Auth → Hooks → Custom Access Token
CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  claims    jsonb;
  user_role text;
  tenant_id uuid;
BEGIN
  claims    := event -> 'claims';
  user_role := (SELECT role FROM profiles WHERE id = (event->>'user_id')::uuid LIMIT 1);
  tenant_id := (SELECT p.tenant_id FROM profiles p WHERE p.id = (event->>'user_id')::uuid LIMIT 1);

  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'doctor')));
  claims := jsonb_set(claims, '{tenant_id}', to_jsonb(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::uuid)));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;

-- 6. Tenant-aware RLS policies (replace existing single-tenant policies)
-- Artifacts: users only see artifacts from their tenant
DROP POLICY IF EXISTS "tenant_artifacts_select" ON artifacts;
CREATE POLICY "tenant_artifacts_select" ON artifacts
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    OR (auth.jwt() ->> 'user_role') = 'superadmin'
  );

DROP POLICY IF EXISTS "tenant_artifacts_insert" ON artifacts;
CREATE POLICY "tenant_artifacts_insert" ON artifacts
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
  );

-- Notifications: users only receive their tenant's notifications
DROP POLICY IF EXISTS "tenant_notifications_select" ON notifications;
CREATE POLICY "tenant_notifications_select" ON notifications
  FOR SELECT USING (
    user_id = auth.uid()
    AND tenant_id = current_tenant_id()
  );

-- Profiles: scoped to tenant
DROP POLICY IF EXISTS "tenant_profiles_select" ON profiles;
CREATE POLICY "tenant_profiles_select" ON profiles
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    OR (auth.jwt() ->> 'user_role') = 'superadmin'
    OR id = auth.uid()
  );

-- Tenants table: superadmin sees all, others see only their own
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all_tenants" ON tenants
  FOR ALL USING ((auth.jwt() ->> 'user_role') = 'superadmin');

CREATE POLICY "authenticated_own_tenant" ON tenants
  FOR SELECT USING (id = current_tenant_id());
