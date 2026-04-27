-- supabase-update-51.sql
-- Add project_description field to contacts table

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS project_description text;
