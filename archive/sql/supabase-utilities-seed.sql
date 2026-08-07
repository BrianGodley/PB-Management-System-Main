-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-utilities-seed.sql
-- Seed Utilities module rates into material_rates table
-- Run once in the Supabase SQL Editor
-- These appear in Master Rates → Materials Pricing (filter: Utilities)
-- and are read live by the Utilities Module estimator.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Utility Lines — Material Cost ($/linear ft) ───────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('PVC Conduit with Electrical',   'linear ft', 1.92, 'Utilities'),
  ('1" Black Iron Gas Pipe',        'linear ft', 2.76, 'Utilities'),
  ('1-1/2" Black Iron Gas Pipe',    'linear ft', 4.23, 'Utilities')
ON CONFLICT DO NOTHING;

-- ── Utility Lines — Labor Rate (hrs/LF) ──────────────────────────────────────
-- Stored in material_rates so they are editable in Master Rates.
-- The module reads these by name and uses unit_cost as the hours-per-LF rate.
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('PVC Conduit with Electrical - Labor Rate',  'hrs/LF', 0.05, 'Utilities'),
  ('1" Black Iron Gas Pipe - Labor Rate',       'hrs/LF', 0.15, 'Utilities'),
  ('1-1/2" Black Iron Gas Pipe - Labor Rate',   'hrs/LF', 0.20, 'Utilities')
ON CONFLICT DO NOTHING;

-- ── Gas Fixtures — Material Cost ($/each) ────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('12" Single Gas Ring', 'each', 61.75, 'Utilities')
ON CONFLICT DO NOTHING;

-- ── Gas Fixtures — Labor Rate (hrs/each) ─────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('12" Single Gas Ring - Labor Rate', 'hrs/ea', 2.00, 'Utilities')
ON CONFLICT DO NOTHING;

-- ── Additional Items — Material Cost ($/each) ─────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Curb Core',                'each', 250.00, 'Utilities'),
  ('Hydrocut Under Hardscape', 'each',  50.00, 'Utilities')
ON CONFLICT DO NOTHING;

-- ── Additional Items — Labor Rate (hrs/each) ─────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Curb Core - Labor Rate',                'hrs/ea', 2.00, 'Utilities'),
  ('Hydrocut Under Hardscape - Labor Rate', 'hrs/ea', 2.00, 'Utilities')
ON CONFLICT DO NOTHING;
