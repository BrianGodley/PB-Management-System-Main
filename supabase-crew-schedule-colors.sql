-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-crew-schedule-colors.sql
-- Adds color column to crews and assignee_color to schedule_items.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE crews
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;

ALTER TABLE schedule_items
  ADD COLUMN IF NOT EXISTS assignee_color TEXT DEFAULT NULL;
