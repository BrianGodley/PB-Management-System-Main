-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-20.sql
-- Adds archived_at column to profiles for soft-delete / archive support
-- Run after supabase-update-19.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Archived users are still visible to admins but hidden from normal selects
-- No RLS change needed — admins see everything via profiles_admin_all policy
