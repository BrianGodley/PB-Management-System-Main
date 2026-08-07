-- Backfill gross_profit and gpmd on existing bids
-- by summing module values through the estimate → projects → modules chain
-- Run this in Supabase SQL Editor

WITH module_totals AS (
  SELECT
    e.id AS estimate_id,
    SUM(COALESCE(em.gross_profit, 0))  AS total_gp,
    SUM(COALESCE(em.man_days,     0))  AS total_man_days
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
WHERE b.estimate_id = mt.estimate_id
  AND (b.gross_profit IS NULL OR b.gross_profit = 0);
