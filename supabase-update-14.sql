-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-14.sql
-- Adds all Concrete module rates to the correct tables:
--   labor_rates          → production / labor rates (SF/hr, LF/hr)
--   material_rates       → material costs (per CY, per SF, per LF, etc.)
--   subcontractor_rates  → sub / equipment costs (pump, stamp, sand finish)
-- Run after supabase-update-13.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add category column to subcontractor_rates (idempotent) ────────────────
ALTER TABLE subcontractor_rates
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LABOR RATES  (production rates only — SF/hr, LF/hr)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM labor_rates WHERE name IN (
  'Concrete - Pour & Finish',
  'Concrete - Rebar 24" OC',
  'Concrete - Form Setting',
  'Concrete - Sleeves',
  'Concrete - Sealer Natural',
  'Concrete - Sealer Wet-Look',
  'Concrete - Vapor Barrier'
);

INSERT INTO labor_rates (name, rate, rate_per_day, unit, category, notes) VALUES
  ('Concrete - Pour & Finish',    23.0,  0, 'SF/hr', 'Concrete', 'SF installed per hour — pour, screed, finish'),
  ('Concrete - Rebar 24" OC',     60.0,  0, 'SF/hr', 'Concrete', 'SF rebar laid per hour at 24" OC spacing'),
  ('Concrete - Form Setting',     18.0,  0, 'LF/hr', 'Concrete', 'LF of form lumber set per hour'),
  ('Concrete - Sleeves',          10.0,  0, 'LF/hr', 'Concrete', 'LF of sleeve conduit installed per hour'),
  ('Concrete - Sealer Natural',  200.0,  0, 'SF/hr', 'Concrete', 'SF sealed per hour — natural/penetrating sealer'),
  ('Concrete - Sealer Wet-Look', 120.0,  0, 'SF/hr', 'Concrete', 'SF sealed per hour — wet-look surface sealer'),
  ('Concrete - Vapor Barrier',    15.0,  0, 'SF/hr', 'Concrete', 'SF vapor barrier installed per hour');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MATERIAL RATES  (unit costs for purchased materials)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM material_rates WHERE name IN (
  'Concrete - Per CY',
  'Concrete - Rebar Price SF',
  'Concrete - Form Lumber LF',
  'Concrete - Sleeve Per 10LF',
  'Concrete - Color Per CY',
  'Concrete - Sealer Natural 5gal',
  'Concrete - Sealer Wet 5gal',
  'Concrete - Vapor Barrier SF',
  'Concrete - Import Base'
);

INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Concrete - Per CY',           'cubic yard', 185.00,  'Concrete'),
  ('Concrete - Rebar Price SF',   'sqft',         0.8625,'Concrete'),
  ('Concrete - Form Lumber LF',   'LF',           1.73,  'Concrete'),
  ('Concrete - Sleeve Per 10LF',  'each',          4.60,  'Concrete'),
  ('Concrete - Color Per CY',     'cubic yard',   28.75,  'Concrete'),
  ('Concrete - Sealer Natural 5gal','5gal',       150.00, 'Concrete'),
  ('Concrete - Sealer Wet 5gal',  '5gal',        190.00, 'Concrete'),
  ('Concrete - Vapor Barrier SF', 'sqft',          0.22,  'Concrete'),
  ('Concrete - Import Base',      'ton',           7.50,  'Concrete');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SUBCONTRACTOR RATES  (pump truck, stamp sub, sand finish sub)
--    company_name holds the rate key; trade = 'Concrete'
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM subcontractor_rates WHERE company_name IN (
  'Concrete - Pump Flat Fee',
  'Concrete - Pump Per CY',
  'Concrete - Stamp Sub Flat',
  'Concrete - Stamp Sub Per CY',
  'Concrete - Sand Finish 400SF'
);

INSERT INTO subcontractor_rates (company_name, trade, rate, unit, category) VALUES
  ('Concrete - Pump Flat Fee',    'Concrete', 316.25, 'lump sum',       'Concrete'),
  ('Concrete - Pump Per CY',      'Concrete',   9.20, 'per cubic yard', 'Concrete'),
  ('Concrete - Stamp Sub Flat',   'Concrete', 800.00, 'lump sum',       'Concrete'),
  ('Concrete - Stamp Sub Per CY', 'Concrete', 120.00, 'per cubic yard', 'Concrete'),
  ('Concrete - Sand Finish 400SF','Concrete', 207.00, 'per 400 sqft',   'Concrete');
