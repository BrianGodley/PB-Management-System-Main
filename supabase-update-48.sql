-- supabase-update-48.sql
-- Add cell phone field to contacts table

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS cell text;

CREATE INDEX IF NOT EXISTS contacts_cell_idx ON contacts(cell);
