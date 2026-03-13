-- Extend notification_preferences with alert trigger columns and in_app channel flag
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS in_app_enabled      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_ebook           boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS webinar_reminders   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiz_available      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_messages      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS leaderboard_changes boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_group_invites boolean DEFAULT false;

-- Also add an `unread` alias column so old app code that wrote `unread` still works.
-- The canonical column is is_read (false = unread). We keep both in sync via a trigger.
-- Actually, let's NOT add unread — instead fix the app code to use is_read correctly.
-- This comment is just for documentation.
