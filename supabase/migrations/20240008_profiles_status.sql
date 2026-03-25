-- Add missing status column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
-- Update existing admin profiles to active
UPDATE public.profiles SET status = 'active' WHERE role IN ('superadmin', 'contentadmin');
-- Update existing verified profiles to active
UPDATE public.profiles SET status = 'active' WHERE verified = true;
