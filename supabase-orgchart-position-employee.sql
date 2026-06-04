-- supabase-orgchart-position-employee.sql
-- Adds employee_id to org_nodes so a position node can pin a specific
-- employee for display when the underlying position has multiple
-- assigned holders. NULL = auto-resolve (single holder wins; first by
-- name when multiple). Safe to re-run.

ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS employee_id UUID
    REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS org_nodes_employee_idx
  ON public.org_nodes (employee_id) WHERE employee_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
