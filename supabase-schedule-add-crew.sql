-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-schedule-add-crew.sql
-- Adds crew_id column to schedule_items so crew selections persist.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE schedule_items
  ADD COLUMN IF NOT EXISTS crew_id UUID REFERENCES crews(id) ON DELETE SET NULL;
