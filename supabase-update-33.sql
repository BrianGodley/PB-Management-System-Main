-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-33.sql
-- Adds Artificial Turf labor rates and material rates to the database.
-- All rates are referenced by ArtificialTurfModule.jsx and ArtificialTurfSummary.jsx.
--
-- labor_rates  (category = 'Artificial Turf') — demo and install productivity rates
-- material_rates (category = 'Artificial Turf') — turf brands, base, infill, install materials
-- material_rates (category = 'Demo') — dump fees (if not already present from prior migrations)
--
-- Source: Excel "Artificial Turf Module" + "Master Rates and Calcs" + "Softscape Prices"
-- Run after supabase-update-32.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Remove existing rows (idempotent) ─────────────────────────────────────────

DELETE FROM labor_rates    WHERE category = 'Artificial Turf';
DELETE FROM material_rates WHERE category = 'Artificial Turf';

-- ── Labor rates — Demo (DemoRatesTurf lookup table, K64:L68) ─────────────────
-- rate = tons/hr — module computes: hrs = tons / rate
-- tons = (SF / 200) × depth_inches

INSERT INTO labor_rates (name, rate, rate_per_day, unit, category, notes) VALUES

  ('Turf - Demo Skid Steer Good',
   2.0, 0, 'tons/hr', 'Artificial Turf',
   'Full skid steer demo rate for turf prep — 2.0 tons/hr. Excel DemoRatesTurf: Bobcat Good=2.'),

  ('Turf - Demo Skid Steer OK',
   1.5, 0, 'tons/hr', 'Artificial Turf',
   'Skid steer (partial access) demo rate — 1.5 tons/hr. Excel DemoRatesTurf: Bobcat OK=1.5.'),

  ('Turf - Demo Mini Skid Steer',
   0.75, 0, 'tons/hr', 'Artificial Turf',
   'Mini skid steer demo rate — 0.75 tons/hr. Excel DemoRatesTurf: Mini Bobcat=0.75.'),

  ('Turf - Demo Wheelbarrow',
   0.5, 0, 'tons/hr', 'Artificial Turf',
   'Wheelbarrow demo rate — 0.5 tons/hr. Excel DemoRatesTurf: Wheelbarrow=0.5.'),

  ('Turf - Demo Hand',
   0.38, 0, 'tons/hr', 'Artificial Turf',
   'Hand demo rate — 0.38 tons/hr. Excel DemoRatesTurf: Hand=0.38.');

-- ── Labor rates — Base / Install constants ────────────────────────────────────
-- These are stored as informational reference; the module uses RATE_DEFAULTS constants.
-- Updating these rows in the DB will NOT change module behavior (constants are hardcoded).
-- Rates noted here for audit / documentation purposes.

INSERT INTO labor_rates (name, rate, rate_per_day, unit, category, notes) VALUES

  ('Turf - Base Install Rate',
   0.25, 0, 'hrs/10SF', 'Artificial Turf',
   'Base gravel spread rate — (SF/10)*0.25 hrs. Excel BaseTurfRate=0.25, BaseTurfSfPerHr=10.'),

  ('Turf - Install Layout',
   0.5, 0, 'hrs/20SF', 'Artificial Turf',
   'Turf roll install rate — SF/20*0.5 hrs. Excel TurfSFHr=20, TurfPH=0.5.'),

  ('Turf - Cut Staple Seam',
   1.0, 0, 'hrs/100LF', 'Artificial Turf',
   'Cut, staple and seam labor — (LF/100)*1.0 hrs. Excel TurfCutSfHr=100, TurfCutRate=1.0.'),

  ('Turf - Weed Fabric Install',
   8.0, 0, 'hrs/1000SF', 'Artificial Turf',
   'Weed barrier fabric install — (SF/1000)*8 hrs. Excel formula: =(K10/1000)*8.');

-- ── Material rates — Turf Brands (ArtTurfPrices, Softscape Prices A2:F11) ─────
-- unit_cost = $/SF (before any markup)

INSERT INTO material_rates (name, unit_cost, unit, category, notes) VALUES

  ('Turf - Socal Blen Supreme 80',
   2.39, 'per sqft', 'Artificial Turf',
   'Socal Blen Supreme - 80oz face weight, 2" pile. Simple Turf brand. $2.39/SF.'),

  ('Turf - Bel Air SH 92/66',
   1.79, 'per sqft', 'Artificial Turf',
   'Bel Air SH 92/66 face weight, 1-3/4" pile. Simple Turf brand. $1.79/SF.'),

  ('Turf - Venice SH Light 50',
   1.49, 'per sqft', 'Artificial Turf',
   'Venice SH Light - 50oz face weight, 1-5/8" pile. Simple Turf brand. $1.49/SF.'),

  ('Turf - Bel Air SH Light 50',
   1.29, 'per sqft', 'Artificial Turf',
   'Bel Air SH Light - 50oz face weight, 1-5/8" pile. Simple Turf brand. $1.29/SF.'),

  ('Turf - Performance Play 63',
   1.79, 'per sqft', 'Artificial Turf',
   'Performance Play - 63oz face weight, 1-1/4" pile. Simple Turf brand. $1.79/SF.'),

  ('Turf - Autumn Grass 75',
   2.98, 'per sqft', 'Artificial Turf',
   'Autumn Grass - 75oz face weight, 1-3/4" pile. Simple Turf brand. $2.98/SF.'),

  ('Turf - Bel Air Supreme 90',
   1.98, 'per sqft', 'Artificial Turf',
   'Bel Air Supreme - 90oz face weight, 1-7/8" pile. Simple Turf brand. $1.98/SF.'),

  ('Turf - Pet Turf Pro 85',
   2.29, 'per sqft', 'Artificial Turf',
   'Pet Turf Pro - 85oz face weight, 2" pile. Simple Turf brand. $2.29/SF.'),

  ('Turf - Verdant Supreme 94',
   2.39, 'per sqft', 'Artificial Turf',
   'Verdant Supreme - 94oz face weight, 2" pile. Simple Turf brand. $2.39/SF.'),

  ('Turf - Golf Pro SH 47',
   1.98, 'per sqft', 'Artificial Turf',
   'Golf Pro SH - 47oz face weight, 2" pile. Simple Turf brand. $1.98/SF.');

-- ── Material rates — Base Materials ──────────────────────────────────────────

INSERT INTO material_rates (name, unit_cost, unit, category, notes) VALUES

  ('Turf - Gravel Base',
   6.90, 'per ton', 'Artificial Turf',
   'Gravel base material — $6.90/ton. Excel V8=6.9. Tons = (SF/200)*2 for 2" depth.'),

  ('Turf - DG Base',
   57.50, 'per ton', 'Artificial Turf',
   'Decomposed granite base — $57.50/ton. Excel V9=57.5. Tons = (SF*(1/12))/27 for 1" depth.'),

  ('Turf - Weed Barrier Fabric',
   165.00, 'per roll', 'Artificial Turf',
   'Weed barrier fabric — $165.00/roll. Excel V10=165. 1 roll covers 1,800 SF. Rolls = ROUNDUP(SF/1800,0).');

-- ── Material rates — Install Materials (Cut, Staple, Seam) ───────────────────
-- Combined rate per LF of edge — Excel TurfInstallMaterials (M83:M85):
--   Staples: $35.08/1200SF = $0.029/SF
--   Seam tape: $25.29/500SF = $0.0506/SF
--   Nails: $45.43/750SF = $0.0605/SF
--   Total: ≈$0.140 per LF (as used in Excel formula S18 = O18 × totalLF)

INSERT INTO material_rates (name, unit_cost, unit, category, notes) VALUES

  ('Turf - Install Materials',
   0.140, 'per LF', 'Artificial Turf',
   'Combined staples + seam tape + nails — $0.140/LF of edge. Excel S18=SUM(TurfInstallMaterials)*totalEdgeLF. Components: staples $0.029/SF, seam $0.051/SF, nails $0.061/SF.');

-- ── Material rates — Infill ───────────────────────────────────────────────────

INSERT INTO material_rates (name, unit_cost, unit, category, notes) VALUES

  ('Turf - Infill Durafill',
   0.62, 'per sqft', 'Artificial Turf',
   'Durafill Green infill (standard) — $0.62/SF. Excel TurfInfillSF=0.62 (Master Rates M87). 50lb bag covers 25 SF.'),

  ('Turf - Infill ZeoFill',
   30.00, 'per bag', 'Artificial Turf',
   'ZeoFill pet odor infill (upgrade) — $30.00/bag. 1 bag covers 30 SF. Bags = ROUNDUP(SF/30,0). Excel IF(K11="No"...) branching.');

-- ── Material rates — Dump Fees (Demo) ────────────────────────────────────────
-- These may already exist from prior Demo module migrations. INSERT ... ON CONFLICT skips duplicates.
-- If your dump fees differ, update these values directly in the Master Rates page.

INSERT INTO material_rates (name, unit_cost, unit, category, notes)
VALUES
  ('Demo - Dump Concrete',    36.21, 'per ton', 'Demo', 'Dump fee for concrete — $36.21/ton. Excel DumpConc=A23.'),
  ('Demo - Dump Dirt',        36.21, 'per ton', 'Demo', 'Dump fee for soil/dirt — $36.21/ton. Excel DumpDirt=A22.'),
  ('Demo - Dump Green Waste', 72.19, 'per ton', 'Demo', 'Dump fee for lawn/green waste — $72.19/ton. Excel DumpGreenWaste=A24.')
ON CONFLICT (name) DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT name, rate, unit, notes FROM labor_rates    WHERE category = 'Artificial Turf' ORDER BY name;
-- SELECT name, unit_cost, unit, notes FROM material_rates WHERE category IN ('Artificial Turf','Demo') ORDER BY category, name;
