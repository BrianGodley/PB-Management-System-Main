-- supabase-orgchart-container-children.sql
-- Adds parent_container_id so an Org Chart Area (kind='container') can
-- own sub-items rendered as equal-width columns inside it. ON DELETE
-- CASCADE makes implicit containers automatically take their children
-- with them when removed. Safe to re-run.

ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS parent_container_id UUID
    REFERENCES public.org_nodes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS org_nodes_parent_container_idx
  ON public.org_nodes (parent_container_id)
  WHERE parent_container_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
