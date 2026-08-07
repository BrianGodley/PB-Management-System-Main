-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-walls-fix-labor-migration.sql
-- Moves Walls labor productivity rates from material_rates → labor_rates.
-- Run ONCE in the Supabase SQL Editor if you already ran supabase-walls-seed.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Insert into labor_rates (correct table)
INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('Wall Dig Footing Labor Rate',  4.0,  'CF/hr',     'Walls'),
  ('Wall Set Rebar Labor Rate',    35.0, 'LF/hr',     'Walls'),
  ('Wall Set Block Labor Rate',    10.4, 'blocks/hr', 'Walls'),
  ('Wall Hand Grout Labor Rate',   5.5,  'CF/hr',     'Walls'),
  ('Wall Pump Grout Labor Rate',   81.0, 'CF/hr',     'Walls'),
  ('Wall Setup Clean Labor Rate',  30.0, 'LF/hr',     'Walls'),
  ('Sand Stucco - Wall Labor Rate',    92.00,  'SF/day', 'Walls'),
  ('Smooth Stucco - Wall Labor Rate',  65.00,  'SF/day', 'Walls'),
  ('Ledgerstone - Wall Labor Rate',    24.00,  'SF/day', 'Walls'),
  ('Stacked Stone - Wall Labor Rate',  24.00,  'SF/day', 'Walls'),
  ('Tile - Wall Labor Rate',           0.2867, 'hrs/SF', 'Walls'),
  ('Real Flagstone - Wall Labor Rate', 0.4487, 'hrs/SF', 'Walls'),
  ('Real Stone - Wall Labor Rate',     0.8954, 'hrs/SF', 'Walls')
ON CONFLICT DO NOTHING;

-- Step 2: Remove them from material_rates (wrong table)
DELETE FROM material_rates
WHERE category = 'Walls'
  AND name IN (
    'Wall Dig Footing Labor Rate',
    'Wall Set Rebar Labor Rate',
    'Wall Set Block Labor Rate',
    'Wall Hand Grout Labor Rate',
    'Wall Pump Grout Labor Rate',
    'Wall Setup Clean Labor Rate',
    'Sand Stucco - Wall Labor Rate',
    'Smooth Stucco - Wall Labor Rate',
    'Ledgerstone - Wall Labor Rate',
    'Stacked Stone - Wall Labor Rate',
    'Tile - Wall Labor Rate',
    'Real Flagstone - Wall Labor Rate',
    'Real Stone - Wall Labor Rate'
  );
