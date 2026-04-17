-- ============================================================
-- Seed Sub Haul rates into subcontractor_rates
-- These are per-1.5-ton disposal charges applied when Dump Type = Subcontractor
-- in both the Skid Steer and Mini Skid Steer Demo modules.
--
-- Keys:
--   Sub Haul - Concrete  → concrete, misc flat/vert, footing  ($85/1.5T)
--   Sub Haul - Dirt      → dirt/rock, grade cut               ($95/1.5T)
--   Sub Haul - Grass     → grass/sod, trees (green waste)     ($120/1.5T)
--
-- Editable in Master Rates → Subcontractors (category = Sub Haul)
-- Run this in your Supabase SQL Editor
-- ============================================================

INSERT INTO subcontractor_rates (company_name, trade, rate, unit, category)
VALUES
  ('Sub Haul - Concrete', 'Sub Haul', 85,  '$/1.5T', 'Sub Haul'),
  ('Sub Haul - Dirt',     'Sub Haul', 95,  '$/1.5T', 'Sub Haul'),
  ('Sub Haul - Grass',    'Sub Haul', 120, '$/1.5T', 'Sub Haul')
ON CONFLICT DO NOTHING;
