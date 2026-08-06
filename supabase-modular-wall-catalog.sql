-- ─────────────────────────────────────────────────────────────────────────────
-- Modular Wall catalog — master-list-driven Wall Type options for the Walls
-- Modular tab. The sub_category value 'Modular Wall' is the MARKER: any
-- material_rates row (category='Walls') tagged with it automatically appears in
-- the Modular Wall Type picker. block_w_in/h_in/l_in drive the block-count math.
--
-- IMPORTANT ORDER: run STEP 1 (add columns) BEFORE deploying the new code —
-- the shared catalog fetch now selects these columns, so they must exist first.
-- Run on STAGING, confirm, then PROD.
-- ─────────────────────────────────────────────────────────────────────────────

-- STEP 1 — dimension columns (inches). Nullable; only modular/CMU rows use them.
ALTER TABLE material_rates ADD COLUMN IF NOT EXISTS block_w_in numeric;
ALTER TABLE material_rates ADD COLUMN IF NOT EXISTS block_h_in numeric;
ALTER TABLE material_rates ADD COLUMN IF NOT EXISTS block_l_in numeric;

-- STEP 2 — seed a starter set of Modular Wall products (Unspecified vendor).
-- Edit / add more in Master Rates; new rows with this marker appear automatically.
-- Uses each tenant's own id so it works on single- and multi-tenant DBs.
INSERT INTO material_rates
  (tenant_id, name, category, sub_category, vendor_id, unit, unit_cost,
   block_w_in, block_h_in, block_l_in)
SELECT t.tenant_id, v.name, 'Walls', 'Modular Wall', NULL, 'each', v.unit_cost,
       v.w, v.h, v.l
FROM (SELECT DISTINCT tenant_id FROM material_rates) t
CROSS JOIN (VALUES
  ('Modular Wall - Standard Block 8x8x16',  3.50, 8, 8, 16),
  ('Modular Wall - Retaining Unit 12x8x18', 5.25, 12, 8, 18),
  ('Modular Wall - Slump Face 6x8x18',      4.75, 6, 8, 18),
  ('Modular Wall - Large Face 8x8x18',      5.60, 8, 8, 18)
) AS v(name, unit_cost, w, h, l)
ON CONFLICT (tenant_id, name, category) DO UPDATE
  SET sub_category = EXCLUDED.sub_category,
      block_w_in   = EXCLUDED.block_w_in,
      block_h_in   = EXCLUDED.block_h_in,
      block_l_in   = EXCLUDED.block_l_in;
