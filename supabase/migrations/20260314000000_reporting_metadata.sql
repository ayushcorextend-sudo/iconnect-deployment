-- LAYER 0: Reporting metadata columns for profiles
-- Adds state, zone, hometown, is_verified for Super Admin reporting engine

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zone        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hometown    TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
-- Performant indexes for grouping/filtering in reports
CREATE INDEX IF NOT EXISTS idx_profiles_state      ON profiles(state);
CREATE INDEX IF NOT EXISTS idx_profiles_zone       ON profiles(zone);
CREATE INDEX IF NOT EXISTS idx_profiles_speciality ON profiles(speciality);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);
