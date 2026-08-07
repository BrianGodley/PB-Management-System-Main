-- DIAGNOSTIC ONLY (read-only). No chart name needed.

-- (A) Your charts, with exact names to copy from:
select id, name, is_default from public.org_charts order by created_at;

-- (B) Every node in every chart (no kind filter, so we see exactly what exists):
--     which chart, kind, Level, both text fields, and any in-charge.
--     NOTE: the Supabase editor only shows the LAST query's results — run (B)
--     by itself (highlight it) to see this table; run (A) separately for names.
select
  c.name                as chart,
  n.kind                as kind,
  n.tier + 1            as level,            -- matches the dialog's "Level (row)"
  n.label               as area_description, -- "Area Description" field
  n.heading             as area_name,        -- "Area Name" field
  n.position_id         as in_charge_id,
  p.title               as in_charge_title
from public.org_nodes n
join public.org_charts c on c.id = n.chart_id
left join public.positions p on p.id = n.position_id
order by c.name, n.tier, n.tier_order;
