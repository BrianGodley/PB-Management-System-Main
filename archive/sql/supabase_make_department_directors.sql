-- Create a "<Area Name> Director" position for each DEPARTMENT and set it as
-- that department's in-charge.
--
-- Why we match on name, not Level: in this chart the stored level (tier) is
-- inconsistent — departments are split across levels 4 and 5 — because the
-- layout places areas by containment, not by tier. So we identify departments
-- the reliable way: their Area Description starts with "Dept" (divisions start
-- with "Division", sections with "Sect").
--
-- Field mapping (matches the Edit Area dialog):
--   • "Area Description" = org_nodes.label    -> used to find departments ("Dept...")
--   • "Area Name"        = org_nodes.heading  -> copied into the director title
--   • "Position in charge" = org_nodes.position_id  -> set to the new position
--
-- New position title = "<Area Name> Director".

-- ── STEP 1 (optional): run THIS select alone first to preview what will be made ──
-- select n.label as dept_box, n.heading as area_name,
--        (btrim(n.heading) || ' Director') as new_position
-- from public.org_nodes n
-- join public.org_charts c on c.id = n.chart_id
-- where c.name = 'Picture Build'
--   and n.kind = 'container'
--   and n.label ilike 'Dept%'
--   and coalesce(btrim(n.heading),'') <> ''
--   and n.position_id is null
-- order by n.label;

-- ── STEP 2: create the positions and assign them ──
do $$
declare
  target_chart text := 'Picture Build';   -- exact chart name
  cid     org_charts.id%type;
  isdef   boolean;
  rec     record;
  newid   positions.id%type;
  made    int := 0;
begin
  select id, is_default into cid, isdef
    from public.org_charts where name = target_chart limit 1;
  if cid is null then
    raise notice 'Chart "%" not found — nothing done.', target_chart;
    return;
  end if;

  for rec in
    select id, heading
      from public.org_nodes
     where chart_id = cid
       and kind = 'container'
       and label ilike 'Dept%'                  -- department boxes only
       and coalesce(btrim(heading), '') <> ''   -- must have an Area Name to copy
       and position_id is null                  -- only fill departments with NO in-charge yet
  loop
    insert into public.positions (title, source_chart_id)
    values (btrim(rec.heading) || ' Director', case when isdef then null else cid end)
    returning id into newid;

    update public.org_nodes set position_id = newid where id = rec.id;
    made := made + 1;
  end loop;

  raise notice 'Created % department director position(s).', made;
end $$;
