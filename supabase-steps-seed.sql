-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-steps-seed.sql
-- Seed Steps Module labor rates into labor_rates table (category = 'Steps').
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('Steps - Straight', 1.5, 'LF/hr', 'Steps'),
  ('Steps - Curved',   1.0, 'LF/hr', 'Steps')
ON CONFLICT DO NOTHING;
