-- Add 'created' as default status for bids table
-- Run this in Supabase SQL Editor

-- Set 'created' as the default value for new bids
ALTER TABLE bids ALTER COLUMN status SET DEFAULT 'created';

-- Update any existing bids with NULL status to 'created'
UPDATE bids SET status = 'created' WHERE status IS NULL;

-- If you have a CHECK constraint on status, drop and recreate it to include 'created'
-- First, find the constraint name:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'bids'::regclass AND contype = 'c';

-- Then drop and recreate (replace 'bids_status_check' with your actual constraint name if different):
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;

ALTER TABLE bids ADD CONSTRAINT bids_status_check
  CHECK (status IN ('created', 'pending', 'presented', 'sold', 'lost'));
