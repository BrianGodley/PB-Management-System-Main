-- ─────────────────────────────────────────────────────────────────────────────
-- Planting Module — Seed Data
-- Run this once in the Supabase SQL Editor to populate Master Rates
-- with all Planting material prices and labor rates.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Material Prices (material_rates, category = 'Planting') ──────────────────
-- Small Plants
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Flats of Groundcover', 'each', 18.00,  'Planting'),
  ('Flats of 4" pots',     'each', 20.00,  'Planting'),
  ('4" pots standard',     'each', 0.00,   'Planting'),
  ('4" pots succulents',   'each', 7.00,   'Planting'),
  ('6" pots standard',     'each', 0.00,   'Planting'),
  ('6" pots succulents',   'each', 12.00,  'Planting'),
  ('1 gallon standard',    'each', 6.50,   'Planting'),
  ('1 gallon premium',     'each', 8.00,   'Planting'),
  ('1 gallon succulents',  'each', 18.00,  'Planting'),
  ('3 gallon standard',    'each', 7.00,   'Planting'),
  ('5 gallon standard',    'each', 17.00,  'Planting'),
  ('5 gallon premium',     'each', 35.00,  'Planting'),
  ('5 gallon succulents',  'each', 39.00,  'Planting'),
  ('5 gallon bamboo',      'each', 40.00,  'Planting'),
  ('5 gallon palm',        'each', 50.00,  'Planting'),
-- Large Plants / Trees
  ('15 gallon standard',   'each', 52.00,  'Planting'),
  ('15 gallon premium',    'each', 90.00,  'Planting'),
  ('15 gallon succulents', 'each', 225.00, 'Planting'),
  ('15 gallon fruit',      'each', 145.00, 'Planting'),
  ('15 gallon palms',      'each', 175.00, 'Planting'),
  ('24" box standard',     'each', 185.00, 'Planting'),
  ('24" box premium',      'each', 250.00, 'Planting'),
  ('24" box fruit',        'each', 0.00,   'Planting'),
  ('24" box palm',         'each', 0.00,   'Planting'),
  ('36" box standard',     'each', 450.00, 'Planting'),
  ('36" box premium',      'each', 600.00, 'Planting'),
  ('36" box fruit',        'each', 0.00,   'Planting'),
  ('36" box palm',         'each', 0.00,   'Planting'),
  ('48" box standard',     'each', 800.00, 'Planting'),
  ('48" box premium',      'each', 0.00,   'Planting'),
  ('48" box fruit',        'each', 0.00,   'Planting'),
  ('48" box palm',         'each', 0.00,   'Planting'),
-- Add-On Materials
  ('Tree Stake',            'each',       8.50,  'Planting'),
  ('Root Barrier 12in',     'linear ft',  5.00,  'Planting'),
  ('Root Barrier 24in',     'linear ft',  7.00,  'Planting'),
  ('Gopher Basket 1 Gal',   'each',       3.42,  'Planting'),
  ('Gopher Basket 5 Gal',   'each',       7.78,  'Planting'),
  ('Gopher Basket 15 Gal',  'each',       10.50, 'Planting'),
  ('Mesh Flat',             'sqft',       1.00,  'Planting'),
  ('Jute Fabric',           'sqft',       0.40,  'Planting');

-- ── Labor Rates (labor_rates, category = 'Planting') ─────────────────────────
-- Small Plant Install Rates (plants per man-day)
INSERT INTO labor_rates (name, rate, unit, category, rate_per_day, notes) VALUES
  ('Flats of Groundcover', 25,   'plants/day', 'Planting', 25,   'Flats of groundcover installed per man-day'),
  ('Flats of 4" pots',     20,   'plants/day', 'Planting', 20,   'Flats of 4" pots installed per man-day'),
  ('4" pots standard',     280,  'plants/day', 'Planting', 280,  '4" standard pots installed per man-day'),
  ('4" pots succulents',   280,  'plants/day', 'Planting', 280,  '4" succulent pots installed per man-day'),
  ('6" pots standard',     180,  'plants/day', 'Planting', 180,  '6" standard pots installed per man-day'),
  ('6" pots succulents',   180,  'plants/day', 'Planting', 180,  '6" succulent pots installed per man-day'),
  ('1 gallon standard',    70,   'plants/day', 'Planting', 70,   '1 gal standard installed per man-day'),
  ('1 gallon premium',     70,   'plants/day', 'Planting', 70,   '1 gal premium installed per man-day'),
  ('1 gallon succulents',  70,   'plants/day', 'Planting', 70,   '1 gal succulents installed per man-day'),
  ('3 gallon standard',    70,   'plants/day', 'Planting', 70,   '3 gal standard installed per man-day'),
  ('5 gallon standard',    40,   'plants/day', 'Planting', 40,   '5 gal standard installed per man-day'),
  ('5 gallon premium',     40,   'plants/day', 'Planting', 40,   '5 gal premium installed per man-day'),
  ('5 gallon succulents',  40,   'plants/day', 'Planting', 40,   '5 gal succulents installed per man-day'),
  ('5 gallon bamboo',      40,   'plants/day', 'Planting', 40,   '5 gal bamboo installed per man-day'),
  ('5 gallon palm',        40,   'plants/day', 'Planting', 40,   '5 gal palm installed per man-day'),
-- Large Plant / Tree Install Rates (plants per man-day)
  ('15 gallon standard',   15,   'plants/day', 'Planting', 15,   '15 gal standard installed per man-day'),
  ('15 gallon premium',    15,   'plants/day', 'Planting', 15,   '15 gal premium installed per man-day'),
  ('15 gallon succulents', 15,   'plants/day', 'Planting', 15,   '15 gal succulents installed per man-day'),
  ('15 gallon fruit',      15,   'plants/day', 'Planting', 15,   '15 gal fruit installed per man-day'),
  ('15 gallon palms',      15,   'plants/day', 'Planting', 15,   '15 gal palms installed per man-day'),
  ('24" box standard',     4,    'plants/day', 'Planting', 4,    '24" box standard installed per man-day'),
  ('24" box premium',      4,    'plants/day', 'Planting', 4,    '24" box premium installed per man-day'),
  ('24" box fruit',        4,    'plants/day', 'Planting', 4,    '24" box fruit installed per man-day'),
  ('24" box palm',         4,    'plants/day', 'Planting', 4,    '24" box palm installed per man-day'),
  ('36" box standard',     0.75, 'plants/day', 'Planting', 0.75, '36" box standard — 0.75 trees per man-day'),
  ('36" box premium',      0.75, 'plants/day', 'Planting', 0.75, '36" box premium — 0.75 trees per man-day'),
  ('36" box fruit',        0.75, 'plants/day', 'Planting', 0.75, '36" box fruit — 0.75 trees per man-day'),
  ('36" box palm',         0.75, 'plants/day', 'Planting', 0.75, '36" box palm — 0.75 trees per man-day'),
  ('48" box standard',     0.3,  'plants/day', 'Planting', 0.3,  '48" box standard — 0.3 trees per man-day'),
  ('48" box premium',      0.3,  'plants/day', 'Planting', 0.3,  '48" box premium — 0.3 trees per man-day'),
  ('48" box fruit',        0.3,  'plants/day', 'Planting', 0.3,  '48" box fruit — 0.3 trees per man-day'),
  ('48" box palm',         0.3,  'plants/day', 'Planting', 0.3,  '48" box palm — 0.3 trees per man-day'),
-- Till and Amend Rates
  ('Till - Soil Move Rate',  39,   'CY/day',    'Planting', 39,   'Cubic yards of soil amendment moved per man-day'),
  ('Till - Tilling Rate',    3600, 'sqft/day',  'Planting', 3600, 'Square feet tilled/rototilled per man-day'),
  ('Till - Amend Rate',      900,  'sqft/day',  'Planting', 900,  'Square feet amended (spread & worked in) per man-day'),
-- Add-On Labor Rates
  ('Tree Stakes - Install Rate',   24,  'plants/day', 'Planting', 24,  'Stakes installed per man-day'),
  ('Root Barrier - Install Rate',  20,  'min/LF',     'Planting', 20,  'Minutes per linear foot of root barrier'),
  ('Gopher Basket - Install Rate', 2,   'min/ea',     'Planting', 2,   'Minutes per gopher basket installed'),
  ('Mesh Flat - Install Rate',     0.7, 'min/sqft',   'Planting', 0.7, 'Minutes per sqft of mesh flat'),
  ('Jute Fabric - Install Rate',   1.1, 'min/sqft',   'Planting', 1.1, 'Minutes per sqft of jute fabric');
