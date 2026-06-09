-- Create a "<Area Name> Supervisor" position for each SECTION and set it as
-- that section's in-charge. (Same approach as the department directors.)
--
-- Sections are the row-6 areas whose Area Description starts with "Sec"
-- (catches "Sect 1-1", "Sect 21-2", and the "Sec 5-1" typo). Divisions start
-- with "Division" and departments with "Dept", so neither is matched.
--
-- Field mapping (matches the Edit Area dialog):
--   • "Area Description" = org_nodes.label    -> used to find sections ("Sec...")
--   • "Area Name"        = org_nodes.heading  -> copied into the supervisor title
--   • "Position in charge" = org_nodes.position_id  -> set to the new position
--
-- New position title = "<Area Name> Supervisor".

-- ── STEP 1 (optional): preview what will be created — run this select alone ──
-- select n.label as section_box, n.heading as area_name,
--        (btrim(n.heading) || ' Supervisor') as new_position
-- from public.org_nodes n
-- join public.org_charts c on c.id = n.chart_id
-- where c.name = 'Picture Build'
--   and n.kind = 'container'
--   and n.label ilike 'Sec%'
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
       and label ilike 'Sec%'                   -- section boxes only
       and coalesce(btrim(heading), '') <> ''   -- must have an Area Name to copy
       and position_id is null                  -- only fill sections with NO in-charge yet
  loop
    insert into public.positions (title, source_chart_id)
    values (btrim(rec.heading) || ' Supervisor', case when isdef then null else cid end)
    returning id into newid;

    update public.org_nodes set position_id = newid where id = rec.id;
    made := made + 1;
  end loop;

  raise notice 'Created % section supervisor position(s).', made;
end $$;
