-- RESEARCHED + STRUCTURALLY-VARIED sample org charts for CONSTRUCTION (batch 1).
-- Run AFTER supabase_construction_subcategories.sql (subcategories must exist).
-- Sources interpreted: general-contractor office/field lanes (PM → Superintendent
-- → Foreman); specialty-trade ladders (Operations Mgr → General Foreman → Foreman
-- → Journeyman → Apprentice); landscaping Maintenance/Account-Manager vs Design-
-- Build lanes. Each chart reaches 4–5 levels with a distinct shape.

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
    {"subcategory":"Commercial General Contractor","name":"Commercial General Contractor","description":"Office and field lanes: VP of Construction → Project Director → PM → Superintendent → Foreman, with preconstruction, finance and safety (6 levels).","tree":
      {"type":"position","title":"President / Owner","children":[
        {"type":"position","title":"VP of Construction","children":[
          {"type":"position","title":"Project Director","children":[
            {"type":"position","title":"Project Manager","children":[
              {"type":"position","title":"Superintendent","children":[
                {"type":"position","title":"Foreman"}]},
              {"type":"position","title":"Project Engineer"}]}]},
          {"type":"position","title":"Preconstruction Manager","children":[
            {"type":"position","title":"Chief Estimator","children":[{"type":"position","title":"Estimator"}]}]}]},
        {"type":"position","title":"VP of Finance","children":[
          {"type":"position","title":"Controller","children":[{"type":"position","title":"Accountant"}]}]},
        {"type":"position","title":"Safety Director"}]}},
    {"subcategory":"Residential General Contractor","name":"Residential General Contractor","description":"Owner → production manager → project manager → site superintendent → lead carpenter (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Production Manager","children":[
          {"type":"position","title":"Project Manager","children":[
            {"type":"position","title":"Site Superintendent","children":[
              {"type":"position","title":"Lead Carpenter"}]}]}]},
        {"type":"position","title":"Estimator"},
        {"type":"position","title":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Electrical","name":"Electrical Contractor","description":"Owner → field/service/office areas; field ladder General Foreman → Foreman → Journeyman → Apprentice (5 levels).","tree":
      {"type":"position","title":"Owner / President","children":[
        {"type":"area","name":"Field Operations","lead":"Operations Manager","children":[
          {"type":"position","title":"General Foreman","children":[
            {"type":"position","title":"Foreman","children":[
              {"type":"position","title":"Journeyman Electrician"},
              {"type":"position","title":"Apprentice"}]}]}]},
        {"type":"area","name":"Service","lead":"Service Manager","children":[
          {"type":"position","title":"Service Electrician"}]},
        {"type":"area","name":"Office & Estimating","lead":"Office Manager","children":[
          {"type":"position","title":"Estimator"},{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Plumbing","name":"Plumbing Contractor","description":"Owner → operations manager → construction/service areas → foreman → journeyman (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"area","name":"Construction","lead":"Construction Manager","children":[
            {"type":"position","title":"Plumbing Foreman","children":[
              {"type":"position","title":"Journeyman Plumber"},{"type":"position","title":"Apprentice"}]}]},
          {"type":"area","name":"Service & Repair","lead":"Service Manager","children":[
            {"type":"position","title":"Service Plumber"},{"type":"position","title":"Dispatcher"}]}]},
        {"type":"position","title":"Office Manager","children":[{"type":"position","title":"Estimator"}]}]}},
    {"subcategory":"HVAC","name":"HVAC Contractor","description":"Owner → install/service/sales/office areas; install ladder Lead → Installer → Helper (5 levels).","tree":
      {"type":"position","title":"Owner / President","children":[
        {"type":"area","name":"Installation","lead":"Install Manager","children":[
          {"type":"position","title":"Install Lead","children":[
            {"type":"position","title":"Installer","children":[{"type":"position","title":"Helper"}]}]}]},
        {"type":"area","name":"Service","lead":"Service Manager","children":[
          {"type":"position","title":"Lead Technician","children":[{"type":"position","title":"Service Technician"}]},
          {"type":"position","title":"Dispatcher"}]},
        {"type":"area","name":"Sales","lead":"Sales Manager","children":[
          {"type":"position","title":"Comfort Advisor"}]},
        {"type":"area","name":"Office","lead":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Landscaping","name":"Landscaping Company","description":"Owner → maintenance (account managers → crew leaders) and design/build lanes (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Maintenance","lead":"Maintenance Manager","children":[
          {"type":"position","title":"Account Manager","children":[
            {"type":"position","title":"Crew Leader","children":[
              {"type":"position","title":"Crew Member"}]}]}]},
        {"type":"area","name":"Design / Build","lead":"Production Manager","children":[
          {"type":"position","title":"Landscape Designer"},
          {"type":"position","title":"Install Crew Leader","children":[{"type":"position","title":"Laborer"}]}]},
        {"type":"area","name":"Office","lead":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Concrete","name":"Concrete Contractor","description":"Owner → operations manager → general foreman → foreman → finisher/laborer (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"General Foreman","children":[
            {"type":"position","title":"Concrete Foreman","children":[
              {"type":"position","title":"Finisher"},{"type":"position","title":"Laborer"}]}]}]},
        {"type":"position","title":"Estimator"},
        {"type":"position","title":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Roofer","name":"Roofing Contractor","description":"Owner → production/sales/office areas; production ladder Foreman → Crew Lead → Roofer (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Production","lead":"Production Manager","children":[
          {"type":"position","title":"Roofing Foreman","children":[
            {"type":"position","title":"Crew Lead","children":[
              {"type":"position","title":"Roofer"},{"type":"position","title":"Laborer"}]}]}]},
        {"type":"area","name":"Sales","lead":"Sales Manager","children":[
          {"type":"position","title":"Sales Representative"},{"type":"position","title":"Estimator"}]},
        {"type":"area","name":"Office","lead":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Masonry","name":"Masonry Contractor","description":"Owner → field operations manager → foreman → mason → tender (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Field Operations Manager","children":[
          {"type":"position","title":"Masonry Foreman","children":[
            {"type":"position","title":"Mason","children":[
              {"type":"position","title":"Mason Tender"}]}]}]},
        {"type":"position","title":"Estimator"},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Demolition","name":"Demolition Contractor","description":"Owner → operations manager → field-crews/safety areas → foreman → operator/laborer (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"area","name":"Field Crews","lead":"Site Superintendent","children":[
            {"type":"position","title":"Demolition Foreman","children":[
              {"type":"position","title":"Equipment Operator"},{"type":"position","title":"Laborer"}]}]},
          {"type":"area","name":"Safety & Environmental","lead":"Safety Manager","children":[
            {"type":"position","title":"Abatement Technician"}]}]},
        {"type":"position","title":"Estimator"}]}}
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
