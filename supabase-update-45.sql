-- supabase-update-45.sql
-- Add is_manual and edited_from_estimate flags to work_orders

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS is_manual            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_from_estimate BOOLEAN NOT NULL DEFAULT false;
