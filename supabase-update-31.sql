-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-31.sql
-- Renames all "Bobcat" references in the labor_rates table to "Skid Steer".
-- This syncs the database with the updated module code which now uses
-- 'Demo - Skid Steer ...' and 'Demo - Mini Skid Steer ...' as rate keys.
--
-- IMPORTANT: Run this AFTER supabase-update-30.sql.
-- This migration is idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Full Skid Steer rates (were "Bobcat") ────────────────────────────────────

UPDATE labor_rates
  SET name  = 'Demo - Skid Steer Concrete/Dirt',
      notes = 'Full Skid Steer — tons/hr one man can demo + haul (conc, dirt, rock, misc flat/vert, footing, grade cut)'
  WHERE name = 'Demo - Bobcat Concrete/Dirt';

UPDATE labor_rates
  SET name  = 'Demo - Skid Steer Grass',
      notes = 'Full Skid Steer — tons/hr for sod/grass removal with skid steer'
  WHERE name = 'Demo - Bobcat Grass';

UPDATE labor_rates
  SET name  = 'Demo - Skid Steer Import Base',
      notes = 'Full Skid Steer — tons/hr spreading rate for import base with skid steer'
  WHERE name = 'Demo - Bobcat Import Base';

-- ── Mini Skid Steer rates (were "Mini Bobcat") ───────────────────────────────

UPDATE labor_rates
  SET name  = 'Demo - Mini Skid Steer Concrete/Dirt',
      notes = 'Mini Skid Steer — tons/hr one man can demo + haul (conc, dirt, rock, misc flat/vert, footing, grade cut)'
  WHERE name = 'Demo - Mini Bobcat Concrete/Dirt';

UPDATE labor_rates
  SET name  = 'Demo - Mini Skid Steer Grass',
      notes = 'Mini Skid Steer — tons/hr for sod/grass removal with mini skid steer'
  WHERE name = 'Demo - Mini Bobcat Grass';

UPDATE labor_rates
  SET name  = 'Demo - Mini Skid Steer Import Base',
      notes = 'Mini Skid Steer — tons/hr spreading rate for import base with mini skid steer'
  WHERE name = 'Demo - Mini Bobcat Import Base';

-- ── Verify result ─────────────────────────────────────────────────────────────
-- Run this SELECT to confirm all Demo rates look correct after the migration:
-- SELECT name, rate, unit, notes FROM labor_rates WHERE category = 'Demo' ORDER BY name;
