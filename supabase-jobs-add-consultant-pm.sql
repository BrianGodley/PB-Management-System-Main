-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-jobs-add-consultant-pm.sql
-- Adds consultant and project_manager columns to the jobs table.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS consultant      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS project_manager TEXT DEFAULT NULL;
