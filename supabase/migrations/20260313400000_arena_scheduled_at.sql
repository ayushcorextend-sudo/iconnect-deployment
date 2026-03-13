-- Add scheduled_at to live_arenas so doctors can see upcoming sessions on their calendar
ALTER TABLE live_arenas ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- Ensure notifications table has all required columns (idempotent)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS icon    text,
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'in_app';
