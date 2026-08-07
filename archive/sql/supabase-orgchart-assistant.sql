-- supabase-orgchart-assistant.sql
-- Adds the 'assistant' item kind to the org chart. An assistant sits to
-- the left or right of the down-edge between its anchor item and that
-- anchor's juniors, intercepting the line with a short horizontal
-- connector. Implemented as:
--   attached_to_node_id — the anchor item (must be senior side of an
--                         edge for the visual to make sense)
--   attachment_side     — 'left' | 'right'
-- Safe to re-run.

ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS attached_to_node_id UUID
    REFERENCES public.org_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS attachment_side TEXT;  -- 'left' | 'right'

CREATE INDEX IF NOT EXISTS org_nodes_attached_idx
  ON public.org_nodes (attached_to_node_id)
  WHERE attached_to_node_id IS NOT NULL;

-- Widen the kind check constraint to allow 'assistant'.
ALTER TABLE public.org_nodes DROP CONSTRAINT IF EXISTS org_nodes_kind_chk;
ALTER TABLE public.org_nodes
  ADD CONSTRAINT org_nodes_kind_chk
    CHECK (kind IN ('custom', 'position', 'container', 'assistant'))
  NOT VALID;

NOTIFY pgrst, 'reload schema';
