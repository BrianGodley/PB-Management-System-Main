-- Per-job role assignments. Each column stores the assigned employee's
-- full name (text), matching the existing `consultant` / `project_manager`
-- pattern. Migrate the legacy fields onto job_supervisor (was project_manager)
-- and design_consultant (was consultant) so the Employees tab renders
-- existing data on day one.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS design_consultant                text,
  ADD COLUMN IF NOT EXISTS installation_consultant          text,
  ADD COLUMN IF NOT EXISTS design_review                    text,
  ADD COLUMN IF NOT EXISTS permit_engineering_coordinator   text,
  ADD COLUMN IF NOT EXISTS final_review                     text,
  ADD COLUMN IF NOT EXISTS job_supervisor                   text,
  ADD COLUMN IF NOT EXISTS quality_control_supervisor       text,
  ADD COLUMN IF NOT EXISTS finance_manager                  text,
  ADD COLUMN IF NOT EXISTS success_supervisor               text;

-- One-shot backfill: copy the legacy fields into their new homes when the
-- new columns are still empty. Safe to re-run; the COALESCE keeps anything
-- already typed into the new columns.
UPDATE public.jobs
   SET job_supervisor    = COALESCE(job_supervisor,    project_manager),
       design_consultant = COALESCE(design_consultant, consultant)
 WHERE (job_supervisor IS NULL AND project_manager IS NOT NULL)
    OR (design_consultant IS NULL AND consultant     IS NOT NULL);
