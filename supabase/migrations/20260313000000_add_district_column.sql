-- Add district column to profiles table
-- Replaces the zone field for new registrations going forward.
-- Existing rows keep their zone value; district starts NULL and is filled on profile update.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS district TEXT;
