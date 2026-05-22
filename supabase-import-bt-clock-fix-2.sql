-- ============================================================
-- BuilderTrend time-clock import — FIX, part 2 of 2
--
-- RUN THIS AFTER:
--   1. supabase-import-bt-clock-fix-1.sql   (stamps bt_job_id on entries)
--   2. re-running supabase-import-v2-jobs.sql  (inserts the missing jobs;
--      idempotent — existing jobs are skipped via ON CONFLICT DO NOTHING)
--
-- Part 2 links every orphaned clock entry to its now-present job, matching
-- on the BuilderTrend jobsite id.
-- ============================================================
BEGIN;

UPDATE time_entries t
SET job_id = j.id
FROM jobs j
WHERE t.job_id IS NULL
  AND t.bt_timecard_item_id IS NOT NULL
  AND t.bt_job_id IS NOT NULL
  AND j.bt_job_id = t.bt_job_id;

COMMIT;

-- Verify — imported clock entries still unlinked. Expect 0.
-- Anything left is a BuilderTrend jobsite absent from v2_jobsites_rollup.csv.
SELECT COUNT(*) AS still_unlinked
FROM time_entries
WHERE bt_timecard_item_id IS NOT NULL AND job_id IS NULL;

-- Once the count above is 0, the staging table is no longer needed:
--   DROP TABLE _bt_clock_stg;
