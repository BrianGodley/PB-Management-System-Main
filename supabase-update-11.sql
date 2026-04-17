-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-11.sql
-- Add Mini Skid Steer specific dump fee rates to material_rates (category='Demo')
-- Run once after supabase-update-9.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Dump Fee - Tree/Stump',   'ton', 125.33, 'Demo'),
  ('Dump Fee - Import Base',  'ton',   7.50, 'Demo')
ON CONFLICT DO NOTHING;
