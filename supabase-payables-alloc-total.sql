-- Add "Total Payables Allocations" formula row to payables_alloc section
-- for every week that has payables_alloc rows but doesn't already have a total row
INSERT INTO collection_financial (week_id, section, label, amount, sort_order, is_formula, formula_type)
SELECT DISTINCT
  cf.week_id,
  'payables_alloc',
  'Total Payables Allocations',
  0,
  999,
  true,
  'section_total'
FROM collection_financial cf
WHERE cf.section = 'payables_alloc'
  AND NOT EXISTS (
    SELECT 1 FROM collection_financial cf2
    WHERE cf2.week_id = cf.week_id
      AND cf2.section = 'payables_alloc'
      AND cf2.is_formula = true
  );
