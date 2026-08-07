-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-outdoor-kitchen-seed.sql
-- Seed Outdoor Kitchen (BBQ) module rates into material_rates table
-- Run once in the Supabase SQL Editor
-- These appear in Master Rates → Materials Pricing (filter: Outdoor Kitchen)
-- and are read live by the Outdoor Kitchen Module estimator.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Structure materials ───────────────────────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('BBQ Block',         'per block', 2.50,   'Outdoor Kitchen'),
  ('BBQ Rebar',         'per LF',    0.40,   'Outdoor Kitchen'),
  ('BBQ Concrete',      'per CY',    149.50, 'Outdoor Kitchen'),
  ('BBQ Fill Material', 'per CY',    60.00,  'Outdoor Kitchen')
ON CONFLICT DO NOTHING;

-- ── Appliances & Services ─────────────────────────────────────────────────────
-- Hardware/misc cost per appliance opening (actual appliances are client-supplied or subbed)
-- GFIC outlet supply cost per outlet
-- Sink plumbing materials flat cost
-- Gas pipe cost per linear foot
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('BBQ Appliance Hardware', 'per unit', 3.00,   'Outdoor Kitchen'),
  ('GFIC Outlet - BBQ',      'per unit', 80.00,  'Outdoor Kitchen'),
  ('Sink Plumbing - BBQ',    'flat',     115.00, 'Outdoor Kitchen'),
  ('Gas Pipe - BBQ',         'per LF',   3.00,   'Outdoor Kitchen')
ON CONFLICT DO NOTHING;

-- ── Wall Finishes — Material Costs ───────────────────────────────────────────
-- Sand/Smooth Stucco: labor-only by default ($0 material) — update if supplying stucco
-- Ledgerstone / Stacked Stone: $/SF for panel material (10% waste added in calc)
-- Tile: $/SF (adhesive/grout $1/SF added automatically in calc)
-- Real Flagstone / Real Stone: $/ton defaults (editable per-job in the module form)
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Sand Stucco - BBQ',    'per SF',  0.00,   'Outdoor Kitchen'),
  ('Smooth Stucco - BBQ',  'per SF',  0.00,   'Outdoor Kitchen'),
  ('Ledgerstone - BBQ',    'per SF',  10.00,  'Outdoor Kitchen'),
  ('Stacked Stone - BBQ',  'per SF',  10.00,  'Outdoor Kitchen'),
  ('Tile - BBQ',           'per SF',  6.50,   'Outdoor Kitchen'),
  ('Real Flagstone - BBQ', 'per ton', 400.00, 'Outdoor Kitchen'),
  ('Real Stone - BBQ',     'per ton', 400.00, 'Outdoor Kitchen')
ON CONFLICT DO NOTHING;

-- ── Structure — Labor Productivity Rates ─────────────────────────────────────
-- Excavate: cubic feet of footing per hour (formula: totalLF × footingAreaSF / rate)
-- Rebar: LF per day (formula: LF / rate × 8)
-- Pour Footing: hours per CY of concrete
-- Block Install: blocks per day (formula: blocks / rate × 8)
-- Fill Block: blocks per day (80/75 factor applied in calc; formula: (80/75 × blocks / rate) × 8)
-- Counter Form: LF of form per hour (formula: counterSF × 2LF/SF / rate)
-- Counter Pour: SF per day
-- Counter Broom / Polished Finish: SF per day
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('BBQ Excavate Labor Rate',       'CF/hr',      5.00,  'Outdoor Kitchen'),
  ('BBQ Rebar Labor Rate',          'LF/day',     146.00,'Outdoor Kitchen'),
  ('BBQ Pour Footing Labor Rate',   'hrs/CY',     4.00,  'Outdoor Kitchen'),
  ('BBQ Block Install Labor Rate',  'blocks/day', 60.00, 'Outdoor Kitchen'),
  ('BBQ Fill Block Labor Rate',     'blocks/day', 146.00,'Outdoor Kitchen'),
  ('BBQ Counter Form Labor Rate',   'LF/hr',      20.00, 'Outdoor Kitchen'),
  ('BBQ Counter Pour Labor Rate',   'SF/day',     50.00, 'Outdoor Kitchen'),
  ('BBQ Counter Broom Labor Rate',  'SF/day',     60.00, 'Outdoor Kitchen'),
  ('BBQ Counter Polish Labor Rate', 'SF/day',     18.00, 'Outdoor Kitchen')
ON CONFLICT DO NOTHING;

-- ── Appliances & Services — Labor Productivity Rates ─────────────────────────
-- Appliance: appliances installed per day (formula: count / rate × 8)
-- GFIC: hours per outlet
-- Sink: flat hours for plumbing rough-in
-- Gas Trench: LF per day (formula: LF / rate × 8)
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('BBQ Appliance Labor Rate',  'per day', 2.75, 'Outdoor Kitchen'),
  ('BBQ GFIC Labor Rate',       'hrs/unit',2.00, 'Outdoor Kitchen'),
  ('BBQ Sink Labor Rate',       'hrs flat',4.00, 'Outdoor Kitchen'),
  ('BBQ Gas Trench Labor Rate', 'LF/day',  35.00,'Outdoor Kitchen')
ON CONFLICT DO NOTHING;

-- ── Wall Finishes — Labor Productivity Rates ──────────────────────────────────
-- Sand/Smooth Stucco: SF per day (formula: SF / rate × 8)
-- Ledgerstone/Stacked Stone: SF per day
-- Tile: combined hrs/SF (layout 400 SF/day + install 30 SF/day → 0.2867 hrs/SF)
-- Real Flagstone: combined hrs/SF (delivery/50 + install/35 + seal/133 SF/day → 0.4487 hrs/SF)
-- Real Stone: combined hrs/SF (transport/40 + install/13 + seal/100 SF/day → 0.8954 hrs/SF)
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Sand Stucco - BBQ Labor Rate',    'SF/day', 92.00,   'Outdoor Kitchen'),
  ('Smooth Stucco - BBQ Labor Rate',  'SF/day', 65.00,   'Outdoor Kitchen'),
  ('Ledgerstone - BBQ Labor Rate',    'SF/day', 24.00,   'Outdoor Kitchen'),
  ('Stacked Stone - BBQ Labor Rate',  'SF/day', 24.00,   'Outdoor Kitchen'),
  ('Tile - BBQ Labor Rate',           'hrs/SF', 0.2867,  'Outdoor Kitchen'),
  ('Real Flagstone - BBQ Labor Rate', 'hrs/SF', 0.4487,  'Outdoor Kitchen'),
  ('Real Stone - BBQ Labor Rate',     'hrs/SF', 0.8954,  'Outdoor Kitchen')
ON CONFLICT DO NOTHING;
