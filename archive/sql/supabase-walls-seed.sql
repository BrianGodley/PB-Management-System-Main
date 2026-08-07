-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-walls-seed.sql
-- Seed Walls Module rates into material_rates table
-- Run once in the Supabase SQL Editor
-- These appear in Master Rates → Materials Pricing (filter: Walls)
-- and are read live by the Walls Module estimator.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── CMU structural material costs ────────────────────────────────────────────
-- Standard 8×8×16 grey CMU block price per block
-- Bond beam block price per block
-- Rebar: $/LF
-- Spec mix bag 80lb: for hand-mix grouting
-- Concrete Hand Mix: $/CY — used for hand-poured footing & hand grout
-- Concrete Truck: $/CY — truck-delivered, used when pump is selected
-- Grout Pump Setup: flat fee when pump is rented for grouting
-- Grout Pump Per Yard: $/CY additional pump charge per yard grouted
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Wall Grey Block',        'per block', 2.59,   'Walls'),
  ('Wall Bondbeam Block',    'per block', 2.59,   'Walls'),
  ('Wall Rebar',             'per LF',    1.399,  'Walls'),
  ('Wall Spec Mix Bag 80lb', 'per bag',   8.57,   'Walls'),
  ('Wall Concrete Hand Mix', 'per CY',    92.00,  'Walls'),
  ('Wall Concrete Truck',    'per CY',    185.00, 'Walls'),
  ('Wall Grout Pump Setup',  'flat',      402.50, 'Walls'),
  ('Wall Grout Pump Per Yard','per CY',   9.20,   'Walls')
ON CONFLICT DO NOTHING;

-- ── Wall finish material costs ────────────────────────────────────────────────
-- Sand/Smooth Stucco: labor-only by default ($0 material) — update if supplying stucco
-- Ledgerstone / Stacked Stone: $/SF panel (10% waste added in calc)
-- Tile: $/SF (adhesive/grout $1/SF added automatically in calc)
-- Real Flagstone / Real Stone: $/ton defaults (editable per-job in the module form)
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Sand Stucco - Wall',        'per SF',  0.00,   'Walls'),
  ('Smooth Stucco - Wall',      'per SF',  0.00,   'Walls'),
  ('Ledgerstone - Wall',        'per SF',  10.00,  'Walls'),
  ('Stacked Stone - Wall',      'per SF',  10.00,  'Walls'),
  ('Tile - Wall',               'per SF',  6.50,   'Walls'),
  ('Real Flagstone - Wall',     'per ton', 400.00, 'Walls'),
  ('Real Stone - Wall',         'per ton', 400.00, 'Walls')
ON CONFLICT DO NOTHING;

-- ── Wall cap material costs ───────────────────────────────────────────────────
-- Flagstone cap: $/ton
-- Precast cap: $/piece
-- Bullnose Brick cap: $/LF
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Wall Cap Flagstone',    'per ton',   500.00, 'Walls'),
  ('Wall Cap Precast',      'per piece',  50.00, 'Walls'),
  ('Wall Cap Bullnose Brick','per LF',     5.00, 'Walls')
ON CONFLICT DO NOTHING;

-- ── Waterproofing material costs ─────────────────────────────────────────────
-- All options priced per SF of wall surface area treated
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Wall WP Primer Membrane',  'per SF', 1.80, 'Walls'),
  ('Wall WP 3 Coat Roll On',   'per SF', 1.20, 'Walls'),
  ('Wall WP Thoroseal Roll On','per SF', 1.50, 'Walls'),
  ('Wall WP Dimple Membrane',  'per SF', 2.10, 'Walls')
ON CONFLICT DO NOTHING;

-- ── CMU structural labor productivity rates → labor_rates table ──────────────
-- Dig Footing: cubic feet excavated per hour     → footingCF / rate = hours
-- Set Rebar: linear feet of rebar placed per hour → rebarLF / rate = hours
-- Set Block: blocks installed per hour            → rawBlocks / rate = hours
-- Hand Grout: CF of grout placed per hour         → groutCF / rate = hours
-- Pump Grout: CF of grout placed per hour (pump)  → groutCF / rate = hours
-- Setup Clean: LF of wall prepped/cleaned per hour → wallLF / rate = hours
INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('Wall Dig Footing Labor Rate',  4.0,  'CF/hr',     'Walls'),
  ('Wall Set Rebar Labor Rate',    35.0, 'LF/hr',     'Walls'),
  ('Wall Set Block Labor Rate',    10.4, 'blocks/hr', 'Walls'),
  ('Wall Hand Grout Labor Rate',   5.5,  'CF/hr',     'Walls'),
  ('Wall Pump Grout Labor Rate',   81.0, 'CF/hr',     'Walls'),
  ('Wall Setup Clean Labor Rate',  30.0, 'LF/hr',     'Walls')
ON CONFLICT DO NOTHING;

-- ── Wall finish labor productivity rates → labor_rates table ─────────────────
-- Sand/Smooth Stucco: SF per day  → SF / rate × 8 = hours
-- Ledgerstone / Stacked Stone: SF per day
-- Tile: combined hrs/SF (layout 400 SF/day + install 30 SF/day = 0.2867 hrs/SF)
-- Real Flagstone: combined hrs/SF (delivery + install + seal = 0.4487 hrs/SF)
-- Real Stone: combined hrs/SF (transport + install + seal = 0.8954 hrs/SF)
INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('Sand Stucco - Wall Labor Rate',    92.00,  'SF/day', 'Walls'),
  ('Smooth Stucco - Wall Labor Rate',  65.00,  'SF/day', 'Walls'),
  ('Ledgerstone - Wall Labor Rate',    24.00,  'SF/day', 'Walls'),
  ('Stacked Stone - Wall Labor Rate',  24.00,  'SF/day', 'Walls'),
  ('Tile - Wall Labor Rate',           0.2867, 'hrs/SF', 'Walls'),
  ('Real Flagstone - Wall Labor Rate', 0.4487, 'hrs/SF', 'Walls'),
  ('Real Stone - Wall Labor Rate',     0.8954, 'hrs/SF', 'Walls')
ON CONFLICT DO NOTHING;
