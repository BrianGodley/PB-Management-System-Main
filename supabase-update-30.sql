-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-30.sql
-- Adds Hand Demo labor rates to the labor_rates table.
-- These rates are used by HandDemoModule.jsx and HandDemoSummary.jsx.
--
-- Hand Demo uses non-bobcat (manual) rates:
--   • Concrete/dirt:  0.75 t/hr  (vs 2.0 for full SS)
--   • Import base:    5.0  t/hr  (vs 10.0 for full SS)
--   • Grass:          0.75 t/hr
--   • Rebar:          0.25 min/SF (vs 0.05 for bobcat)
--   • Bucket areas:   0.38 t/hr  (tight-access hand bucket work)
--   • Access modifiers: Poor=0.5, OK=0.667, Full=1.0
--
-- Vegetation, JJ compaction, shrub, stump, and tree rates are shared
-- with Full SS and Mini SS — no new rows needed for those.
--
-- Run after supabase-update-29.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Remove any existing hand demo rates (idempotent) ─────────────────────────
DELETE FROM labor_rates WHERE name IN (
  'Demo - Hand Concrete/Dirt',
  'Demo - Hand Grass',
  'Demo - Hand Import Base',
  'Demo - Hand Bucket',
  'Demo - Hand Rebar'
);

-- ── Insert Hand Demo rates ────────────────────────────────────────────────────
INSERT INTO labor_rates (name, rate, rate_per_day, unit, category, notes) VALUES

  -- Concrete/Dirt (hand) — same formula as SS but at 0.75 t/hr
  ('Demo - Hand Concrete/Dirt',
   0.75, 0, 'tons/hr', 'Demo',
   'Hand demo — tons/hr one man can move + haul concrete, dirt, misc flat/vert, footing, grade cut by hand'),

  -- Grass (hand)
  ('Demo - Hand Grass',
   0.75, 0, 'tons/hr', 'Demo',
   'Hand demo — tons/hr for sod/grass removal by hand'),

  -- Import Base (hand)
  ('Demo - Hand Import Base',
   5.0, 0, 'tons/hr', 'Demo',
   'Hand demo — tons/hr spreading rate for import base by hand'),

  -- Hand Bucket Areas — confined/tight access, very slow work
  ('Demo - Hand Bucket',
   0.38, 0, 'tons/hr', 'Demo',
   'Hand bucket areas — extremely confined access where material must be bucketed out by hand'),

  -- Rebar (hand) — 0.25 min/SF vs 0.05 for bobcat
  ('Demo - Hand Rebar',
   0.25, 0, 'min/sq ft', 'Demo',
   'Additional minutes per SF of rebar when cutting/removing by hand (÷ 60 for hrs) — 5× slower than bobcat');

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT name, rate, unit, notes FROM labor_rates WHERE category = 'Demo' ORDER BY name;
