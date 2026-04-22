-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-columns-seed.sql
-- Seed Columns module rates into material_rates table
-- Run once in the Supabase SQL Editor
-- These appear in Master Rates → Materials Pricing (filter: Columns)
-- and are read live by the Columns Module estimator.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── CMU Block Construction — Material Costs ───────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('CMU Block',          'each',    2.50, 'Columns'),
  ('Rebar - Columns',    'linear ft', 0.80, 'Columns'),
  ('Face Block',         'each',    3.00, 'Columns'),
  ('Fill Block / Grout', 'each',    0.75, 'Columns')
ON CONFLICT DO NOTHING;

-- ── CMU Block Construction — Labor Rates (hrs/unit) ──────────────────────────
-- Stored in material_rates so they are editable in Master Rates.
-- The module reads these by name and uses unit_cost as the hours-per-unit rate.
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('CMU Install Labor',      'hrs/block',  0.083, 'Columns'),  -- ~5 min per block
  ('Excavate Footing Labor', 'hrs/column', 0.50,  'Columns'),
  ('Pour Footing Labor',     'hrs/column', 0.25,  'Columns'),
  ('Fill Labor',             'hrs/block',  0.05,  'Columns')
ON CONFLICT DO NOTHING;

-- ── Finishes — Material Costs ($/SF or $/ton) ─────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Sand Stucco',               'SF',  0.00,   'Columns'),
  ('Smooth Stucco',             'SF',  0.00,   'Columns'),
  ('Ledgerstone Veneer Panels', 'SF',  10.00,  'Columns'),
  ('Stacked Stone Veneer',      'SF',  10.00,  'Columns'),
  ('Tile - Columns',            'SF',  6.50,   'Columns'),
  ('Real Flagstone Flat',       'ton', 400.00, 'Columns'),
  ('Real Stone - Columns',      'ton', 400.00, 'Columns')
ON CONFLICT DO NOTHING;

-- ── Finishes — Labor Rates (hrs/SF or hrs/ton) ───────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Sand Stucco - Labor Rate',               'hrs/SF',  0.050, 'Columns'),
  ('Smooth Stucco - Labor Rate',             'hrs/SF',  0.050, 'Columns'),
  ('Ledgerstone Veneer Panels - Labor Rate', 'hrs/SF',  0.100, 'Columns'),
  ('Stacked Stone Veneer - Labor Rate',      'hrs/SF',  0.100, 'Columns'),
  ('Tile - Columns - Labor Rate',            'hrs/SF',  0.125, 'Columns'),
  ('Real Flagstone Flat - Labor Rate',       'hrs/ton', 0.500, 'Columns'),
  ('Real Stone - Columns - Labor Rate',      'hrs/ton', 0.500, 'Columns')
ON CONFLICT DO NOTHING;

-- ── Additional Items — Material Costs ($/each) ────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('BBQ Block',        'each', 5.00, 'Columns'),
  ('Backsplash Block', 'each', 3.50, 'Columns')
ON CONFLICT DO NOTHING;
