-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-22.sql
-- Adds archive support to statistics
--   • archived BOOLEAN column on statistics (default false)
--   • Archived stats are excluded from shared/public views via RLS
-- Run after supabase-update-21.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE statistics
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
