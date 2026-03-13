-- Subject completion tracking + admin webinar calendar

CREATE TABLE IF NOT EXISTS subject_completion (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  completed   boolean DEFAULT false,
  progress    int DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, subject)
);

CREATE TABLE IF NOT EXISTS admin_webinars (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text DEFAULT '',
  speaker     text DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  duration_min int DEFAULT 60,
  join_url    text DEFAULT '',
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE subject_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_webinars     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "completion_own" ON subject_completion FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "webinars_read" ON admin_webinars FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "webinars_admin" ON admin_webinars FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('superadmin','contentadmin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
