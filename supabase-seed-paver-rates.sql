-- ============================================================
-- Seed Paver labor rates into labor_rates table (category='Paver')
-- and Paver material rates into material_rates table (category='Paver')
-- All editable in Master Rates
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Labor Rates ───────────────────────────────────────────────────────────────
-- Install rates (SF/hr or LF/hr)
INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Install',          20,    'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Install');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Straight Cut',     70,    'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Straight Cut');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Curved Cut',       30,    'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Curved Cut');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Restraints',       22,    'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Restraints');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Sleeves',          10,    'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Sleeves');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Vertical Soldier', 8,     'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Vertical Soldier');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Sealer',           200,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Sealer');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Step Straight',    1.5,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Step Straight');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Step Curved',      1.0,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Step Curved');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - 80mm Add',         0.15,  'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - 80mm Add');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Stone Add',        0.05,  'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Stone Add');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Color Add',        0.05,  'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Color Add');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Poly Sand Spread', 0.004, 'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Poly Sand Spread');

-- Base install rates by equipment method (tons/hr)
INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Base Bobcat Good', 10,    'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Base Bobcat Good');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Base Bobcat OK',   7.5,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Base Bobcat OK');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Base Mini Bobcat', 5,     'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Base Mini Bobcat');

INSERT INTO labor_rates (name, rate, category)
SELECT 'Paver - Base Hand',        2.5,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM labor_rates WHERE name = 'Paver - Base Hand');


-- ── Material Rates ────────────────────────────────────────────────────────────
-- Base and sand (per ton)
INSERT INTO material_rates (name, unit_cost, category)
SELECT 'Paver - Base Rock',           7.50,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Paver - Base Rock');

INSERT INTO material_rates (name, unit_cost, category)
SELECT 'Paver - Bedding Sand',        25.30,  'Paver'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Paver - Bedding Sand');

-- Install materials (per SF)
INSERT INTO material_rates (name, unit_cost, category)
SELECT 'Paver - Joint Sand',          0.05,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Paver - Joint Sand');

INSERT INTO material_rates (name, unit_cost, category)
SELECT 'Paver - Poly Sand',           0.56,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Paver - Poly Sand');

INSERT INTO material_rates (name, unit_cost, category)
SELECT 'Paver - Sealer',              0.63,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Paver - Sealer');

-- Install materials (per LF)
INSERT INTO material_rates (name, unit_cost, category)
SELECT 'Paver - Restraint Concrete',  1.38,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Paver - Restraint Concrete');

INSERT INTO material_rates (name, unit_cost, category)
SELECT 'Paver - Sleeves',             0.46,   'Paver'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Paver - Sleeves');

-- Per-pallet and delivery (flat charges)
INSERT INTO material_rates (name, unit_cost, category)
SELECT 'Paver - Pallet Charge',       51.75,  'Paver'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Paver - Pallet Charge');

INSERT INTO material_rates (name, unit_cost, category)
SELECT 'Paver - Delivery',            442.75, 'Paver'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Paver - Delivery');
