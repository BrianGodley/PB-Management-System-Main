-- supabase-update-56.sql
-- Add is_paid flag to collection_financial for Payable Allocation paid tracking

ALTER TABLE collection_financial
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;
