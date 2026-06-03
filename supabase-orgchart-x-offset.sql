-- supabase-orgchart-x-offset.sql
-- Adds an x_offset column to org_nodes that lets the user nudge a node
-- horizontally inside its tier without swapping with neighbors. The
-- layout engine adds this to the auto-computed x position, so the snap-
-- tier rule still owns vertical placement and base horizontal flow.
-- Safe to re-run.

ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS x_offset INT NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
