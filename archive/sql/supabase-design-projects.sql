-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-design-projects.sql
-- Phase 1 of the Design / CAD-takeoff feature: just the project list.
--
-- design_projects holds one row per "drawing set" the user is working with.
-- File uploads, page views, scale calibration, and takeoff annotations all
-- come in later phases and will hang off this id via separate tables.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.design_projects (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  client_id   UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  notes       TEXT,
  status      TEXT        DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS design_projects_status_idx     ON public.design_projects (status);
CREATE INDEX IF NOT EXISTS design_projects_client_idx     ON public.design_projects (client_id);
CREATE INDEX IF NOT EXISTS design_projects_created_at_idx ON public.design_projects (created_at DESC);

-- RLS — open to authenticated users for v1 (matches the rest of the app's
-- workspace-wide access pattern). Tighten if/when needed.
ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "design_projects_auth_all" ON public.design_projects;
CREATE POLICY "design_projects_auth_all" ON public.design_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_projects TO authenticated;
