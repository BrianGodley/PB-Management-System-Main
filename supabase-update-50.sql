-- supabase-update-50.sql
-- Add new contact fields: contact_type, DND channels, date_of_birth

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS contact_type  text,
  ADD COLUMN IF NOT EXISTS dnd_phone     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnd_email     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnd_sms       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Index for filtering by contact_type
CREATE INDEX IF NOT EXISTS contacts_contact_type_idx ON contacts(contact_type);
