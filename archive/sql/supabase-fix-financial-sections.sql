-- 1. Move Payroll-related rows from auto_alloc → payroll section
--    (affects all weeks so future copies will have it right too)
UPDATE collection_financial
SET section = 'payroll'
WHERE section = 'auto_alloc'
  AND label IN ('Payroll', 'Payroll Taxes', 'Total Payroll Allocations');

-- 2. Remove the duplicate section-title row in payables_alloc
--    (the row whose label is the section header "4 - Payable Allocations" or similar)
DELETE FROM collection_financial
WHERE section = 'payables_alloc'
  AND label ILIKE '%payable%allocation%';
