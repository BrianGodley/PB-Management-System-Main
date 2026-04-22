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

-- ── Wall Finishes ─────────────────────────────────────────────────────────────
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
