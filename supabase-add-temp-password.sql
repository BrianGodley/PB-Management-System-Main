-- Add temp_password column to profiles
-- This stores the last admin-set plaintext password so Sam can text it to the user.
-- This is for internal employee management only (not public-facing).

alter table profiles
  add column if not exists temp_password text;
