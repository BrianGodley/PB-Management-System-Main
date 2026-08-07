-- BuilderTrend Jobsites Import — Batch 7 of 7 (1 jobs)
BEGIN;

INSERT INTO jobs (
  bt_job_id, name, client_name, job_address, job_city, job_state, job_zip,
  project_manager, notes, status,
  projected_start, projected_completion, actual_start, actual_completion,
  bt_contract_price, total_price, sold_date, source, bt_imported_at
) VALUES (
  31623504,
  '(Completed Design) Mehta Mann Michele  Steve #2',
  'Steve Mehta 2',
  'j25448 Hardy Place',
  'Stevenson Ranch',
  'CA',
  '91381',
  'Verva Gerse',
  'Project Type: Landscape
Job Group: Design Phase',
  'completed',
  '2023-10-06',
  NULL,
  '2023-10-06',
  NULL,
  750.0,
  750.0,
  '2023-10-06',
  'buildertrend',
  '2026-05-12T23:50:26.033577+00:00'
) ON CONFLICT (bt_job_id) DO UPDATE SET
  name               = EXCLUDED.name,
  client_name        = EXCLUDED.client_name,
  job_address        = EXCLUDED.job_address,
  job_city           = EXCLUDED.job_city,
  job_state          = EXCLUDED.job_state,
  job_zip            = EXCLUDED.job_zip,
  project_manager    = EXCLUDED.project_manager,
  notes              = COALESCE(EXCLUDED.notes, jobs.notes),
  status             = EXCLUDED.status,
  projected_start    = EXCLUDED.projected_start,
  projected_completion = EXCLUDED.projected_completion,
  actual_start       = EXCLUDED.actual_start,
  actual_completion  = EXCLUDED.actual_completion,
  bt_contract_price  = EXCLUDED.bt_contract_price,
  source             = 'buildertrend',
  bt_imported_at     = EXCLUDED.bt_imported_at;

COMMIT;

-- Verify:
SELECT COUNT(*) AS total, COUNT(CASE WHEN source='buildertrend' THEN 1 END) AS from_bt FROM jobs;
COMMIT;

-- Verify:
SELECT COUNT(*) AS total, COUNT(CASE WHEN source='buildertrend' THEN 1 END) AS from_bt FROM jobs;