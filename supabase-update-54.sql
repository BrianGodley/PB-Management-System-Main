-- supabase-update-54.sql
-- Add scheduled crew/sub assignment columns to work_orders

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS scheduled_crew_id uuid REFERENCES crews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_sub_id  uuid REFERENCES subs_vendors(id) ON DELETE SET NULL;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS work_orders_scheduled_crew_idx ON work_orders(scheduled_crew_id);
CREATE INDEX IF NOT EXISTS work_orders_scheduled_sub_idx  ON work_orders(scheduled_sub_id);
