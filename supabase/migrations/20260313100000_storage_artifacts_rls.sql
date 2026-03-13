-- Storage RLS policies for the 'artifacts' bucket
-- Fixes: "new row violates row-level security policy" on file upload

-- Drop existing policies first to avoid conflicts on re-run
DROP POLICY IF EXISTS "Authenticated users can upload artifacts"    ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update artifacts"    ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete artifacts"    ON storage.objects;
DROP POLICY IF EXISTS "Public can read artifacts"                   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload to artifacts"       ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update artifacts"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete artifacts"          ON storage.objects;

-- Allow any authenticated user to upload files to the artifacts bucket
CREATE POLICY "Authenticated users can upload artifacts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'artifacts');

-- Allow authenticated users to update (replace) files in the artifacts bucket
CREATE POLICY "Authenticated users can update artifacts"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'artifacts');

-- Allow authenticated users to delete files from the artifacts bucket
CREATE POLICY "Authenticated users can delete artifacts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'artifacts');

-- Allow public read access so getPublicUrl() works without auth
CREATE POLICY "Public can read artifacts"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'artifacts');
