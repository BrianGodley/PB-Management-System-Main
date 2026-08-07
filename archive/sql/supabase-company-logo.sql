-- Add logo_url column to company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS logo_url text;
