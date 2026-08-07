-- ─────────────────────────────────────────────────────────────────────────────
-- Collapse material_rates.subcategory → sub_category, then DROP subcategory
--
-- Keeps `sub_category` (snake_case, matches unit_cost/vendor_id/tenant_id and
-- already used by the catalog importer, price sheets, selections, CAD, edge
-- functions and MasterRates). All estimator code now reads/writes sub_category.
--
-- Run on STAGING first, confirm the app, then PROD.
-- Idempotent: safe to re-run (IF EXISTS guards).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Final backfill: fill any sub_category still empty from the legacy column.
UPDATE material_rates
   SET sub_category = subcategory
 WHERE (sub_category IS NULL OR btrim(sub_category) = '')
   AND subcategory IS NOT NULL
   AND btrim(subcategory) <> '';

-- 2) Sanity check — rows that would LOSE a value on drop (should return 0).
--    If this returns any rows, STOP and inspect before running step 3.
-- SELECT id, name, category, subcategory, sub_category
--   FROM material_rates
--  WHERE subcategory IS NOT NULL AND btrim(subcategory) <> ''
--    AND (sub_category IS NULL OR btrim(sub_category) = '');

-- 3) Drop the legacy column (auto-drops any dependent index on it).
ALTER TABLE material_rates DROP COLUMN IF EXISTS subcategory;
