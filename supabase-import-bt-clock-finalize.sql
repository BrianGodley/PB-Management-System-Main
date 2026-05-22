-- ============================================================
-- BuilderTrend time-clock import — FINALIZE  (run LAST, after all 8 batches)
-- Maps staged rows into time_entries, joining bt_job_id -> jobs.
--   * job rows           -> their PBS job
--   * General Time Clock -> the "Picture Build Internal" job (bt_job_id 0)
--   * a BT job missing from PBS -> imported with no job (reported below)
-- ============================================================
BEGIN;

INSERT INTO time_entries
  (job_id, employee_name, date, time_in, time_out, notes, source,
   bt_timecard_item_id, bt_hours_regular, bt_hours_overtime,
   bt_break_time, bt_approval_status)
SELECT
  j.id,
  COALESCE(NULLIF(s.employee_name, ''), 'Unknown'),
  s.clock_in_at::date,
  s.clock_in_at::time,
  s.clock_out_at::time,
  NULLIF(s.notes, ''),
  'buildertrend',
  s.bt_timecard_item_id,
  s.hours_regular,
  s.hours_overtime,
  s.break_time,
  NULLIF(s.approval_status, '')
FROM _bt_clock_stg s
LEFT JOIN jobs j ON j.bt_job_id = s.bt_job_id
ON CONFLICT (bt_timecard_item_id) DO NOTHING;

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────
-- Total BuilderTrend clock entries now in time_entries:
SELECT COUNT(*) AS bt_clock_entries
FROM time_entries
WHERE bt_timecard_item_id IS NOT NULL;

-- BuilderTrend jobsites in the file with no matching PBS job. These rows were
-- imported with no job attached. Expect zero; anything here is a job that was
-- not part of the earlier jobs import.
SELECT s.bt_job_id, COUNT(*) AS clock_entries
FROM _bt_clock_stg s
LEFT JOIN jobs j ON j.bt_job_id = s.bt_job_id
WHERE j.id IS NULL AND s.bt_job_id <> 0
GROUP BY s.bt_job_id
ORDER BY clock_entries DESC;

-- When the numbers above look right, drop the staging table:
--   DROP TABLE _bt_clock_stg;
