-- Change Orders: track creation method + manual line items
-- Run in Supabase SQL editor.

-- 1. co_method distinguishes manually-entered COs from estimator-built COs.
--    Values: 'manual' | 'estimator'
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS co_method text;

-- 2. co_line_items stores the manual CO item rows:
--    [{ "item": "...", "labor_hours": 0, "material_cost": 0 }, ...]
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS co_line_items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Backfill: every existing change order was created via the estimate-paired
--    flow, so mark them 'estimator' to preserve the detailed-estimator link.
UPDATE bids
  SET co_method = 'estimator'
  WHERE record_type = 'change_order'
    AND co_method IS NULL;

-- 4. (Optional, for the work-order link) make sure work_orders can flag a CO origin.
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS source_change_order_id uuid;
