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


-- ─────────────────────────────────────────────────────────────────────────
-- Data API grants (Supabase change effective 2026-10-30 — new tables in
-- public are not exposed via PostgREST / supabase-js by default; this
-- block makes them reachable. RLS policies (above) still control rows.
-- ─────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.work_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
