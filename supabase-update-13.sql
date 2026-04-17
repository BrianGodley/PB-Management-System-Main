-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-13.sql
-- 1. Adds category column to labor_rates table
-- 2. Clears and re-seeds all demo rates with consistent "Demo - [Qualifier]"
--    naming and category='Demo'
-- Run after supabase-update-12.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Add category column ───────────────────────────────────────────────────────
ALTER TABLE labor_rates
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- ── Mark any existing rows as General ────────────────────────────────────────
UPDATE labor_rates SET category = 'General' WHERE category IS NULL;

-- ── Remove all old demo rate names (update-12 names AND any prior names) ─────
DELETE FROM labor_rates WHERE name IN (
  -- update-12 names
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
  'JJ Compaction',
  -- new names (idempotent re-run safety)
  'Demo - Shrub',
  'Demo - Stump 1st',
  'Demo - Stump Additional',
  'Demo - Tree Small',
  'Demo - Tree Medium',
  'Demo - Tree Large',
  'Demo - Rebar',
  'Demo - Bobcat Concrete/Dirt',
  'Demo - Bobcat Grass',
  'Demo - Bobcat Import Base',
  'Demo - SS Compaction',
  'Demo - Mini Bobcat Concrete/Dirt',
  'Demo - Mini Bobcat Grass',
  'Demo - Mini Bobcat Import Base',
  'Demo - Mini SS Compaction',
  'Demo - JJ Compaction'
);

-- ── Insert all demo rates with consistent naming and category='Demo' ──────────
INSERT INTO labor_rates (name, rate, rate_per_day, unit, category, notes) VALUES

  -- Vegetation (shared by Full SS and Mini SS)
  ('Demo - Shrub',            0.75, 0, 'hrs/ea',    'Demo', 'hrs/shrub at Full access — scaled by access modifier'),
  ('Demo - Stump 1st',        2.5,  0, 'hrs/ea',    'Demo', 'Hours per first stump — scaled by access modifier'),
  ('Demo - Stump Additional', 0.75, 0, 'hrs/ea',    'Demo', 'Hours per additional stump — scaled by access modifier'),
  ('Demo - Tree Small',       0.1,  0, 'hrs/ft',    'Demo', 'Multiplier: qty × height(ft) × access × rate'),
  ('Demo - Tree Medium',      0.15, 0, 'hrs/ft',    'Demo', 'Multiplier: qty × height(ft) × access × rate'),
  ('Demo - Tree Large',       0.2,  0, 'hrs/ft',    'Demo', 'Multiplier: qty × height(ft) × access × rate'),

  -- Rebar add-on
  ('Demo - Rebar',            0.05, 0, 'min/sq ft', 'Demo', 'Additional minutes per SF of rebar in concrete slab — converted to hrs in module (÷ 60)'),

  -- Full Skid Steer
  ('Demo - Bobcat Concrete/Dirt', 2.0,  0, 'tons/hr', 'Demo', 'Full SS — tons/hr one man can demo + haul (conc, dirt, rock, misc flat/vert, footing, grade cut)'),
  ('Demo - Bobcat Grass',         2.1,  0, 'tons/hr', 'Demo', 'Full SS — tons/hr for sod/grass removal with bobcat'),
  ('Demo - Bobcat Import Base',   10.0, 0, 'tons/hr', 'Demo', 'Full SS — tons/hr spreading rate for import base with bobcat'),
  ('Demo - SS Compaction',        7.0,  0, 'tons/hr', 'Demo', 'Full SS skid steer compaction — no access modifier applied'),

  -- Mini Skid Steer
  ('Demo - Mini Bobcat Concrete/Dirt', 0.75, 0, 'tons/hr', 'Demo', 'Mini SS — tons/hr one man can demo + haul (conc, dirt, rock, misc flat/vert, footing, grade cut)'),
  ('Demo - Mini Bobcat Grass',         0.75, 0, 'tons/hr', 'Demo', 'Mini SS — tons/hr for sod/grass removal with mini bobcat'),
  ('Demo - Mini Bobcat Import Base',   5.0,  0, 'tons/hr', 'Demo', 'Mini SS — tons/hr spreading rate for import base with mini bobcat'),
  ('Demo - Mini SS Compaction',        1.23, 0, 'tons/hr', 'Demo', 'Mini SS compaction (4 inch max) — no access modifier applied'),

  -- JJ Compaction (shared)
  ('Demo - JJ Compaction', 1.75, 0, 'tons/hr', 'Demo', 'Jumping jack compaction — 2 hr per 100 SF @ 7" depth — no access modifier applied');
