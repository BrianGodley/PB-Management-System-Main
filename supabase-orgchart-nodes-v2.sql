-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-orgchart-nodes-v2.sql
--
-- Extends the existing org_charts/org_nodes/org_edges schema to support:
--   1. Position nodes — title pulled from positions.title, subtitle = the
--      employee currently assigned to that position.
--   2. Container nodes — Department / Division / Section style cards with
--      customizable heading text, size, and background color.
--   3. Tier-based snap layout — every node belongs to a numbered tier
--      (0 = top), with a tier_order for left-right placement. Edges are
--      validated to only go down (tier+1) or sibling-across (same tier),
--      never up. The UI enforces the rule; this just stores the data.
--
-- Also adds employees.position_id so a person can be assigned to a
-- position. Position nodes resolve via:
--   SELECT first_name||' '||last_name FROM employees
--   WHERE position_id = <node.position_id> AND active = TRUE
--
-- Safe to re-run. New columns are nullable + have sensible defaults so
-- pre-existing charts keep rendering as 'custom' nodes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. New columns on org_nodes ──────────────────────────────────────────────

-- node kind drives the renderer:
--   'custom'    → free-form card (the original behavior; default for old rows)
--   'position'  → position-table-backed card; label/subtitle auto-computed
--   'container' → big sized card with heading + color (Department etc.)
ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS kind         TEXT NOT NULL DEFAULT 'custom';

ALTER TABLE public.org_nodes
  ADD CONSTRAINT org_nodes_kind_chk
    CHECK (kind IN ('custom', 'position', 'container'))
  NOT VALID;

-- position binding (only used when kind = 'position')
ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS position_id  BIGINT
    REFERENCES public.positions(id) ON DELETE SET NULL;

-- container styling (only used when kind = 'container')
ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS heading      TEXT;            -- e.g. "Department"
ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS bg_color     TEXT;            -- hex from palette

-- grouping mode (only used when kind = 'container')
--   'implicit'    → any node placed visually inside this container
--                   becomes a member; moving the container moves them.
--   'independent' → pure decoration, owns nothing.
-- NULL on non-containers.
ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS container_mode TEXT;

-- snap-layout placement: tier 0 = top row, tier_order is left-to-right slot
ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS tier         INT;
ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS tier_order   INT;

CREATE INDEX IF NOT EXISTS org_nodes_chart_tier_idx
  ON public.org_nodes (chart_id, tier, tier_order);

CREATE INDEX IF NOT EXISTS org_nodes_position_idx
  ON public.org_nodes (position_id) WHERE position_id IS NOT NULL;


-- ── 2. employees.position_id (links a person to a position) ─────────────────

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS position_id BIGINT
    REFERENCES public.positions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employees_position_idx
  ON public.employees (position_id) WHERE position_id IS NOT NULL;


-- ── 3. Helper view: who's in which position ─────────────────────────────────
-- Reads cleanly from the org-chart loader. Includes the position even when
-- nobody is assigned (LEFT JOIN), so an unfilled position still renders.

CREATE OR REPLACE VIEW public.position_holders AS
  SELECT
    p.id                AS position_id,
    p.title             AS position_title,
    e.id                AS employee_id,
    e.first_name        AS first_name,
    e.last_name         AS last_name,
    CASE WHEN e.id IS NULL THEN '(unassigned)'
         ELSE TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,'')))
    END                 AS display_name
  FROM public.positions p
  LEFT JOIN public.employees e
    ON e.position_id = p.id
   AND COALESCE(e.active, TRUE) = TRUE;

GRANT SELECT ON public.position_holders TO authenticated;
GRANT SELECT ON public.position_holders TO service_role;
