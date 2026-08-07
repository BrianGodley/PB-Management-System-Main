-- ============================================================
-- Update Sub Demo rates to CY-based pricing
-- Concrete & dirt items are now billed per cubic yard removed
-- Grass and Import Base remain per SF
-- Run this in your Supabase SQL Editor
-- ============================================================

UPDATE subcontractor_rates SET rate = 175, unit = '$/CY' WHERE company_name = 'Sub Demo - Concrete';
UPDATE subcontractor_rates SET rate = 135, unit = '$/CY' WHERE company_name = 'Sub Demo - Dirt/Rock';
UPDATE subcontractor_rates SET rate = 175, unit = '$/CY' WHERE company_name = 'Sub Demo - Misc Flat';
UPDATE subcontractor_rates SET rate = 135, unit = '$/CY' WHERE company_name = 'Sub Demo - Grade Cut';

-- These remain per SF — no change needed, included here for reference
-- UPDATE subcontractor_rates SET rate = 1.50, unit = '$/SF' WHERE company_name = 'Sub Demo - Import Base';
-- UPDATE subcontractor_rates SET rate = 1.75, unit = '$/SF' WHERE company_name = 'Sub Demo - Grass/Sod';
