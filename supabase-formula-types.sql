-- Add formula_type column to collection_financial
ALTER TABLE collection_financial
  ADD COLUMN IF NOT EXISTS formula_type text;

-- Migrate existing is_formula rows to section_total type
UPDATE collection_financial
SET formula_type = 'section_total'
WHERE is_formula = true AND formula_type IS NULL;

-- Mark "Reserves 1%" as a cross-section formula (1% of Cash On Hand total)
UPDATE collection_financial
SET is_formula = true, formula_type = 'pct_cash_on_hand', amount = 0
WHERE label ILIKE '%reserve%';

-- Remove the duplicate auto_alloc section title row
DELETE FROM collection_financial
WHERE section = 'auto_alloc'
  AND label ILIKE '2%auto%alloc%';

-- Add "Total Cash On Hand" formula row to every week that has cash_on_hand rows
-- (skip weeks that already have it)
INSERT INTO collection_financial (week_id, section, label, amount, sort_order, is_formula, formula_type)
SELECT DISTINCT
  cf.week_id,
  'cash_on_hand',
  'Total Cash On Hand',
  0,
  999,
  true,
  'section_total'
FROM collection_financial cf
WHERE cf.section = 'cash_on_hand'
  AND NOT EXISTS (
    SELECT 1 FROM collection_financial cf2
    WHERE cf2.week_id = cf.week_id
      AND cf2.section = 'cash_on_hand'
      AND cf2.label = 'Total Cash On Hand'
  );
