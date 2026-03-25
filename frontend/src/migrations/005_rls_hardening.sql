-- ═══════════════════════════════════════════════════════════════
-- iConnect Office — Migration 005: RLS Hardening
-- Replaces overly permissive policies with role-based checks.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO schema_versions (version, name)
VALUES (5, 'rls_hardening')
ON CONFLICT (version) DO NOTHING;

-- ── Drop overly permissive policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "users_read_own_notifications"       ON notifications;

-- ── Notifications ─────────────────────────────────────────────────────────────
-- Users can only READ their own notifications.
CREATE POLICY "notif_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only admins can INSERT to other users; self-notifications are allowed.
CREATE POLICY "notif_insert_admin" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'user_role') IN ('superadmin', 'contentadmin')
    OR user_id = auth.uid()
  );

-- Admins can UPDATE (mark-read) notifications.
CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ── Activity Logs ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "activity_insert_own" ON activity_logs;
DROP POLICY IF EXISTS "activity_select_own" ON activity_logs;

CREATE POLICY "activity_insert_own" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "activity_select_own" ON activity_logs
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.jwt() ->> 'user_role') IN ('superadmin', 'contentadmin')
  );

-- ── User Scores ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "scores_select_all"         ON user_scores;
DROP POLICY IF EXISTS "scores_upsert_trigger_only" ON user_scores;

-- All authenticated users can read scores (for leaderboard).
CREATE POLICY "scores_select_all" ON user_scores
  FOR SELECT TO authenticated
  USING (true);

-- Users can only mutate their own score row (trigger also writes here).
CREATE POLICY "scores_upsert_own" ON user_scores
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Artifacts ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "artifacts_select_approved" ON artifacts;
DROP POLICY IF EXISTS "artifacts_insert_own"      ON artifacts;
DROP POLICY IF EXISTS "artifacts_update_admin"    ON artifacts;

CREATE POLICY "artifacts_select_approved" ON artifacts
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR uploaded_by_id = auth.uid()
    OR (auth.jwt() ->> 'user_role') IN ('superadmin', 'contentadmin')
  );

CREATE POLICY "artifacts_insert_own" ON artifacts
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by_id = auth.uid());

CREATE POLICY "artifacts_update_admin" ON artifacts
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') IN ('superadmin', 'contentadmin')
    OR uploaded_by_id = auth.uid()
  );

-- ── Profiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_all"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;

CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ── Custom JWT hook (inject user_role into JWT claims) ────────────────────────
-- After applying this migration, enable the hook in:
-- Supabase Dashboard → Auth → Hooks → Custom Access Token → select custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  claims    JSONB;
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = (event ->> 'user_id')::UUID;

  claims := event -> 'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'doctor')));
  event  := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- MANUAL STEP: In Supabase Dashboard → Auth → Hooks → Custom Access Token
--   Set function to: public.custom_access_token_hook

-- Verify: SELECT * FROM schema_versions ORDER BY version;
