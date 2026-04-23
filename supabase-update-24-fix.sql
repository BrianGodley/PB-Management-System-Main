-- Run this if supabase-update-24.sql was already applied but columns still not visible

-- Re-apply columns safely (IF NOT EXISTS means no harm if already added)
ALTER TABLE statistics
  ADD COLUMN IF NOT EXISTS default_periods        INTEGER  DEFAULT NULL;

ALTER TABLE statistics
  ADD COLUMN IF NOT EXISTS missing_value_display  TEXT     NOT NULL DEFAULT 'skip';

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
