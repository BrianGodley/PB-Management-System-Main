-- Add is_formula column to collection_financial
-- Formula rows are auto-computed totals (sum of sibling rows in same section)
-- They are displayed as read-only and never included in section sum calculations
ALTER TABLE collection_financial
  ADD COLUMN IF NOT EXISTS is_formula boolean DEFAULT false;

-- Mark all "Total..." rows as formula rows across all weeks
UPDATE collection_financial
SET is_formula = true
WHERE label ILIKE 'Total%';

-- Also zero out their stored amounts since display value is always computed live
UPDATE collection_financial
SET amount = 0
WHERE is_formula = true;
