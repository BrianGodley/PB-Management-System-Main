-- Recompute org-chart tiers (levels) so they match the visual structure.
--
-- Background: the layout engine places TOP-LEVEL nodes (positions, divisions —
-- those with parent_container_id NULL) by their `tier`, but places ATTACHED
-- nodes (departments, sections — those with a parent_container_id) as columns
-- directly below their parent container, ignoring their own `tier`. Because
-- nothing reads the attached nodes' tier, those values drifted out of sync
-- (e.g. departments ended up on both level 4 and level 5).
--
-- Fix: set every attached node's tier to (parent's tier + 1), cascading down.
-- This is the correct invariant for any chart, so it runs across all charts.
-- Top-level nodes are left exactly as-is, so the visual layout does not change
-- — only the stored level data is corrected. Re-running is safe (idempotent).
--
-- Containment links never cross charts, so each chart is fixed independently.

with recursive tree as (
  -- Roots: top-level nodes keep their existing (correct, layout-driving) tier.
  select id, tier, parent_container_id, 0 as depth
    from public.org_nodes
   where parent_container_id is null
  union all
  -- Attached children inherit parent's tier + 1.
  select c.id, t.tier + 1, c.parent_container_id, t.depth + 1
    from public.org_nodes c
    join tree t on c.parent_container_id = t.id
   where t.depth < 25                       -- guard against any accidental cycle
)
update public.org_nodes n
   set tier = tree.tier
  from tree
 where n.id = tree.id
   and n.parent_container_id is not null     -- only correct attached nodes
   and n.tier is distinct from tree.tier;    -- skip rows already correct

-- ── Verify (optional): run this after to confirm clean levels per chart ──
-- select c.name as chart,
--        case
--          when n.parent_container_id is null and n.kind <> 'assistant' then 'top-level'
--          when n.kind = 'assistant' then 'assistant'
--          else 'attached'
--        end as node_type,
--        n.tier + 1 as level,
--        count(*)   as boxes
-- from public.org_nodes n
-- join public.org_charts c on c.id = n.chart_id
-- group by c.name, node_type, n.tier
-- order by c.name, level;
