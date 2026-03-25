-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- 1. Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  reference_id text DEFAULT '',
  score_delta integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
-- 2. Leaderboard scores (one row per user, upserted)
CREATE TABLE IF NOT EXISTS user_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score integer DEFAULT 0,
  quiz_score integer DEFAULT 0,
  reading_score integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
-- 3. Personal targets
CREATE TABLE IF NOT EXISTS personal_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_value integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_type)
);
-- 4. Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  whatsapp_enabled boolean DEFAULT false,
  sms_enabled boolean DEFAULT false,
  welcome_msg boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
-- 5. Notifications (persistent, per-user)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text DEFAULT 'info',
  icon text DEFAULT '🔔',
  title text NOT NULL,
  body text DEFAULT '',
  channel text DEFAULT 'in_app',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
-- 6. Webinar registrations
CREATE TABLE IF NOT EXISTS webinar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  webinar_id text DEFAULT '',
  webinar_title text DEFAULT '',
  webinar_date timestamptz,
  created_at timestamptz DEFAULT now()
);
-- 7. App settings (Kahoot PIN etc)
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);
INSERT INTO app_settings (key, value) VALUES ('kahoot_pin', '') ON CONFLICT DO NOTHING;
-- 8. Add place_of_study to profiles ONLY if profiles table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS place_of_study text DEFAULT '';
  END IF;
END $$;
-- RLS: enable on all new tables
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
-- Policies: users access only their own rows
DO $$ BEGIN
  CREATE POLICY "own_activity_logs" ON activity_logs FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own_user_scores" ON user_scores FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own_targets" ON personal_targets FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own_notif_prefs" ON notification_preferences FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own_notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "own_webinars" ON webinar_registrations FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "read_app_settings" ON app_settings FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "write_app_settings" ON app_settings FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
