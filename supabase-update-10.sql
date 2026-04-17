-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-10.sql
-- Expand labor_rates table to support flexible rate types:
--   rate  — the numeric value  (e.g. 450, 35, 0.75, 1.5)
--   unit  — what it applies to (e.g. 'per day', 'per hour', 'hrs/ea', 'hrs/linear ft')
-- Migrates existing rate_per_day data into the new columns.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add new columns (safe to re-run)
ALTER TABLE labor_rates
  ADD COLUMN IF NOT EXISTS rate  NUMERIC(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit  TEXT          DEFAULT 'per day';

-- 2. Migrate existing rate_per_day values → rate, set unit = 'per day'
UPDATE labor_rates
SET    rate = rate_per_day,
       unit = 'per day'
WHERE  rate = 0 AND rate_per_day > 0;

-- 3. Fix the Shrub Demo entry seeded in update-9 (rate_per_day=0.75 → rate=0.75, unit='hrs/ea')
UPDATE labor_rates
SET    rate = 0.75,
       unit = 'hrs/ea'
WHERE  name = 'Shrub Demo';

-- If Shrub Demo doesn't exist yet, insert it cleanly
INSERT INTO labor_rates (name, rate, unit, notes)
SELECT 'Shrub Demo', 0.75, 'hrs/ea', 'Per shrub at Full access — scaled by access level modifier'
WHERE  NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Shrub Demo');
