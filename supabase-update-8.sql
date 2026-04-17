-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-8.sql
-- Seed Drainage module material rates into material_rates table
-- Run once in the Supabase SQL Editor (after supabase-update-4.sql)
-- These appear in Master Rates → Materials Pricing (filter: Drainage)
-- and are read live by the Drainage Module estimator.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drain Pipe ($/linear ft)
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('4" SDR 35 Pipe',       'linear ft', 2.26, 'Drainage'),
  ('3" SDR 35 Pipe',       'linear ft', 1.48, 'Drainage'),
  ('6" SDR 35 Pipe',       'linear ft', 3.72, 'Drainage'),
  ('4" Triple Wall Pipe',  'linear ft', 1.03, 'Drainage'),
  ('3" Triple Wall Pipe',  'linear ft', 0.86, 'Drainage'),
  ('4" Perforated Pipe',   'linear ft', 2.26, 'Drainage'),
  ('3" Perforated Pipe',   'linear ft', 1.48, 'Drainage')
ON CONFLICT DO NOTHING;

-- Drains & Fixtures ($/each)
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('3" Area Drain',         'each', 3.27,  'Drainage'),
  ('4" Area Drain',         'each', 1.90,  'Drainage'),
  ('3" Atrium Drain',       'each', 9.59,  'Drainage'),
  ('4" Atrium Drain',       'each', 7.19,  'Drainage'),
  ('4" Brass Area Drain',   'each', 16.36, 'Drainage'),
  ('3" Brass Area Drain',   'each', 16.36, 'Drainage'),
  ('Downspout Connector',   'each', 7.01,  'Drainage'),
  ('4" Paver Top Inlet',    'each', 23.63, 'Drainage'),
  ('9" x 9" Catch Basin',   'each', 16.90, 'Drainage'),
  ('12" x 12" Catch Basin', 'each', 21.60, 'Drainage')
ON CONFLICT DO NOTHING;

-- Additional Items ($/each — drives both material cost and labor hours in module)
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Pump Vault',                'each', 275.00, 'Drainage'),
  ('Sump Pump',                 'each', 650.00, 'Drainage'),
  ('Curb Core',                 'each', 250.00, 'Drainage'),
  ('Hydrocut Under Hardscape',  'each',  50.00, 'Drainage')
ON CONFLICT DO NOTHING;

-- Drain Fitting Fee (per fixture unit installed)
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Drain Fitting Fee', 'each', 10.00, 'Drainage')
ON CONFLICT DO NOTHING;
