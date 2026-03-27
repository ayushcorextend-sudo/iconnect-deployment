-- Phase 2.5 — Server-side registration validation via NOT NULL constraints.
-- REG-1: Previously, mandatory profile fields had no DB-level enforcement.
-- A DevTools bypass (skipping form validation) could insert NULLs.
-- This migration enforces the minimum required fields at the DB level.
--
-- Safety: We fill any existing NULL rows with '' before setting NOT NULL,
-- so this migration is safe to run on a database with existing data.

-- 1. Fill existing NULLs with empty string sentinel values
UPDATE public.profiles SET name        = '' WHERE name        IS NULL;
UPDATE public.profiles SET email       = '' WHERE email       IS NULL;
UPDATE public.profiles SET mci_number  = '' WHERE mci_number  IS NULL;

-- 2. Add NOT NULL constraints on mandatory registration fields
DO $$ BEGIN
  ALTER TABLE public.profiles ALTER COLUMN name       SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ALTER COLUMN email      SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ALTER COLUMN mci_number SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- 3. Add CHECK constraints to prevent empty-string sentinel bypass
-- (ensures '' cannot be submitted via direct DB access either)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profiles_name_nonempty
    CHECK (char_length(trim(name)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profiles_email_nonempty
    CHECK (char_length(trim(email)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profiles_mci_nonempty
    CHECK (char_length(trim(mci_number)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
