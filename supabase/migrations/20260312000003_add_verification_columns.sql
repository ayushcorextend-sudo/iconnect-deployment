-- Add verification document columns to profiles
-- rejection_reason was added in 20260312000000_add_rejection_reason.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_certificate_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state_medical_council TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;

-- RLS: profiles table already has RLS enabled.
-- Doctors can update their own registration_certificate_url (self-service upload).
-- The existing UPDATE policy covers this (users can update their own row).
