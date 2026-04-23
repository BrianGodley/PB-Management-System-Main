-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-clients-name-migration.sql
-- Add first_name, last_name, company_name, company_position to clients table.
-- Run once in the Supabase SQL Editor, then reload the app.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS first_name        text,
  ADD COLUMN IF NOT EXISTS last_name         text,
  ADD COLUMN IF NOT EXISTS company_name      text,
  ADD COLUMN IF NOT EXISTS company_position  text;

-- Back-fill: copy the existing single `name` value into last_name
-- so current clients still appear in the list sorted correctly.
UPDATE clients
SET last_name = name
WHERE last_name IS NULL AND name IS NOT NULL AND name <> '';
