-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-23.sql
-- Adds sort_order column to statistics for user-defined ordering
-- Run after supabase-update-22.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE statistics
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialise sort_order alphabetically so existing stats have a sensible order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) - 1 AS rn
  FROM statistics
)
UPDATE statistics s
   SET sort_order = r.rn
  FROM ranked r
 WHERE s.id = r.id;
