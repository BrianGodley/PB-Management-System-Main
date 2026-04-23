-- Add created_by column to bids table
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
