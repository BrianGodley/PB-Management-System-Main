-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-employee-nickname.sql
-- Adds nickname column to employees table.
-- Nickname displays on crew schedule labels instead of first name when set.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT NULL;
