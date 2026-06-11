-- RESEARCHED + STRUCTURALLY-VARIED sample org charts for CONSTRUCTION (batch 4 / final).
-- Run AFTER supabase_construction_subcategories.sql. Reuses pbs_build_tree.
-- 15 subcategories, each 4–5 levels, distinct shapes.

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
  category_name text := 'Construction';
  charts jsonb := $json$
  [
    {"subcategory":"Sanitation","name":"Sanitation / Waste Services","description":"Owner → operations manager → route supervisor → route foreman → driver/collector, plus fleet (5 levels).","tree":
      {"type":"position","title":"Owner / General Manager","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Route Supervisor","children":[
            {"type":"position","title":"Route Foreman","children":[
              {"type":"position","title":"Driver"},{"type":"position","title":"Collector"}]}]}]},
        {"type":"position","title":"Fleet Manager","children":[{"type":"position","title":"Mechanic"}]},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Electric Sign","name":"Electric Sign Company","description":"Owner → fabrication/install-service/design areas; lead fabricator → fabricator → helper (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Fabrication","lead":"Shop Foreman","children":[
          {"type":"position","title":"Lead Fabricator","children":[
            {"type":"position","title":"Sign Fabricator","children":[{"type":"position","title":"Helper"}]}]}]},
        {"type":"area","name":"Installation / Service","lead":"Field Manager","children":[
          {"type":"position","title":"Install Crane Operator"},{"type":"position","title":"Service Technician"}]},
        {"type":"area","name":"Design","lead":"Design Manager","children":[
          {"type":"position","title":"Sign Designer"}]}]}},
    {"subcategory":"Tree and Palm","name":"Tree & Palm Service (Arborist)","description":"Owner → operations manager → crew supervisor → crew leader/climber → ground worker, plus plant health (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Crew Supervisor","children":[
            {"type":"position","title":"Crew Leader / Climber","children":[
              {"type":"position","title":"Ground Worker"}]}]}]},
        {"type":"area","name":"Plant Health","lead":"Arborist Manager","children":[
          {"type":"position","title":"Certified Arborist"}]},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Lighting","name":"Lighting Contractor","description":"Owner → install/design/sales areas; lighting foreman → technician → helper (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Installation","lead":"Install Manager","children":[
          {"type":"position","title":"Lighting Foreman","children":[
            {"type":"position","title":"Lighting Technician","children":[{"type":"position","title":"Helper"}]}]}]},
        {"type":"area","name":"Design","lead":"Design Manager","children":[
          {"type":"position","title":"Lighting Designer"}]},
        {"type":"area","name":"Sales","lead":"Sales Manager","children":[
          {"type":"position","title":"Account Representative"}]}]}},
    {"subcategory":"Audio/Visual","name":"Audio / Visual Integration Firm","description":"Owner → operations manager → install/service areas → lead installer → installer, plus design/sales (5 levels).","tree":
      {"type":"position","title":"Owner / President","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"area","name":"Installation","lead":"Install Manager","children":[
            {"type":"position","title":"Lead Installer","children":[{"type":"position","title":"AV Installer"}]}]},
          {"type":"area","name":"Service","lead":"Service Manager","children":[
            {"type":"position","title":"AV Technician"}]}]},
        {"type":"area","name":"Engineering / Design","lead":"Design Engineer","children":[
          {"type":"position","title":"CAD Technician"}]},
        {"type":"position","title":"Sales Manager"}]}},
    {"subcategory":"Solar","name":"Solar Contractor","description":"Owner → operations/sales/design/service areas; install superintendent → foreman → installer (5 levels).","tree":
      {"type":"position","title":"Owner / President","children":[
        {"type":"area","name":"Operations / Install","lead":"Operations Manager","children":[
          {"type":"position","title":"Install Superintendent","children":[
            {"type":"position","title":"Install Foreman","children":[
              {"type":"position","title":"Solar Installer"}]}]}]},
        {"type":"area","name":"Sales","lead":"Sales Manager","children":[
          {"type":"position","title":"Solar Consultant"}]},
        {"type":"area","name":"Design / Engineering","lead":"Design Manager","children":[
          {"type":"position","title":"System Designer"}]},
        {"type":"area","name":"Service","lead":"Service Manager","children":[
          {"type":"position","title":"Service Technician"}]}]}},
    {"subcategory":"Pool","name":"Pool Contractor","description":"Owner → construction/service/design areas; pool superintendent → foreman → builder (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Construction","lead":"Construction Manager","children":[
          {"type":"position","title":"Pool Superintendent","children":[
            {"type":"position","title":"Build Foreman","children":[
              {"type":"position","title":"Pool Builder / Laborer"}]}]}]},
        {"type":"area","name":"Service / Maintenance","lead":"Service Manager","children":[
          {"type":"position","title":"Service Technician"}]},
        {"type":"area","name":"Design / Sales","lead":"Design Manager","children":[
          {"type":"position","title":"Pool Designer"}]}]}},
    {"subcategory":"Elevator","name":"Elevator Contractor","description":"Owner → operations manager → install/service areas → elevator mechanic → apprentice (5 levels).","tree":
      {"type":"position","title":"Owner / General Manager","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"area","name":"Installation / Modernization","lead":"Construction Superintendent","children":[
            {"type":"position","title":"Elevator Mechanic","children":[{"type":"position","title":"Apprentice"}]}]},
          {"type":"area","name":"Service / Repair","lead":"Service Manager","children":[
            {"type":"position","title":"Service Mechanic"},{"type":"position","title":"Dispatcher"}]}]},
        {"type":"position","title":"Field Superintendent / Safety"}]}},
    {"subcategory":"Fire Protection","name":"Fire Protection Contractor","description":"Owner → operations manager → installation/service areas → foreman → fitter, plus design (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"area","name":"Installation","lead":"Install Superintendent","children":[
            {"type":"position","title":"Sprinkler Foreman","children":[
              {"type":"position","title":"Sprinkler Fitter"}]}]},
          {"type":"area","name":"Inspection / Service","lead":"Service Manager","children":[
            {"type":"position","title":"Inspector / Technician"}]}]},
        {"type":"area","name":"Design","lead":"Design Manager","children":[
          {"type":"position","title":"Fire Protection Designer"}]}]}},
    {"subcategory":"Water Features","name":"Water Features Contractor","description":"Owner → construction/design/service areas; foreman → lead installer → installer (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Construction","lead":"Production Manager","children":[
          {"type":"position","title":"Water Feature Foreman","children":[
            {"type":"position","title":"Lead Installer","children":[{"type":"position","title":"Installer"}]}]}]},
        {"type":"area","name":"Design","lead":"Design Manager","children":[
          {"type":"position","title":"Water Feature Designer"}]},
        {"type":"area","name":"Service","lead":"Service Manager","children":[
          {"type":"position","title":"Service Technician"}]}]}},
    {"subcategory":"Low Voltage","name":"Low Voltage / Structured Cabling Contractor","description":"Owner → operations manager → project manager → lead technician → cable technician (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Project Manager","children":[
            {"type":"position","title":"Lead Technician","children":[
              {"type":"position","title":"Cable Technician"},{"type":"position","title":"Apprentice"}]}]}]},
        {"type":"position","title":"Estimator"}]}},
    {"subcategory":"Fencing","name":"Fencing Contractor","description":"Owner → operations manager → crew foreman → fence installer → laborer, plus estimating/office (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Crew Foreman","children":[
            {"type":"position","title":"Fence Installer","children":[{"type":"position","title":"Laborer"}]}]}]},
        {"type":"position","title":"Estimator"},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Lock and Security","name":"Lock & Security Contractor","description":"Owner → locksmith/access-control areas; lead locksmith → locksmith → apprentice (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Locksmith Services","lead":"Service Manager","children":[
          {"type":"position","title":"Lead Locksmith","children":[
            {"type":"position","title":"Locksmith","children":[{"type":"position","title":"Apprentice"}]}]}]},
        {"type":"area","name":"Access Control / Systems","lead":"Systems Manager","children":[
          {"type":"position","title":"Security Technician"}]},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Traffic Control","name":"Traffic Control Contractor","description":"Owner → operations manager → field supervisor → foreman → flagger/setup, plus planning (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Field Supervisor","children":[
            {"type":"position","title":"Traffic Control Foreman","children":[
              {"type":"position","title":"Flagger"},{"type":"position","title":"Setup Technician"}]}]}]},
        {"type":"area","name":"Planning","lead":"Traffic Planner","children":[
          {"type":"position","title":"Permit Coordinator"}]}]}},
    {"subcategory":"Highway Improvement","name":"Highway Improvement Contractor","description":"President → project manager → superintendent → grading/structures crew areas → operators (5 levels).","tree":
      {"type":"position","title":"President / Owner","children":[
        {"type":"position","title":"Project Manager","children":[
          {"type":"position","title":"Project Superintendent","children":[
            {"type":"area","name":"Grading & Paving","lead":"Grading Foreman","children":[
              {"type":"position","title":"Equipment Operator"},{"type":"position","title":"Laborer"}]},
            {"type":"area","name":"Structures","lead":"Bridge Foreman","children":[
              {"type":"position","title":"Carpenter / Ironworker"}]}]}]},
        {"type":"position","title":"Estimator"},
        {"type":"position","title":"Safety Manager"}]}}
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
    if sub_id is null then
      raise notice 'Subcategory % not found — run the subcategory SQL first; skipping.', ch->>'subcategory';
      continue;
    end if;

    delete from public.org_chart_templates
      where is_sample = true and category_id = cat_id
      and subcategory_id is not distinct from sub_id;

    built := pbs_build_tree(ch->'tree', null, null, 0, 0, 'r');

    insert into public.org_chart_templates (name, description, category_id, subcategory_id, data, is_sample)
    values (ch->>'name', ch->>'description', cat_id, sub_id, built, true);
  end loop;
end $$;
