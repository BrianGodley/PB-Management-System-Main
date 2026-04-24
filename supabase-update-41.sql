-- supabase-update-41.sql
-- Work Orders table — auto-generated when a bid is marked sold

CREATE TABLE IF NOT EXISTS work_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  estimate_module_id  UUID REFERENCES estimate_modules(id) ON DELETE SET NULL,
  project_name        TEXT,                          -- from estimate_projects.project_name
  module_type         TEXT NOT NULL,                 -- e.g. 'Concrete', 'Demo', 'Masonry'
  is_subcontractor    BOOLEAN NOT NULL DEFAULT false, -- true = sub work order for this module
  man_days            NUMERIC DEFAULT 0,
  labor_hours         NUMERIC DEFAULT 0,
  material_cost       NUMERIC DEFAULT 0,
  sub_cost            NUMERIC DEFAULT 0,
  labor_cost          NUMERIC DEFAULT 0,
  labor_burden        NUMERIC DEFAULT 0,
  total_price         NUMERIC DEFAULT 0,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','complete')),
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_orders_job_id_idx ON work_orders(job_id);
