-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-9.sql
-- Seed Skid Steer Demo module material rates into material_rates table
-- Run once in the Supabase SQL Editor (after supabase-update-4.sql)
-- These appear in Master Rates → Materials Pricing (filter: Demo)
-- and are read live by the Skid Steer Demo Module estimator.
-- ─────────────────────────────────────────────────────────────────────────────

-- Dump Fees ($/ton) — used for Self Haul mode dump cost calculations
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Dump Fee - Concrete',    'ton', 36.21, 'Demo'),
  ('Dump Fee - Dirt',        'ton', 36.21, 'Demo'),
  ('Dump Fee - Green Waste', 'ton', 72.19, 'Demo')
ON CONFLICT DO NOTHING;

-- Labor Rates — Skid Steer Demo module unit rates
-- rate_per_day stores the per-unit labor hours (hrs/shrub, hrs/stump, etc.)
INSERT INTO labor_rates (name, rate_per_day, notes) VALUES
  ('Shrub Demo', 0.75, 'hrs/shrub — applied at Full access, scaled by access level modifier')
ON CONFLICT DO NOTHING;
