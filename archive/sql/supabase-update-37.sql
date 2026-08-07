-- supabase-update-37.sql
-- Add status column to clients table for active / inactive filtering

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Back-fill any existing rows just in case
UPDATE clients SET status = 'active' WHERE status IS NULL OR status = '';

-- Optional: constrain to known values
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive'));
