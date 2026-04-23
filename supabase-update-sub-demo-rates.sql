-- ============================================================
-- Seed / Update Sub Demo Rates in subcontractor_rates
-- These appear as editable entries in Master Rates → Subcontractors
-- and are referenced by the Skid Steer Demo module (Demo Type = Subcontractor)
--
-- Pricing basis:
--   Concrete / Dirt / Misc Flat / Grade Cut → $/ton removed
--   Import Base / Grass/Sod                → $/SF (no depth conversion)
--
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Update existing entries (if already seeded with old rates)
UPDATE subcontractor_rates SET rate = 175,  unit = '$/ton' WHERE company_name = 'Sub Demo - Concrete';
UPDATE subcontractor_rates SET rate = 135,  unit = '$/ton' WHERE company_name = 'Sub Demo - Dirt/Rock';
UPDATE subcontractor_rates SET rate = 1.50, unit = '$/SF'  WHERE company_name = 'Sub Demo - Import Base';
UPDATE subcontractor_rates SET rate = 1.75, unit = '$/SF'  WHERE company_name = 'Sub Demo - Grass/Sod';
UPDATE subcontractor_rates SET rate = 175,  unit = '$/ton' WHERE company_name = 'Sub Demo - Misc Flat';
UPDATE subcontractor_rates SET rate = 135,  unit = '$/ton' WHERE company_name = 'Sub Demo - Grade Cut';

-- Insert any that don't exist yet
INSERT INTO subcontractor_rates (company_name, trade, rate, unit, category)
SELECT 'Sub Demo - Concrete',    'Demo Removal', 175,  '$/ton', 'Demo'
WHERE NOT EXISTS (SELECT 1 FROM subcontractor_rates WHERE company_name = 'Sub Demo - Concrete');

INSERT INTO subcontractor_rates (company_name, trade, rate, unit, category)
SELECT 'Sub Demo - Dirt/Rock',   'Demo Removal', 135,  '$/ton', 'Demo'
WHERE NOT EXISTS (SELECT 1 FROM subcontractor_rates WHERE company_name = 'Sub Demo - Dirt/Rock');

INSERT INTO subcontractor_rates (company_name, trade, rate, unit, category)
SELECT 'Sub Demo - Import Base', 'Demo Removal', 1.50, '$/SF',  'Demo'
WHERE NOT EXISTS (SELECT 1 FROM subcontractor_rates WHERE company_name = 'Sub Demo - Import Base');

INSERT INTO subcontractor_rates (company_name, trade, rate, unit, category)
SELECT 'Sub Demo - Grass/Sod',   'Demo Removal', 1.75, '$/SF',  'Demo'
WHERE NOT EXISTS (SELECT 1 FROM subcontractor_rates WHERE company_name = 'Sub Demo - Grass/Sod');

INSERT INTO subcontractor_rates (company_name, trade, rate, unit, category)
SELECT 'Sub Demo - Misc Flat',   'Demo Removal', 175,  '$/ton', 'Demo'
WHERE NOT EXISTS (SELECT 1 FROM subcontractor_rates WHERE company_name = 'Sub Demo - Misc Flat');

INSERT INTO subcontractor_rates (company_name, trade, rate, unit, category)
SELECT 'Sub Demo - Grade Cut',   'Demo Removal', 135,  '$/ton', 'Demo'
WHERE NOT EXISTS (SELECT 1 FROM subcontractor_rates WHERE company_name = 'Sub Demo - Grade Cut');
