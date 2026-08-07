-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-fix-all-labor-rates-migration.sql
-- Moves labor productivity rates from material_rates → labor_rates for all
-- modules that were seeded incorrectly (Fire Pit, Outdoor Kitchen,
-- Ground Treatments, Columns, Utilities).
--
-- Run ONCE in the Supabase SQL Editor.
-- Safe to run even if some rates are already in labor_rates (ON CONFLICT DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIRE PIT  (category = 'Fire Pit')
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('FP Dig Footing Labor Rate',      4.0,    'CF/hr',     'Fire Pit'),
  ('FP Set Rebar Labor Rate',        35.0,   'LF/hr',     'Fire Pit'),
  ('FP Set Blocks Labor Rate',       10.4,   'blocks/hr', 'Fire Pit'),
  ('FP Hand Grout Labor Rate',       5.5,    'CF/hr',     'Fire Pit'),
  ('FP Pump Grout Labor Rate',       81.0,   'CF/hr',     'Fire Pit'),
  ('FP Gas Trench Labor Rate',       35.0,   'LF/day',    'Fire Pit'),
  ('Sand Stucco - FP Labor Rate',    92.00,  'SF/day',    'Fire Pit'),
  ('Smooth Stucco - FP Labor Rate',  65.00,  'SF/day',    'Fire Pit'),
  ('Ledgerstone - FP Labor Rate',    24.00,  'SF/day',    'Fire Pit'),
  ('Stacked Stone - FP Labor Rate',  24.00,  'SF/day',    'Fire Pit'),
  ('Tile - FP Labor Rate',           0.2867, 'hrs/SF',    'Fire Pit'),
  ('Real Flagstone - FP Labor Rate', 0.4487, 'hrs/SF',    'Fire Pit'),
  ('Real Stone - FP Labor Rate',     0.8954, 'hrs/SF',    'Fire Pit')
ON CONFLICT DO NOTHING;

DELETE FROM material_rates
WHERE category = 'Fire Pit'
  AND name IN (
    'FP Dig Footing Labor Rate', 'FP Set Rebar Labor Rate', 'FP Set Blocks Labor Rate',
    'FP Hand Grout Labor Rate',  'FP Pump Grout Labor Rate','FP Gas Trench Labor Rate',
    'Sand Stucco - FP Labor Rate',    'Smooth Stucco - FP Labor Rate',
    'Ledgerstone - FP Labor Rate',    'Stacked Stone - FP Labor Rate',
    'Tile - FP Labor Rate',           'Real Flagstone - FP Labor Rate',
    'Real Stone - FP Labor Rate'
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- OUTDOOR KITCHEN  (category = 'Outdoor Kitchen')
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('BBQ Excavate Labor Rate',           5.00,   'CF/hr',      'Outdoor Kitchen'),
  ('BBQ Rebar Labor Rate',              146.00, 'LF/day',     'Outdoor Kitchen'),
  ('BBQ Pour Footing Labor Rate',       4.00,   'hrs/CY',     'Outdoor Kitchen'),
  ('BBQ Block Install Labor Rate',      60.00,  'blocks/day', 'Outdoor Kitchen'),
  ('BBQ Fill Block Labor Rate',         146.00, 'blocks/day', 'Outdoor Kitchen'),
  ('BBQ Counter Form Labor Rate',       20.00,  'LF/hr',      'Outdoor Kitchen'),
  ('BBQ Counter Pour Labor Rate',       50.00,  'SF/day',     'Outdoor Kitchen'),
  ('BBQ Counter Broom Labor Rate',      60.00,  'SF/day',     'Outdoor Kitchen'),
  ('BBQ Counter Polish Labor Rate',     18.00,  'SF/day',     'Outdoor Kitchen'),
  ('BBQ Appliance Labor Rate',          2.75,   'per day',    'Outdoor Kitchen'),
  ('BBQ GFIC Labor Rate',               2.00,   'hrs/unit',   'Outdoor Kitchen'),
  ('BBQ Sink Labor Rate',               4.00,   'hrs flat',   'Outdoor Kitchen'),
  ('BBQ Gas Trench Labor Rate',         35.00,  'LF/day',     'Outdoor Kitchen'),
  ('Sand Stucco - BBQ Labor Rate',      92.00,  'SF/day',     'Outdoor Kitchen'),
  ('Smooth Stucco - BBQ Labor Rate',    65.00,  'SF/day',     'Outdoor Kitchen'),
  ('Ledgerstone - BBQ Labor Rate',      24.00,  'SF/day',     'Outdoor Kitchen'),
  ('Stacked Stone - BBQ Labor Rate',    24.00,  'SF/day',     'Outdoor Kitchen'),
  ('Tile - BBQ Labor Rate',             0.2867, 'hrs/SF',     'Outdoor Kitchen'),
  ('Real Flagstone - BBQ Labor Rate',   0.4487, 'hrs/SF',     'Outdoor Kitchen'),
  ('Real Stone - BBQ Labor Rate',       0.8954, 'hrs/SF',     'Outdoor Kitchen')
ON CONFLICT DO NOTHING;

DELETE FROM material_rates
WHERE category = 'Outdoor Kitchen'
  AND name IN (
    'BBQ Excavate Labor Rate',     'BBQ Rebar Labor Rate',       'BBQ Pour Footing Labor Rate',
    'BBQ Block Install Labor Rate','BBQ Fill Block Labor Rate',  'BBQ Counter Form Labor Rate',
    'BBQ Counter Pour Labor Rate', 'BBQ Counter Broom Labor Rate','BBQ Counter Polish Labor Rate',
    'BBQ Appliance Labor Rate',    'BBQ GFIC Labor Rate',        'BBQ Sink Labor Rate',
    'BBQ Gas Trench Labor Rate',
    'Sand Stucco - BBQ Labor Rate',   'Smooth Stucco - BBQ Labor Rate',
    'Ledgerstone - BBQ Labor Rate',   'Stacked Stone - BBQ Labor Rate',
    'Tile - BBQ Labor Rate',          'Real Flagstone - BBQ Labor Rate',
    'Real Stone - BBQ Labor Rate'
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- GROUND TREATMENTS  (category = 'Ground Treatments')
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('Plastic Edging - Labor Rate',         0.09,    'hrs/LF', 'Ground Treatments'),
  ('Metal Edging - Labor Rate',           0.17,    'hrs/LF', 'Ground Treatments'),
  ('Soil Prep - Labor Rate',              0.012,   'hrs/SF', 'Ground Treatments'),
  ('Sod - Labor Rate',                    0.01143, 'hrs/SF', 'Ground Treatments'),
  ('Flagstone Steppers - Labor Rate',     35.00,   'SF/day', 'Ground Treatments'),
  ('Precast Steppers - Labor Rate',       50.00,   'SF/day', 'Ground Treatments'),
  ('Gravel Fabric - Labor Rate',          0.024,   'hrs/SF', 'Ground Treatments')
ON CONFLICT DO NOTHING;

DELETE FROM material_rates
WHERE category = 'Ground Treatments'
  AND name IN (
    'Plastic Edging - Labor Rate',   'Metal Edging - Labor Rate',
    'Soil Prep - Labor Rate',        'Sod - Labor Rate',
    'Flagstone Steppers - Labor Rate','Precast Steppers - Labor Rate',
    'Gravel Fabric - Labor Rate'
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- COLUMNS  (category = 'Columns')
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('CMU Install Labor',                    0.083, 'hrs/block', 'Columns'),
  ('Sand Stucco - Labor Rate',             0.050, 'hrs/SF',    'Columns'),
  ('Smooth Stucco - Labor Rate',           0.050, 'hrs/SF',    'Columns'),
  ('Ledgerstone Veneer Panels - Labor Rate',0.100,'hrs/SF',    'Columns'),
  ('Stacked Stone Veneer - Labor Rate',    0.100, 'hrs/SF',    'Columns'),
  ('Tile - Columns - Labor Rate',          0.125, 'hrs/SF',    'Columns'),
  ('Real Flagstone Flat - Labor Rate',     0.500, 'hrs/ton',   'Columns'),
  ('Real Stone - Columns - Labor Rate',    0.500, 'hrs/ton',   'Columns')
ON CONFLICT DO NOTHING;

DELETE FROM material_rates
WHERE category = 'Columns'
  AND name IN (
    'CMU Install Labor',
    'Sand Stucco - Labor Rate',             'Smooth Stucco - Labor Rate',
    'Ledgerstone Veneer Panels - Labor Rate','Stacked Stone Veneer - Labor Rate',
    'Tile - Columns - Labor Rate',          'Real Flagstone Flat - Labor Rate',
    'Real Stone - Columns - Labor Rate'
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- UTILITIES  (category = 'Utilities')
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('PVC Conduit with Electrical - Labor Rate',  0.05, 'hrs/LF', 'Utilities'),
  ('1" Black Iron Gas Pipe - Labor Rate',       0.15, 'hrs/LF', 'Utilities'),
  ('1-1/2" Black Iron Gas Pipe - Labor Rate',   0.20, 'hrs/LF', 'Utilities'),
  ('12" Single Gas Ring - Labor Rate',          2.00, 'hrs/ea', 'Utilities'),
  ('Curb Core - Labor Rate',                    2.00, 'hrs/ea', 'Utilities'),
  ('Hydrocut Under Hardscape - Labor Rate',     2.00, 'hrs/ea', 'Utilities')
ON CONFLICT DO NOTHING;

DELETE FROM material_rates
WHERE category = 'Utilities'
  AND name IN (
    'PVC Conduit with Electrical - Labor Rate',
    '1" Black Iron Gas Pipe - Labor Rate',
    '1-1/2" Black Iron Gas Pipe - Labor Rate',
    '12" Single Gas Ring - Labor Rate',
    'Curb Core - Labor Rate',
    'Hydrocut Under Hardscape - Labor Rate'
  );
