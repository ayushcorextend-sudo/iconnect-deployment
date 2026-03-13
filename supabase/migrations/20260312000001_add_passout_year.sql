-- Sprint 1.2: Add passout_year column to profiles table
-- Non-destructive: IF NOT EXISTS prevents errors on re-run
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS passout_year INTEGER;
