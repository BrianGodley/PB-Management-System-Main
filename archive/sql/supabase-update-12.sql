-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-12.sql
-- Seeds all Skid Steer and Mini Skid Steer labor rates into labor_rates table.
-- Uses DELETE + INSERT pattern — no unique constraint required.
-- Run this AFTER supabase-update-10.sql (which added rate + unit columns).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Remove any existing rows with these names (safe to re-run) ────────────────
DELETE FROM labor_rates WHERE name IN (
  'Shrub Demo',
  'Stump Grind - 1st',
  'Stump Grind - Additional',
  'Tree Demo - Small',
  'Tree Demo - Medium',
  'Tree Demo - Large',
  'Rebar Demo - Bobcat',
  'Demo - Bobcat (Concrete/Dirt)',
  'Demo - Bobcat (Grass)',
  'Demo - Bobcat (Import Base)',
  'SS Compaction',
  'Demo - Mini Bobcat (Concrete/Dirt)',
  'Demo - Mini Bobcat (Grass)',
  'Demo - Mini Bobcat (Import Base)',
  'Mini SS Compaction',
  'JJ Compaction'
);

-- ── Insert all rates ──────────────────────────────────────────────────────────
INSERT INTO labor_rates (name, rate, rate_per_day, unit, notes) VALUES

  -- Vegetation (shared by Full SS and Mini SS)
  ('Shrub Demo',               0.75, 0, 'hrs/ea',    'hrs/shrub at Full access — scaled by access modifier'),
  ('Stump Grind - 1st',        2.5,  0, 'hrs/ea',    'Hours per first stump — scaled by access modifier'),
  ('Stump Grind - Additional', 0.75, 0, 'hrs/ea',    'Hours per additional stump — scaled by access modifier'),
  ('Tree Demo - Small',        0.1,  0, 'hrs/ft',    'Multiplier: qty × height(ft) × access × rate'),
  ('Tree Demo - Medium',       0.15, 0, 'hrs/ft',    'Multiplier: qty × height(ft) × access × rate'),
  ('Tree Demo - Large',        0.2,  0, 'hrs/ft',    'Multiplier: qty × height(ft) × access × rate'),

  -- Rebar add-on (shared by both modules)
  ('Rebar Demo - Bobcat',      0.05, 0, 'min/sq ft', 'Additional minutes per SF of rebar in concrete slab — converted to hrs in module (÷ 60)'),

  -- Full Skid Steer rates
  ('Demo - Bobcat (Concrete/Dirt)', 2.0,  0, 'tons/hr', 'Full SS — tons/hr one man can demo + haul (conc, dirt, rock, misc flat/vert, footing, grade cut)'),
  ('Demo - Bobcat (Grass)',         2.1,  0, 'tons/hr', 'Full SS — tons/hr for sod/grass removal with bobcat'),
  ('Demo - Bobcat (Import Base)',   10.0, 0, 'tons/hr', 'Full SS — tons/hr spreading rate for import base with bobcat'),
  ('SS Compaction',                 7.0,  0, 'tons/hr', 'Full SS skid steer compaction — no access modifier applied'),

  -- Mini Skid Steer rates
  ('Demo - Mini Bobcat (Concrete/Dirt)', 0.75, 0, 'tons/hr', 'Mini SS — tons/hr one man can demo + haul (conc, dirt, rock, misc flat/vert, footing, grade cut)'),
  ('Demo - Mini Bobcat (Grass)',         0.75, 0, 'tons/hr', 'Mini SS — tons/hr for sod/grass removal with mini bobcat'),
  ('Demo - Mini Bobcat (Import Base)',   5.0,  0, 'tons/hr', 'Mini SS — tons/hr spreading rate for import base with mini bobcat'),
  ('Mini SS Compaction',                 1.23, 0, 'tons/hr', 'Mini SS compaction (4 inch max) — no access modifier applied'),

  -- JJ Compaction (shared — same rate for both modules)
  ('JJ Compaction', 1.75, 0, 'tons/hr', 'Jumping jack compaction — 2 hr per 100 SF @ 7" depth — no access modifier applied');
