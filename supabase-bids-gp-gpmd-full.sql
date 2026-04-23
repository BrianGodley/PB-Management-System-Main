-- Step 1: Add gross_profit and gpmd columns to bids table
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS gross_profit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gpmd        numeric DEFAULT 0;

-- Step 2: Backfill existing bids from their linked estimate modules
WITH module_totals AS (
  SELECT
    e.id AS estimate_id,
    SUM(COALESCE(em.gross_profit, 0)) AS total_gp,
    SUM(COALESCE(em.man_days,     0)) AS total_man_days
  FROM estimates e
  JOIN estimate_projects ep ON ep.estimate_id = e.id
  JOIN estimate_modules  em ON em.project_id  = ep.id
  GROUP BY e.id
)
UPDATE bids b
SET
  gross_profit = mt.total_gp,
  gpmd         = CASE WHEN mt.total_man_days > 0
                      THEN ROUND(mt.total_gp / mt.total_man_days)
                      ELSE 0
                 END
FROM module_totals mt
WHERE b.estimate_id = mt.estimate_id;
