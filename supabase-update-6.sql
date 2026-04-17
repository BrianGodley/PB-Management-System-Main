-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-6.sql
-- Seed Lighting module material rates into material_rates table
-- Run once in the Supabase SQL Editor
-- These appear in Master Rates → Materials Pricing and are editable there.
-- The Lighting Module estimator reads these rates live from the database.
-- ─────────────────────────────────────────────────────────────────────────────

-- Light Fixtures
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Spot Light',            'each',      99.00,  'Lighting'),
  ('Flood Light',           'each',      99.00,  'Lighting'),
  ('Wall Washer Light',     'each',      99.00,  'Lighting'),
  ('Path Light',            'each',     135.45,  'Lighting'),
  ('Step Light',            'each',      67.05,  'Lighting'),
  ('Bistro Lighting',       'linear ft', 11.52,  'Lighting')
ON CONFLICT DO NOTHING;

-- Transformers
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Transformer 100W',  'each', 205.50, 'Lighting'),
  ('Transformer 200W',  'each', 222.00, 'Lighting'),
  ('Transformer 300W',  'each', 237.00, 'Lighting'),
  ('Transformer 600W',  'each', 367.50, 'Lighting'),
  ('Transformer 900W',  'each', 520.50, 'Lighting'),
  ('Transformer 1200W', 'each', 666.00, 'Lighting')
ON CONFLICT DO NOTHING;

-- Wire & Other
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('12x2 E. Wiring 250'' Roll', 'roll',      115.00, 'Lighting'),
  ('12x2 E. Wiring',            'linear ft',   0.35, 'Lighting'),
  ('Fx Timer',                  'each',        16.26, 'Lighting'),
  ('Bistro Wire',               'linear ft',    4.00, 'Lighting')
ON CONFLICT DO NOTHING;
