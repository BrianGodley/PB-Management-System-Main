-- supabase-update-90.sql
-- Add new columns to the clients table to support separate Individual and
-- Company client types, plus extra fields for each type.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type        text    DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS spouse_first_name  text,
  ADD COLUMN IF NOT EXISTS spouse_last_name   text,
  ADD COLUMN IF NOT EXISTS other_email        text,
  ADD COLUMN IF NOT EXISTS other_address      text,
  ADD COLUMN IF NOT EXISTS website            text,
  ADD COLUMN IF NOT EXISTS company_contacts   jsonb   DEFAULT '[]'::jsonb;

-- Optional check constraint so only known types are stored
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_client_type_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_client_type_check
  CHECK (client_type IN ('individual', 'company'));

-- Backfill existing rows as individuals (they were all person records)
UPDATE clients SET client_type = 'individual' WHERE client_type IS NULL;
