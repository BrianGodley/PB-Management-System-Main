-- ============================================================
-- Fix duplicate "Prep Review" stage and renumber sort_order 1..13
-- ============================================================
-- 1) If "Prep Review" exists more than once, keep the one with the
--    LOWEST sort_order (the one already placed in the right spot)
--    and delete the others (e.g. the duplicate at the bottom).
--
-- 2) Renumber every remaining stage's sort_order to 1..N based on
--    the existing order, so the list is contiguous (1, 2, 3, ...).
--
-- Safe to re-run.
-- ============================================================

BEGIN;

-- 1) Drop duplicate "Prep Review" rows, keeping the earliest one
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY sort_order ASC, created_at ASC) AS rn
  FROM job_stages
  WHERE name = 'Prep Review'
)
DELETE FROM job_stages
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Renumber every stage by its current order
WITH renumbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at ASC) AS new_order
  FROM job_stages
)
UPDATE job_stages s
SET sort_order = r.new_order
FROM renumbered r
WHERE s.id = r.id;

-- 3) Verify — should print 13 rows numbered 1..13
SELECT sort_order, name FROM job_stages ORDER BY sort_order;

COMMIT;
