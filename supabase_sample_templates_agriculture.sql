-- RESEARCHED + STRUCTURALLY-VARIED sample org charts for AGRICULTURE.
-- Uses a recursive tree builder so each chart can have its own depth/shape:
--   • position → position children  = reports-to hierarchy (connected by lines)
--   • position → area children      = divisions reporting to that position
--   • area → children (pos or area) = items contained inside the area (columns),
--                                      supporting nested sub-areas
-- Sub-sector structures interpreted from 2+ real sources each (see prior notes).
-- "Replace as I go": clears existing samples in each subcategory first. Idempotent.

-- Recursive builder: turns a nested {type,title|name,lead,children[]} tree into
-- the template snapshot { nodes, edges } the app instantiates.
create or replace function pbs_build_tree(
  spec jsonb, parent_ref text, parent_type text, my_tier int, ord int, ref text
) returns jsonb
language plpgsql as $$
declare
  is_area boolean := (spec->>'type') = 'area';
  node jsonb;
  nodes jsonb := '[]'::jsonb;
  edges jsonb := '[]'::jsonb;
  child jsonb;
  sub jsonb;
  i int := 0;
  colors text[] := array['#1E40AF','#047857','#B45309','#7C3AED','#BE123C','#0F766E','#4338CA','#9333EA'];
begin
  if is_area then
    node := jsonb_build_object(
      'ref', ref, 'kind', 'container', 'label', spec->>'name',
      'position_title', spec->>'lead',
      'bg_color', colors[(my_tier % array_length(colors,1)) + 1],
      'box_style', jsonb_build_object('fill','border','borderWidth',2),
      'container_mode', 'independent', 'width', 210, 'height', 90,
      'tier', my_tier, 'tier_order', ord);
  else
    node := jsonb_build_object(
      'ref', ref, 'kind', 'position', 'position_title', spec->>'title',
      'width', 110, 'height', 40, 'tier', my_tier, 'tier_order', ord);
  end if;

  if parent_ref is not null then
    if parent_type = 'area' then
      node := node || jsonb_build_object('parent_ref', parent_ref);
    else
      edges := edges || jsonb_build_object(
        'source_ref', parent_ref, 'target_ref', ref, 'relationship', 'reports_to', 'style', 'solid');
    end if;
  end if;
  nodes := nodes || node;

  if spec ? 'children' then
    for child in select value from jsonb_array_elements(spec->'children') loop
      sub := pbs_build_tree(child, ref, (spec->>'type'), my_tier + 1, i, ref || '_' || i);
      nodes := nodes || (sub->'nodes');
      edges := edges || (sub->'edges');
      i := i + 1;
    end loop;
  end if;

  return jsonb_build_object('nodes', nodes, 'edges', edges);
end $$;

do $$
declare
  category_name text := 'Agriculture';
  charts jsonb := $json$
  [
    {"subcategory":"Crop Production","name":"Crop Production Farm","description":"Owner-run row-crop farm — a lean position hierarchy with a field crew under a farm manager.","tree":
      {"type":"position","title":"Farm Owner / Operator","children":[
        {"type":"position","title":"Farm Manager","children":[
          {"type":"position","title":"Field Supervisor","children":[{"type":"position","title":"Farm Worker"}]},
          {"type":"position","title":"Equipment Operator"}]},
        {"type":"position","title":"Agronomist"},
        {"type":"position","title":"Bookkeeper"}]}},
    {"subcategory":"Livestock & Ranching","name":"Cattle Ranch","description":"Flat ranch hierarchy — owner over a foreman who directs the ranch hands.","tree":
      {"type":"position","title":"Ranch Owner","children":[
        {"type":"position","title":"Ranch Foreman","children":[
          {"type":"position","title":"Ranch Hand"},
          {"type":"position","title":"Cowhand"},
          {"type":"position","title":"Wrangler"}]}]}},
    {"subcategory":"Dairy","name":"Dairy Farm","description":"Function areas with a nested milking-shift structure inside Milking Operations.","tree":
      {"type":"position","title":"Dairy Owner / Manager","children":[
        {"type":"area","name":"Herd Management","lead":"Herd Manager","children":[
          {"type":"position","title":"Herdsman"},{"type":"position","title":"Breeding Technician"}]},
        {"type":"area","name":"Milking Operations","lead":"Parlor Supervisor","children":[
          {"type":"area","name":"Day Shift","children":[
            {"type":"position","title":"Milker"},{"type":"position","title":"Cow Pusher"}]},
          {"type":"area","name":"Night Shift","children":[{"type":"position","title":"Milker"}]}]},
        {"type":"area","name":"Feed & Nutrition","lead":"Feed Manager","children":[{"type":"position","title":"Feeder"}]},
        {"type":"area","name":"Administration","lead":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Aquaculture & Fisheries","name":"Aquaculture Farm","description":"Area-based around the production cycle: hatchery, grow-out, health, harvest.","tree":
      {"type":"position","title":"General Manager","children":[
        {"type":"area","name":"Hatchery","lead":"Hatchery Manager","children":[{"type":"position","title":"Hatchery Technician"}]},
        {"type":"area","name":"Grow-Out Operations","lead":"Production Manager","children":[
          {"type":"position","title":"Farm Technician"},{"type":"position","title":"Feeder"}]},
        {"type":"area","name":"Water Quality & Health","lead":"Fish Health Lead","children":[
          {"type":"position","title":"Biologist"},{"type":"position","title":"Lab Technician"}]},
        {"type":"area","name":"Harvest & Processing","lead":"Harvest Manager","children":[{"type":"position","title":"Processing Worker"}]},
        {"type":"area","name":"Sales & Admin","lead":"Office Manager","children":[{"type":"position","title":"Sales Representative"}]}]}},
    {"subcategory":"Forestry & Logging","name":"Forestry & Logging Operation","description":"Position hierarchy: a forester and a logging foreman directing field crews.","tree":
      {"type":"position","title":"General Manager","children":[
        {"type":"position","title":"Forester","children":[{"type":"position","title":"Forest Technician"}]},
        {"type":"position","title":"Logging Foreman","children":[
          {"type":"position","title":"Faller"},{"type":"position","title":"Equipment Operator"},{"type":"position","title":"Log Truck Driver"}]},
        {"type":"position","title":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Horticulture & Nurseries","name":"Wholesale Nursery","description":"Production-focused areas with a strong growing function and sales/shipping.","tree":
      {"type":"position","title":"General Manager","children":[
        {"type":"area","name":"Production / Growing","lead":"Nursery Manager","children":[
          {"type":"position","title":"Grower"},{"type":"position","title":"Propagation Technician"},{"type":"position","title":"Nursery Worker"}]},
        {"type":"area","name":"Sales & Shipping","lead":"Sales Manager","children":[
          {"type":"position","title":"Account Representative"},{"type":"position","title":"Shipping Lead"},{"type":"position","title":"Driver"}]},
        {"type":"area","name":"Administration","lead":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"AgTech","name":"AgTech Company","description":"Corporate three-tier: CEO over VPs/chiefs, each leading their own team.","tree":
      {"type":"position","title":"Chief Executive Officer","children":[
        {"type":"position","title":"VP of Engineering","children":[
          {"type":"position","title":"Software Engineer"},{"type":"position","title":"Hardware Engineer"},{"type":"position","title":"Data Scientist"}]},
        {"type":"position","title":"VP of Product","children":[
          {"type":"position","title":"Product Manager"},{"type":"position","title":"UX Designer"}]},
        {"type":"position","title":"Chief Agronomist","children":[{"type":"position","title":"Research Scientist"}]},
        {"type":"position","title":"Sales Director","children":[
          {"type":"position","title":"Account Executive"},{"type":"position","title":"Sales Development Rep"}]},
        {"type":"position","title":"Chief Financial Officer","children":[{"type":"position","title":"Controller"}]}]}},
    {"subcategory":"Farm Services & Supply","name":"Farm Supply Co-op","description":"Cooperative governance: Board → General Manager → function areas with staff.","tree":
      {"type":"position","title":"Board of Directors","children":[
        {"type":"position","title":"General Manager","children":[
          {"type":"area","name":"Retail / Supply","lead":"Store Manager","children":[
            {"type":"position","title":"Sales Associate"},{"type":"position","title":"Counter Clerk"}]},
          {"type":"area","name":"Agronomy Services","lead":"Agronomy Manager","children":[
            {"type":"position","title":"Crop Advisor"},{"type":"position","title":"Applicator"}]},
          {"type":"area","name":"Energy / Fuel","lead":"Energy Manager","children":[{"type":"position","title":"Delivery Driver"}]},
          {"type":"area","name":"Finance","lead":"Controller","children":[{"type":"position","title":"Accountant"}]}]}]}}
  ]
  $json$;
  ch jsonb;
  cat_id bigint;
  sub_id bigint;
  built jsonb;
begin
  select id into cat_id from public.org_chart_template_categories where name = category_name limit 1;
  if cat_id is null then
    raise notice 'Category % not found — aborting.', category_name;
    return;
  end if;

  for ch in select value from jsonb_array_elements(charts) loop
    select id into sub_id from public.org_chart_template_subcategories
      where name = ch->>'subcategory' and category_id = cat_id limit 1;

    delete from public.org_chart_templates
      where is_sample = true and category_id = cat_id
      and subcategory_id is not distinct from sub_id;

    built := pbs_build_tree(ch->'tree', null, null, 0, 0, 'r');

    insert into public.org_chart_templates (name, description, category_id, subcategory_id, data, is_sample)
    values (ch->>'name', ch->>'description', cat_id, sub_id, built, true);
  end loop;
end $$;
