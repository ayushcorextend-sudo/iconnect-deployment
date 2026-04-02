-- admin_calendar_events: Admin-created calendar events visible to all doctors
-- Referenced by: DoctorEngageView.jsx, StudyCalendar.jsx

CREATE TABLE IF NOT EXISTS admin_calendar_events (
  id            BIGSERIAL   PRIMARY KEY,
  title         TEXT        NOT NULL,
  date          DATE        NOT NULL,
  description   TEXT,
  color         TEXT        DEFAULT '#EF4444',
  is_compulsory BOOLEAN     DEFAULT true,
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE admin_calendar_events ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read calendar events
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read calendar events'
    AND tablename = 'admin_calendar_events'
) THEN
  CREATE POLICY "Anyone can read calendar events"
    ON admin_calendar_events FOR SELECT
    USING (true);
END IF;
END $$;

-- Superadmins and contentadmins can insert events
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert calendar events'
    AND tablename = 'admin_calendar_events'
) THEN
  CREATE POLICY "Admins can insert calendar events"
    ON admin_calendar_events FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('superadmin', 'contentadmin')
      )
    );
END IF;
END $$;

-- Superadmins can update events
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE policyname = 'Superadmins can update calendar events'
    AND tablename = 'admin_calendar_events'
) THEN
  CREATE POLICY "Superadmins can update calendar events"
    ON admin_calendar_events FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'superadmin'
      )
    );
END IF;
END $$;

-- Superadmins can delete events
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE policyname = 'Superadmins can delete calendar events'
    AND tablename = 'admin_calendar_events'
) THEN
  CREATE POLICY "Superadmins can delete calendar events"
    ON admin_calendar_events FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'superadmin'
      )
    );
END IF;
END $$;

-- Updated_at trigger (uses shared set_updated_at function from earlier migration)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_admin_calendar_events_updated_at'
  ) THEN
    CREATE TRIGGER set_admin_calendar_events_updated_at
      BEFORE UPDATE ON admin_calendar_events
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END IF;
END $$;
