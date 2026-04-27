-- supabase-update-57.sql
-- Add starting_balance and new_charges to collection_payables for Credit Cards/Lines tracking

ALTER TABLE collection_payables
  ADD COLUMN IF NOT EXISTS starting_balance numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_charges      numeric(12,2) NOT NULL DEFAULT 0;
