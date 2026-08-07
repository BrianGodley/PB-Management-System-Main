-- Add permit number column to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS permit_number TEXT;
