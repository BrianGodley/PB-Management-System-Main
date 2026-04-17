-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-33-fix.sql
-- Run this INSTEAD OF supabase-update-33.sql (or after it if the earlier parts
-- already ran successfully — this file is fully idempotent).
--
-- Fixes: replaces ON CONFLICT (name) with WHERE NOT EXISTS for the dump fee rows,
-- since material_rates has no unique constraint on name.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM labor_rates    WHERE category = 'Artificial Turf';
DELETE FROM material_rates WHERE category = 'Artificial Turf';

-- ── Labor rates ───────────────────────────────────────────────────────────────

INSERT INTO labor_rates (name, rate, rate_per_day, unit, category, notes) VALUES

  ('Turf - Demo Skid Steer Good',  2.0,  0, 'tons/hr',    'Artificial Turf', 'Full skid steer demo — 2.0 tons/hr. Excel DemoRatesTurf: Bobcat Good=2.'),
  ('Turf - Demo Skid Steer OK',    1.5,  0, 'tons/hr',    'Artificial Turf', 'Skid steer partial access — 1.5 tons/hr. Excel: Bobcat OK=1.5.'),
  ('Turf - Demo Mini Skid Steer',  0.75, 0, 'tons/hr',    'Artificial Turf', 'Mini skid steer demo — 0.75 tons/hr. Excel: Mini Bobcat=0.75.'),
  ('Turf - Demo Wheelbarrow',      0.5,  0, 'tons/hr',    'Artificial Turf', 'Wheelbarrow demo — 0.5 tons/hr. Excel: Wheelbarrow=0.5.'),
  ('Turf - Demo Hand',             0.38, 0, 'tons/hr',    'Artificial Turf', 'Hand demo — 0.38 tons/hr. Excel: Hand=0.38.'),
  ('Turf - Base Install Rate',     0.25, 0, 'hrs/10SF',   'Artificial Turf', 'Gravel base spread — (SF/10)*0.25 hrs. Excel BaseTurfRate=0.25, BaseTurfSfPerHr=10.'),
  ('Turf - Install Layout',        0.5,  0, 'hrs/20SF',   'Artificial Turf', 'Turf roll install — SF/20*0.5 hrs. Excel TurfSFHr=20, TurfPH=0.5.'),
  ('Turf - Cut Staple Seam',       1.0,  0, 'hrs/100LF',  'Artificial Turf', 'Cut, staple and seam — (LF/100)*1.0 hrs. Excel TurfCutSfHr=100, TurfCutRate=1.0.'),
  ('Turf - Weed Fabric Install',   8.0,  0, 'hrs/1000SF', 'Artificial Turf', 'Weed barrier fabric install — (SF/1000)*8 hrs. Excel: =(K10/1000)*8.');

-- ── Material rates — Turf Brands ─────────────────────────────────────────────

INSERT INTO material_rates (name, unit_cost, unit, category, notes) VALUES

  ('Turf - Socal Blen Supreme 80', 2.39, 'per sqft', 'Artificial Turf', 'Socal Blen Supreme - 80oz, 2" pile. Simple Turf. $2.39/SF.'),
  ('Turf - Bel Air SH 92/66',      1.79, 'per sqft', 'Artificial Turf', 'Bel Air SH 92/66, 1-3/4" pile. Simple Turf. $1.79/SF.'),
  ('Turf - Venice SH Light 50',    1.49, 'per sqft', 'Artificial Turf', 'Venice SH Light - 50oz, 1-5/8" pile. Simple Turf. $1.49/SF.'),
  ('Turf - Bel Air SH Light 50',   1.29, 'per sqft', 'Artificial Turf', 'Bel Air SH Light - 50oz, 1-5/8" pile. Simple Turf. $1.29/SF.'),
  ('Turf - Performance Play 63',   1.79, 'per sqft', 'Artificial Turf', 'Performance Play - 63oz, 1-1/4" pile. Simple Turf. $1.79/SF.'),
  ('Turf - Autumn Grass 75',       2.98, 'per sqft', 'Artificial Turf', 'Autumn Grass - 75oz, 1-3/4" pile. Simple Turf. $2.98/SF.'),
  ('Turf - Bel Air Supreme 90',    1.98, 'per sqft', 'Artificial Turf', 'Bel Air Supreme - 90oz, 1-7/8" pile. Simple Turf. $1.98/SF.'),
  ('Turf - Pet Turf Pro 85',       2.29, 'per sqft', 'Artificial Turf', 'Pet Turf Pro - 85oz, 2" pile. Simple Turf. $2.29/SF.'),
  ('Turf - Verdant Supreme 94',    2.39, 'per sqft', 'Artificial Turf', 'Verdant Supreme - 94oz, 2" pile. Simple Turf. $2.39/SF.'),
  ('Turf - Golf Pro SH 47',        1.98, 'per sqft', 'Artificial Turf', 'Golf Pro SH - 47oz, 2" pile. Simple Turf. $1.98/SF.');

-- ── Material rates — Base, Install, Infill ───────────────────────────────────

INSERT INTO material_rates (name, unit_cost, unit, category, notes) VALUES

  ('Turf - Gravel Base',         6.90,  'per ton',  'Artificial Turf', '$6.90/ton. Excel V8=6.9. Tons=(SF/200)*2 for 2" depth.'),
  ('Turf - DG Base',            57.50,  'per ton',  'Artificial Turf', '$57.50/ton. Excel V9=57.5. Tons=(SF*(1/12))/27 for 1" depth.'),
  ('Turf - Weed Barrier Fabric',165.00, 'per roll', 'Artificial Turf', '$165/roll covers 1,800 SF. Excel V10=165. Rolls=ROUNDUP(SF/1800,0).'),
  ('Turf - Install Materials',    0.140, 'per LF',  'Artificial Turf', 'Staples+seam+nails combined — $0.140/LF of edge. Excel S18=TurfInstallMaterials*totalLF.'),
  ('Turf - Infill Durafill',      0.62, 'per sqft', 'Artificial Turf', 'Durafill Green infill (standard) — $0.62/SF. Excel TurfInfillSF=M87.'),
  ('Turf - Infill ZeoFill',      30.00, 'per bag',  'Artificial Turf', 'ZeoFill pet odor infill — $30/bag covers 30 SF. Bags=ROUNDUP(SF/30,0).');

-- ── Dump Fees (Demo category) — safe insert, no conflict needed ───────────────

INSERT INTO material_rates (name, unit_cost, unit, category, notes)
SELECT 'Demo - Dump Concrete', 36.21, 'per ton', 'Demo',
       'Dump fee for concrete — $36.21/ton. Excel DumpConc=A23.'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Demo - Dump Concrete');

INSERT INTO material_rates (name, unit_cost, unit, category, notes)
SELECT 'Demo - Dump Dirt', 36.21, 'per ton', 'Demo',
       'Dump fee for soil/dirt — $36.21/ton. Excel DumpDirt=A22.'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Demo - Dump Dirt');

INSERT INTO material_rates (name, unit_cost, unit, category, notes)
SELECT 'Demo - Dump Green Waste', 72.19, 'per ton', 'Demo',
       'Dump fee for lawn/green waste — $72.19/ton. Excel DumpGreenWaste=A24.'
WHERE NOT EXISTS (SELECT 1 FROM material_rates WHERE name = 'Demo - Dump Green Waste');

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT name, rate, unit FROM labor_rates WHERE category = 'Artificial Turf' ORDER BY name;
-- SELECT name, unit_cost, unit FROM material_rates WHERE category IN ('Artificial Turf','Demo') ORDER BY category, name;
