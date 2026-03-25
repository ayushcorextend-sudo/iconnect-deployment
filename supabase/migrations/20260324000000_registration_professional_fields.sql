-- Migration: Add professional info fields introduced in the new registration flow
-- Covers: DOB, super-specialization (DM/MCh/DNB/Fellowship), and sub-fields

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dob               TEXT,
  ADD COLUMN IF NOT EXISTS super_spec_type   TEXT,       -- 'DM' | 'MCh' | 'DNB' | 'Fellowship'
  ADD COLUMN IF NOT EXISTS super_speciality  TEXT,       -- specialization name for DM / MCh / DNB
  ADD COLUMN IF NOT EXISTS super_college     TEXT,       -- college for MCh / DNB
  ADD COLUMN IF NOT EXISTS super_place       TEXT,       -- place for MCh / DNB
  ADD COLUMN IF NOT EXISTS super_year        INTEGER,    -- joining year for MCh / DNB
  ADD COLUMN IF NOT EXISTS fellowship_name         TEXT, -- Fellowship program name
  ADD COLUMN IF NOT EXISTS fellowship_institution  TEXT, -- Fellowship institution
  ADD COLUMN IF NOT EXISTS fellowship_duration     TEXT; -- e.g. '1 year'

-- Index for future queries filtering by super_spec_type
CREATE INDEX IF NOT EXISTS idx_profiles_super_spec_type
  ON public.profiles (super_spec_type);
