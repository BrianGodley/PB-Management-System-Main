-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-34.sql
-- Adds exception_date_end to workday_exceptions for date-range exceptions.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workday_exceptions
  ADD COLUMN IF NOT EXISTS exception_date_end DATE DEFAULT NULL;
