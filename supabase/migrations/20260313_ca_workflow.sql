-- ─────────────────────────────────────────────────────────────────────────────
-- iConnect CA Workflow Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Uploader's user ID (existing uploaded_by is just a name string)
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS uploaded_by_id UUID REFERENCES auth.users(id);

-- 2. Thumbnail / cover image URL
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 3. Rejection reason (shown to CA so they know why it was rejected)
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. Description field
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS description TEXT;

-- 5. Expand status CHECK to include 'rejected' and 'archived'
ALTER TABLE artifacts DROP CONSTRAINT IF EXISTS artifacts_status_check;
ALTER TABLE artifacts ADD CONSTRAINT artifacts_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'archived'));

-- 6. file_url column (PDF storage URL)
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 7. Index for "my uploads" queries
CREATE INDEX IF NOT EXISTS idx_artifacts_uploaded_by_id ON artifacts(uploaded_by_id);

-- 8. RLS: CA can update own pending/rejected artifacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'CA can update own pending artifacts' AND tablename = 'artifacts'
  ) THEN
    CREATE POLICY "CA can update own pending artifacts" ON artifacts
      FOR UPDATE
      USING (auth.uid() = uploaded_by_id AND status IN ('pending', 'rejected'));
  END IF;
END $$;

-- 9. RLS: CA can delete own pending/rejected artifacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'CA can delete own pending artifacts' AND tablename = 'artifacts'
  ) THEN
    CREATE POLICY "CA can delete own pending artifacts" ON artifacts
      FOR DELETE
      USING (auth.uid() = uploaded_by_id AND status IN ('pending', 'rejected'));
  END IF;
END $$;

-- 10. RLS: CA can insert artifacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'CA can insert artifacts' AND tablename = 'artifacts'
  ) THEN
    CREATE POLICY "CA can insert artifacts" ON artifacts
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('superadmin', 'contentadmin')
        )
      );
  END IF;
END $$;
