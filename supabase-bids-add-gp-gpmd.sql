-- Add gross_profit and gpmd columns to bids table
-- Run this in Supabase SQL Editor

ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS gross_profit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gpmd        numeric DEFAULT 0;
