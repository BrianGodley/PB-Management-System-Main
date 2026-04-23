-- supabase-update-39.sql
-- Add preferred_language to employees and profiles tables
-- Values: 'en' (English, default) or 'es' (Spanish)

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'es'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'es'));
