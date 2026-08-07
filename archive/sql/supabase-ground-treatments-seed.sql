-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-ground-treatments-seed.sql
-- Seed Ground Treatments module rates into material_rates table
-- Run once in the Supabase SQL Editor
-- These appear in Master Rates → Materials Pricing (filter: Ground Treatments)
-- and are read live by the Ground Treatments Module estimator.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Mulch ─────────────────────────────────────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Mulch',              'per CY',    25.00, 'Ground Treatments'),
  ('Mulch Delivery Fee', 'flat',      75.00, 'Ground Treatments')
ON CONFLICT DO NOTHING;

-- ── Edging — Material Costs ───────────────────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Plastic Edging', 'linear ft',  1.20, 'Ground Treatments'),
  ('Metal Edging',   'linear ft',  4.00, 'Ground Treatments')
ON CONFLICT DO NOTHING;

-- ── Edging — Labor Rates (hrs/LF) ────────────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Plastic Edging - Labor Rate', 'hrs/LF', 0.09, 'Ground Treatments'),
  ('Metal Edging - Labor Rate',   'hrs/LF', 0.17, 'Ground Treatments')
ON CONFLICT DO NOTHING;

-- ── Soil Prep — Material & Labor ─────────────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Soil Prep',              'per SF',   0.1558, 'Ground Treatments'),
  ('Soil Prep - Labor Rate', 'hrs/SF',   0.012,  'Ground Treatments')
ON CONFLICT DO NOTHING;

-- ── Sod — Material Costs ($/SF) ──────────────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Sod - Marathon',      'per SF', 1.20, 'Ground Treatments'),
  ('Sod - St. Augustine', 'per SF', 1.97, 'Ground Treatments')
ON CONFLICT DO NOTHING;

-- ── Sod — Labor Rate (hrs/SF) ────────────────────────────────────────────────
-- 700 SF per man-day → 8/700 = 0.01143 hrs/SF
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Sod - Labor Rate', 'hrs/SF', 0.01143, 'Ground Treatments')
ON CONFLICT DO NOTHING;

-- ── Flagstone Steppers — Material & Labor ────────────────────────────────────
-- Material: default $/ton (1 ton = 80 SF).  Labor: SF/day productivity rate.
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Flagstone Steppers',              'per ton', 500.00, 'Ground Treatments'),
  ('Flagstone Steppers - Labor Rate', 'SF/day',   35.00, 'Ground Treatments')
ON CONFLICT DO NOTHING;

-- ── Precast Steppers — Material & Labor ──────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Precast Steppers',              'per ton', 200.00, 'Ground Treatments'),
  ('Precast Steppers - Labor Rate', 'SF/day',   50.00, 'Ground Treatments')
ON CONFLICT DO NOTHING;

-- ── Decomposed Granite ───────────────────────────────────────────────────────
-- Labor for DG uses embedded productivity constants (not editable here).
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Decomposed Granite', 'per ton', 50.00, 'Ground Treatments'),
  ('DG Cement Mix',      'per ton', 20.00, 'Ground Treatments')  -- add-on when cement mixture selected
ON CONFLICT DO NOTHING;

-- ── Gravel Fabric ────────────────────────────────────────────────────────────
-- Gravel $/CY is entered per-row in the module (user-defined per gravel type).
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Gravel Fabric',              'per SF',  0.10,  'Ground Treatments'),
  ('Gravel Fabric - Labor Rate', 'hrs/SF',  0.024, 'Ground Treatments')
ON CONFLICT DO NOTHING;
