-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-firepit-seed.sql
-- Seed Fire Pit module rates into material_rates table
-- Run once in the Supabase SQL Editor
-- These appear in Master Rates → Materials Pricing (filter: Fire Pit)
-- and are read live by the Fire Pit Module estimator.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Structural material costs ─────────────────────────────────────────────────
-- Standard 16"×8"×8" CMU block price per block
-- Rebar: $/LF (vertical + horizontal)
-- Concrete: $/CY — used for both footing pour and grout mix
-- Grout Pump Setup: flat fee charged when pump is used for grouting
-- Gas Ring/Burner: hardware cost per opening
-- Gas Pipe: $/LF for gas trench run
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('FP Block',            'per block', 2.50,   'Fire Pit'),
  ('FP Rebar',            'per LF',    0.50,   'Fire Pit'),
  ('FP Concrete',         'per CY',    149.50, 'Fire Pit'),
  ('FP Grout Pump Setup', 'flat',      150.00, 'Fire Pit'),
  ('FP Gas Ring/Burner',  'per unit',  25.00,  'Fire Pit'),
  ('FP Gas Pipe',         'per LF',    3.00,   'Fire Pit')
ON CONFLICT DO NOTHING;

-- ── Wall finish material costs ────────────────────────────────────────────────
-- Sand/Smooth Stucco: labor-only by default ($0 material) — update if supplying stucco
-- Ledgerstone / Stacked Stone: $/SF for panel material (10% waste added in calc)
-- Tile: $/SF (adhesive/grout $1/SF added automatically in calc)
-- Real Flagstone / Real Stone: $/ton defaults (editable per-job in the module form)
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Sand Stucco - FP',     'per SF',  0.00,   'Fire Pit'),
  ('Smooth Stucco - FP',   'per SF',  0.00,   'Fire Pit'),
  ('Ledgerstone - FP',     'per SF',  10.00,  'Fire Pit'),
  ('Stacked Stone - FP',   'per SF',  10.00,  'Fire Pit'),
  ('Tile - FP',            'per SF',  6.50,   'Fire Pit'),
  ('Real Flagstone - FP',  'per ton', 400.00, 'Fire Pit'),
  ('Real Stone - FP',      'per ton', 400.00, 'Fire Pit')
ON CONFLICT DO NOTHING;

-- ── Structural labor productivity rates ──────────────────────────────────────
-- Dig Footing: cubic feet of footing excavated per hour
--   formula: footingCF / rate = hours
-- Set Rebar: linear feet of rebar placed per hour
--   formula: totalRebarLF / rate = hours
-- Set Blocks: blocks installed per hour (standard CMU, 16"×8")
--   formula: rawBlocks / rate = hours
-- Hand Grout: cubic feet of grout placed per hour (no pump)
--   formula: groutCF / rate = hours
-- Pump Grout: cubic feet of grout placed per hour (with pump)
--   formula: groutCF / rate = hours
-- Gas Trench: linear feet trenched per day
--   formula: gasTrenchLF / rate × 8 = hours
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('FP Dig Footing Labor Rate',  'CF/hr',     4.0,  'Fire Pit'),
  ('FP Set Rebar Labor Rate',    'LF/hr',     35.0, 'Fire Pit'),
  ('FP Set Blocks Labor Rate',   'blocks/hr', 10.4, 'Fire Pit'),
  ('FP Hand Grout Labor Rate',   'CF/hr',     5.5,  'Fire Pit'),
  ('FP Pump Grout Labor Rate',   'CF/hr',     81.0, 'Fire Pit'),
  ('FP Gas Trench Labor Rate',   'LF/day',    35.0, 'Fire Pit')
ON CONFLICT DO NOTHING;

-- ── Wall finish labor productivity rates → labor_rates table ───────────────
INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('Sand Stucco - FP Labor Rate',    92.00,  'SF/day', 'Fire Pit'),
  ('Smooth Stucco - FP Labor Rate',  65.00,  'SF/day', 'Fire Pit'),
  ('Ledgerstone - FP Labor Rate',    24.00,  'SF/day', 'Fire Pit'),
  ('Stacked Stone - FP Labor Rate',  24.00,  'SF/day', 'Fire Pit'),
  ('Tile - FP Labor Rate',           0.2867, 'hrs/SF', 'Fire Pit'),
  ('Real Flagstone - FP Labor Rate', 0.4487, 'hrs/SF', 'Fire Pit'),
  ('Real Stone - FP Labor Rate',     0.8954, 'hrs/SF', 'Fire Pit')
ON CONFLICT DO NOTHING;
