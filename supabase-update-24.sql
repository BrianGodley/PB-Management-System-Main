-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-24.sql
-- Adds default display count and missing-value behaviour to statistics
-- Run after supabase-update-23.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE statistics
  ADD COLUMN IF NOT EXISTS default_periods        INTEGER  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS missing_value_display  TEXT     NOT NULL DEFAULT 'skip'
    CONSTRAINT missing_value_display_check CHECK (missing_value_display IN ('zero', 'skip'));

NOTIFY pgrst, 'reload schema';
