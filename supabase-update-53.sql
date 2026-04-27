-- supabase-update-53.sql
-- Add Work Order scheduling support to schedule_items

ALTER TABLE schedule_items
  ADD COLUMN IF NOT EXISTS scheduling_type text    NOT NULL DEFAULT 'crew_type',
  ADD COLUMN IF NOT EXISTS work_order_ids  uuid[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS needs_crew      boolean NOT NULL DEFAULT false;

-- Index for filtering by scheduling type
CREATE INDEX IF NOT EXISTS schedule_items_scheduling_type_idx ON schedule_items(scheduling_type);
