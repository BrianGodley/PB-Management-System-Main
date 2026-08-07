-- ============================================================
-- Remove duplicate dump fee entries from material_rates
-- The "Demo - Dump ..." entries are replaced by "Dump Fee - ..."
-- All modules now reference "Dump Fee - Concrete/Dirt/Green Waste"
-- Run this in your Supabase SQL Editor
-- ============================================================

DELETE FROM material_rates WHERE name = 'Demo - Dump Concrete';
DELETE FROM material_rates WHERE name = 'Demo - Dump Dirt';
DELETE FROM material_rates WHERE name = 'Demo - Dump Green Waste';
