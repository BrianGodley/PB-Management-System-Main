-- ============================================================
-- BuilderTrend time-clock import — FIX, part 1 of 2
--
-- The finalize report flagged BuilderTrend jobsites missing from `jobs`
-- (e.g. 38189517 "(0 Yard & Equipment)" — 506 entries). These are jobs
-- created in BuilderTrend after the last jobs import was run, so the clock
-- file references them but `jobs` does not have them yet.
--
-- Part 1 stamps the BuilderTrend jobsite id onto every imported clock entry
-- so the orphaned entries can be linked once the missing jobs exist.
-- Requires the _bt_clock_stg staging table (still present from the import).
--
-- RUN ORDER:  this file  ->  re-run supabase-import-v2-jobs.sql  ->  fix-2
-- ============================================================
BEGIN;

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS bt_job_id bigint;

UPDATE time_entries t
SET bt_job_id = s.bt_job_id
FROM _bt_clock_stg s
WHERE t.bt_timecard_item_id = s.bt_timecard_item_id;

COMMIT;

-- Sanity check — imported entries still with no job. Matches the finalize
-- report total; they get linked in fix-2 once the missing jobs are imported.
SELECT COUNT(*) AS unlinked_entries
FROM time_entries
WHERE bt_timecard_item_id IS NOT NULL AND job_id IS NULL;
