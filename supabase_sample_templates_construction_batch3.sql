-- RESEARCHED + STRUCTURALLY-VARIED sample org charts for CONSTRUCTION (batch 3).
-- Run AFTER supabase_construction_subcategories.sql. Reuses pbs_build_tree.
-- 15 subcategories, each 4–5 levels (Industrial GC 6), distinct shapes.

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
    {"subcategory":"Asphalt Paving","name":"Asphalt Paving Contractor","description":"Owner → operations manager → paving superintendent → foreman → operators/laborer (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Paving Superintendent","children":[
            {"type":"position","title":"Paving Foreman","children":[
              {"type":"position","title":"Paver Operator"},{"type":"position","title":"Roller Operator"},{"type":"position","title":"Laborer"}]}]}]},
        {"type":"position","title":"Estimator"}]}},
    {"subcategory":"Paving Stone","name":"Paving Stone / Hardscape Contractor","description":"Owner → installation area (foreman → lead → installer) plus a design/sales area (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Installation","lead":"Production Manager","children":[
          {"type":"position","title":"Hardscape Foreman","children":[
            {"type":"position","title":"Lead Installer","children":[{"type":"position","title":"Installer"}]}]}]},
        {"type":"area","name":"Design / Sales","lead":"Design Manager","children":[
          {"type":"position","title":"Hardscape Designer"}]},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Earthwork","name":"Earthwork / Excavation Contractor","description":"Owner → operations manager → grading superintendent → foreman → operators, plus equipment shop (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Grading Superintendent","children":[
            {"type":"position","title":"Excavation Foreman","children":[
              {"type":"position","title":"Heavy Equipment Operator"},{"type":"position","title":"Laborer"}]}]}]},
        {"type":"position","title":"Estimator"},
        {"type":"position","title":"Equipment Manager","children":[{"type":"position","title":"Mechanic"}]}]}},
    {"subcategory":"Surveyor","name":"Land Surveying Firm","description":"Principal → survey manager → project surveyor → party chief → technician, plus CAD area (5 levels).","tree":
      {"type":"position","title":"Principal / Owner","children":[
        {"type":"position","title":"Survey Manager","children":[
          {"type":"position","title":"Project Surveyor","children":[
            {"type":"position","title":"Party Chief","children":[
              {"type":"position","title":"Survey Technician"}]}]}]},
        {"type":"area","name":"Office / CAD","lead":"CAD Manager","children":[
          {"type":"position","title":"CAD Technician"}]}]}},
    {"subcategory":"Inspections","name":"Building Inspection Firm","description":"Owner → chief inspector → building/specialty areas → senior inspector → inspector (5 levels).","tree":
      {"type":"position","title":"Owner / Principal","children":[
        {"type":"position","title":"Chief Inspector","children":[
          {"type":"area","name":"Building","lead":"Building Inspection Lead","children":[
            {"type":"position","title":"Senior Inspector","children":[{"type":"position","title":"Building Inspector"}]}]},
          {"type":"area","name":"Specialty","lead":"Specialty Lead","children":[
            {"type":"position","title":"Electrical Inspector"},{"type":"position","title":"Plumbing Inspector"}]}]},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Architect","name":"Architecture Firm","description":"Principal → design director → project architect → designer → drafter, plus operations (5 levels).","tree":
      {"type":"position","title":"Principal Architect","children":[
        {"type":"position","title":"Design Director","children":[
          {"type":"position","title":"Project Architect","children":[
            {"type":"position","title":"Architectural Designer","children":[
              {"type":"position","title":"Drafter"}]}]}]},
        {"type":"area","name":"Operations","lead":"Office Manager","children":[
          {"type":"position","title":"Administrator"}]}]}},
    {"subcategory":"Engineering","name":"Engineering Firm","description":"Principal → engineering manager → civil/structural discipline areas → project engineer → designer (5 levels).","tree":
      {"type":"position","title":"Principal Engineer","children":[
        {"type":"position","title":"Engineering Manager","children":[
          {"type":"area","name":"Civil","lead":"Civil Lead","children":[
            {"type":"position","title":"Project Engineer","children":[{"type":"position","title":"Designer"}]}]},
          {"type":"area","name":"Structural","lead":"Structural Lead","children":[
            {"type":"position","title":"Structural Engineer"}]}]},
        {"type":"position","title":"QA/QC Manager"}]}},
    {"subcategory":"Industrial General Contractor","name":"Industrial General Contractor","description":"President → VP Operations → project director → PM → superintendent → foreman, plus engineering/safety/finance (6 levels).","tree":
      {"type":"position","title":"President","children":[
        {"type":"position","title":"VP of Operations","children":[
          {"type":"position","title":"Project Director","children":[
            {"type":"position","title":"Project Manager","children":[
              {"type":"position","title":"Construction Superintendent","children":[
                {"type":"position","title":"Foreman"}]}]}]}]},
        {"type":"area","name":"Engineering","lead":"Engineering Manager","children":[
          {"type":"position","title":"Process Engineer"}]},
        {"type":"position","title":"Safety Director"},
        {"type":"position","title":"Controller"}]}},
    {"subcategory":"Structural Steel","name":"Structural Steel Contractor","description":"Owner → fabrication/erection/detailing areas; shop foreman → fabricator → helper (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Fabrication Shop","lead":"Shop Manager","children":[
          {"type":"position","title":"Shop Foreman","children":[
            {"type":"position","title":"Fabricator","children":[{"type":"position","title":"Helper"}]}]}]},
        {"type":"area","name":"Erection","lead":"Erection Superintendent","children":[
          {"type":"position","title":"Ironworker Foreman","children":[{"type":"position","title":"Ironworker"}]}]},
        {"type":"area","name":"Detailing","lead":"Detailing Manager","children":[
          {"type":"position","title":"Steel Detailer"}]}]}},
    {"subcategory":"Reinforcing Steel","name":"Reinforcing Steel (Rebar) Contractor","description":"Owner → operations manager → rebar superintendent → foreman → placer, plus fabrication (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Rebar Superintendent","children":[
            {"type":"position","title":"Rebar Foreman","children":[
              {"type":"position","title":"Rodbuster / Placer"}]}]}]},
        {"type":"area","name":"Fabrication","lead":"Fab Manager","children":[
          {"type":"position","title":"Shear / Bend Operator"}]},
        {"type":"position","title":"Estimator"}]}},
    {"subcategory":"Welding","name":"Welding Contractor","description":"Owner → welding supervisor → lead welder → welder → helper, plus QA/CWI (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Welding Supervisor","children":[
          {"type":"position","title":"Lead Welder","children":[
            {"type":"position","title":"Welder","children":[{"type":"position","title":"Welder Helper"}]}]}]},
        {"type":"area","name":"Quality","lead":"QA Manager","children":[
          {"type":"position","title":"Weld Inspector (CWI)"}]}]}},
    {"subcategory":"Ornamental Metal","name":"Ornamental Metal Contractor","description":"Owner → shop/field/design areas; lead fabricator → fabricator → finisher (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Shop / Fabrication","lead":"Shop Foreman","children":[
          {"type":"position","title":"Lead Fabricator","children":[
            {"type":"position","title":"Metal Fabricator","children":[{"type":"position","title":"Finisher"}]}]}]},
        {"type":"area","name":"Field Install","lead":"Install Foreman","children":[
          {"type":"position","title":"Installer"}]},
        {"type":"area","name":"Design","lead":"Design Manager","children":[
          {"type":"position","title":"Designer / Detailer"}]}]}},
    {"subcategory":"Shotcrete","name":"Shotcrete Contractor","description":"Owner → operations manager → shotcrete superintendent → foreman → nozzleman/pump/laborer (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Shotcrete Superintendent","children":[
            {"type":"position","title":"Nozzleman Foreman","children":[
              {"type":"position","title":"Nozzleman"},{"type":"position","title":"Pump Operator"},{"type":"position","title":"Laborer"}]}]}]},
        {"type":"position","title":"Estimator"}]}},
    {"subcategory":"Drilling","name":"Foundation Drilling Contractor","description":"Owner → operations manager → drilling superintendent → rig foreman → driller, plus equipment (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Drilling Superintendent","children":[
            {"type":"position","title":"Drill Rig Foreman","children":[
              {"type":"position","title":"Driller"},{"type":"position","title":"Driller Helper"}]}]}]},
        {"type":"position","title":"Equipment Manager"}]}},
    {"subcategory":"Pipeline","name":"Pipeline Contractor","description":"Owner → project manager → pipeline superintendent → mainline/welding crew areas → operators (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Project Manager","children":[
          {"type":"position","title":"Pipeline Superintendent","children":[
            {"type":"area","name":"Mainline Crew","lead":"Mainline Foreman","children":[
              {"type":"position","title":"Equipment Operator"},{"type":"position","title":"Pipelayer"}]},
            {"type":"area","name":"Welding Crew","lead":"Welding Foreman","children":[
              {"type":"position","title":"Welder"}]}]}]},
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
