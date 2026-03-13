-- Sprint 1.1: Add rejection_reason column to profiles table
-- Non-destructive: IF NOT EXISTS prevents errors on re-run
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
