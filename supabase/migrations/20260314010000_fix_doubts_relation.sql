-- Fix: doubts + doubt_replies FK relationships so PostgREST can JOIN to profiles
-- Root cause: doubts.user_id and doubt_replies.user_id pointed to auth.users(id),
-- not profiles(id), so Supabase schema cache couldn't resolve profiles:user_id(...) joins.

-- ── doubts table ──────────────────────────────────────────────────────────

-- 1. Create table if it somehow doesn't exist (safety net)
CREATE TABLE IF NOT EXISTS doubts (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL,
    subject     TEXT,
    title       TEXT         NOT NULL DEFAULT '',
    body        TEXT         NOT NULL DEFAULT '',
    status      TEXT         NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- 2. Drop old FK to auth.users (inline REFERENCES creates name: doubts_user_id_fkey)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doubts_user_id_fkey') THEN
        ALTER TABLE doubts DROP CONSTRAINT doubts_user_id_fkey;
    END IF;
END $$;
-- 3. Add FK to profiles.id (this is what PostgREST needs for profiles:user_id(...) join)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_doubts_user_id') THEN
        ALTER TABLE doubts
        ADD CONSTRAINT fk_doubts_user_id
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
-- 4. RLS policies for doubts
ALTER TABLE doubts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view doubts" ON doubts;
CREATE POLICY "Anyone can view doubts" ON doubts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Doctors can insert doubts" ON doubts;
CREATE POLICY "Doctors can insert doubts" ON doubts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can update doubts" ON doubts;
CREATE POLICY "Admins can update doubts" ON doubts FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('superadmin', 'contentadmin')
    )
);
-- Also allow doctors to update their own (e.g. edit question before it's answered)
DROP POLICY IF EXISTS "Doctors update own doubts" ON doubts;
CREATE POLICY "Doctors update own doubts" ON doubts FOR UPDATE USING (auth.uid() = user_id);
-- ── doubt_replies table ───────────────────────────────────────────────────

-- 5. Drop old FK to auth.users on doubt_replies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doubt_replies_user_id_fkey') THEN
        ALTER TABLE doubt_replies DROP CONSTRAINT doubt_replies_user_id_fkey;
    END IF;
END $$;
-- 6. Add FK to profiles.id on doubt_replies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_doubt_replies_user_id') THEN
        ALTER TABLE doubt_replies
        ADD CONSTRAINT fk_doubt_replies_user_id
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
-- 7. RLS for doubt_replies (permissive read, auth insert, admin update)
ALTER TABLE doubt_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view doubt_replies" ON doubt_replies;
CREATE POLICY "Anyone can view doubt_replies" ON doubt_replies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users insert replies" ON doubt_replies;
CREATE POLICY "Auth users insert replies" ON doubt_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own replies" ON doubt_replies;
CREATE POLICY "Users delete own replies" ON doubt_replies FOR DELETE USING (auth.uid() = user_id);
