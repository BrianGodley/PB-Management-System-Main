-- supabase-update-66.sql
-- Add temp_password column to profiles
-- Stores the most recent admin-set password so Sam can text it to the user.
-- This is intentionally plaintext (admin-visible), not a security hash.
-- It is overwritten each time an admin resets the password.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS temp_password text;
