-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-26.sql
-- Adds cell phone (text) field to profiles
-- Run after supabase-update-25.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_cell TEXT;

NOTIFY pgrst, 'reload schema';
