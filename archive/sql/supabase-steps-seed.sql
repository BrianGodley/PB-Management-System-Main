-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-steps-seed.sql
-- Seed Steps Module labor rates into labor_rates table (category = 'Steps').
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Paver step labor rates ────────────────────────────────────────────────────
INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('Steps - Straight',          1.5, 'LF/hr', 'Steps'),
  ('Steps - Curved',            1.0, 'LF/hr', 'Steps'),
  ('Steps - Concrete Straight', 1.0, 'LF/hr', 'Steps'),
  ('Steps - Concrete Curved',   0.5, 'LF/hr', 'Steps')
ON CONFLICT DO NOTHING;

-- ── Concrete step material rate ───────────────────────────────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Steps - Concrete', 'per LF', 12.00, 'Steps')
ON CONFLICT DO NOTHING;
