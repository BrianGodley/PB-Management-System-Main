-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-ground-treatments-prep-rates.sql
-- New rates for the Ground Treatments → Preparation section:
--   • Method = Hand   → per-SF labor add (labor_rates)
--   • Area   = Sod    → independent Sod Soil Prep material + labor (default = the
--                       same values as the Planter "Soil Prep" rates)
-- Category = 'Ground Treatments'. Run once in the Supabase SQL Editor.
--
-- OPTIONAL: seeding is not required — the ✎ Rate editors in the module create
-- these rows on first save. This file just pre-populates them with defaults so
-- they show in Master Rates and price consistently before anyone edits them.
-- Idempotent: ON CONFLICT DO NOTHING (safe to re-run; never overwrites edits).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Labor rates (hrs/SF) ─────────────────────────────────────────────────────
INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('Soil Prep - Hand Add',        0.06,  'hrs/SF', 'Ground Treatments'),  -- Method = Hand add
  ('Sod Soil Prep - Labor Rate',  0.012, 'hrs/SF', 'Ground Treatments')   -- Area = Sod labor
ON CONFLICT DO NOTHING;

-- ── Material rate ($/SF) ─────────────────────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Sod Soil Prep', 'per SF', 0.1558, 'Ground Treatments')                -- Area = Sod material
ON CONFLICT DO NOTHING;
