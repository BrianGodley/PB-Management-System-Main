-- Org Chart: "Note/Data" node kind + repeatable notes on any node.
-- Adds a new kind 'note' (a box like an Area but with no position-in-charge and
-- no area name/description — just a Note/Data Description + repeatable note items),
-- and a jsonb `notes` column used by BOTH note nodes and Junior Areas (containers).
-- Each note item: { "text": "...", "format": "plain" | "bullet" | "number" }.
-- Idempotent. Run on BOTH staging and production.

ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS notes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.org_nodes DROP CONSTRAINT IF EXISTS org_nodes_kind_chk;
ALTER TABLE public.org_nodes
  ADD CONSTRAINT org_nodes_kind_chk
    CHECK (kind IN ('custom', 'position', 'container', 'assistant', 'note'))
  NOT VALID;
