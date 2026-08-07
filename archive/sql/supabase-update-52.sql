-- supabase-update-52.sql
-- Add secondary name (spouse/partner) and company address fields to contacts table

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS secondary_first_name text,
  ADD COLUMN IF NOT EXISTS secondary_last_name  text,
  ADD COLUMN IF NOT EXISTS company_street       text,
  ADD COLUMN IF NOT EXISTS company_city         text,
  ADD COLUMN IF NOT EXISTS company_state        text,
  ADD COLUMN IF NOT EXISTS company_zip          text;
