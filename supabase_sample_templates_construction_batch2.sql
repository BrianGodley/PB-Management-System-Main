-- RESEARCHED + STRUCTURALLY-VARIED sample org charts for CONSTRUCTION (batch 2).
-- Run AFTER supabase_construction_subcategories.sql. Reuses pbs_build_tree.
-- 15 trades, each 4–5 levels with a distinct shape.

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
    {"subcategory":"Framing","name":"Framing Contractor","description":"Owner → field superintendent → general foreman → lead framer → framer/laborer (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Field Superintendent","children":[
          {"type":"position","title":"General Foreman","children":[
            {"type":"position","title":"Lead Framer","children":[
              {"type":"position","title":"Framer"},{"type":"position","title":"Laborer"}]}]}]},
        {"type":"position","title":"Estimator"},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Drywall","name":"Drywall Contractor","description":"Owner → operations manager → hanging/finishing areas → leads → workers (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"area","name":"Hanging","lead":"Hanging Foreman","children":[
            {"type":"position","title":"Lead Hanger","children":[{"type":"position","title":"Hanger"}]}]},
          {"type":"area","name":"Finishing","lead":"Finishing Foreman","children":[
            {"type":"position","title":"Taper"},{"type":"position","title":"Finisher"}]}]},
        {"type":"position","title":"Estimator"}]}},
    {"subcategory":"Finish Carpenter","name":"Finish Carpentry Shop","description":"Owner → shop foreman → lead carpenter → finish carpenter → apprentice (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Shop Foreman","children":[
          {"type":"position","title":"Lead Carpenter","children":[
            {"type":"position","title":"Finish Carpenter","children":[
              {"type":"position","title":"Apprentice"}]}]}]},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Flooring","name":"Flooring Contractor","description":"Owner → installation/sales/office areas; install lead → installer (4–5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Installation","lead":"Install Manager","children":[
          {"type":"position","title":"Lead Installer","children":[
            {"type":"position","title":"Floor Installer","children":[{"type":"position","title":"Helper"}]}]}]},
        {"type":"area","name":"Sales / Showroom","lead":"Sales Manager","children":[
          {"type":"position","title":"Sales Associate"},{"type":"position","title":"Measure Technician"}]},
        {"type":"area","name":"Office","lead":"Office Manager","children":[{"type":"position","title":"Scheduler"}]}]}},
    {"subcategory":"Tiling","name":"Tile Contractor","description":"Owner → field manager → tile foreman → tile setter → helper (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Field Manager","children":[
          {"type":"position","title":"Tile Foreman","children":[
            {"type":"position","title":"Tile Setter","children":[{"type":"position","title":"Helper"}]}]}]},
        {"type":"position","title":"Estimator"}]}},
    {"subcategory":"Painter","name":"Painting Contractor","description":"Owner → production area (foreman → crew lead → painter) plus sales/office (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Production","lead":"Production Manager","children":[
          {"type":"position","title":"Painting Foreman","children":[
            {"type":"position","title":"Crew Lead","children":[
              {"type":"position","title":"Painter"},{"type":"position","title":"Prep Technician"}]}]}]},
        {"type":"area","name":"Sales / Estimating","lead":"Sales Manager","children":[
          {"type":"position","title":"Estimator"}]},
        {"type":"area","name":"Office","lead":"Office Manager","children":[{"type":"position","title":"Scheduler"}]}]}},
    {"subcategory":"Insulation","name":"Insulation Contractor","description":"Owner → operations manager → residential/commercial areas → installers (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"area","name":"Residential","lead":"Residential Crew Lead","children":[
            {"type":"position","title":"Installer"}]},
          {"type":"area","name":"Commercial","lead":"Commercial Foreman","children":[
            {"type":"position","title":"Lead Installer","children":[{"type":"position","title":"Installer"}]}]}]},
        {"type":"position","title":"Estimator"}]}},
    {"subcategory":"Lathing and Plaster","name":"Lath & Plaster Contractor","description":"Owner → field superintendent → plastering/lathing foremen → plasterer → tender (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Field Superintendent","children":[
          {"type":"position","title":"Plastering Foreman","children":[
            {"type":"position","title":"Plasterer","children":[{"type":"position","title":"Tender"}]}]},
          {"type":"position","title":"Lathing Foreman","children":[
            {"type":"position","title":"Lather"}]}]},
        {"type":"position","title":"Estimator"}]}},
    {"subcategory":"Windows and Doors","name":"Windows & Doors Contractor","description":"Owner → installation/sales/office areas; install lead → installer → helper (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Installation","lead":"Install Manager","children":[
          {"type":"position","title":"Install Lead","children":[
            {"type":"position","title":"Installer","children":[{"type":"position","title":"Helper"}]}]}]},
        {"type":"area","name":"Sales","lead":"Sales Manager","children":[
          {"type":"position","title":"Sales Consultant"},{"type":"position","title":"Measure Technician"}]},
        {"type":"area","name":"Office","lead":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Kitchen Remodeler","name":"Kitchen Remodeling Company","description":"Owner → production manager → project manager → lead carpenter → carpenter, plus a design area (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Production Manager","children":[
          {"type":"position","title":"Project Manager","children":[
            {"type":"position","title":"Lead Carpenter","children":[
              {"type":"position","title":"Carpenter"}]}]}]},
        {"type":"area","name":"Design","lead":"Design Manager","children":[
          {"type":"position","title":"Kitchen Designer"}]},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"ADU Contractor","name":"ADU Contractor","description":"Owner → project manager → site superintendent → lead carpenter → carpenter/laborer (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Project Manager","children":[
          {"type":"position","title":"Site Superintendent","children":[
            {"type":"position","title":"Lead Carpenter","children":[
              {"type":"position","title":"Carpenter"},{"type":"position","title":"Laborer"}]}]}]},
        {"type":"position","title":"Designer"},
        {"type":"position","title":"Estimator"}]}},
    {"subcategory":"Renovation General Contractor","name":"Renovation General Contractor","description":"Owner → operations manager → project manager → superintendent → trades, plus design/estimating (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Operations Manager","children":[
          {"type":"position","title":"Project Manager","children":[
            {"type":"position","title":"Site Superintendent","children":[
              {"type":"position","title":"Carpenter / Trades"}]}]}]},
        {"type":"position","title":"Estimator"},
        {"type":"position","title":"Design Coordinator"},
        {"type":"position","title":"Office Manager","children":[{"type":"position","title":"Bookkeeper"}]}]}},
    {"subcategory":"Sheet Metal","name":"Sheet Metal Contractor","description":"Owner → shop/field/detailing areas; shop ladder lead fabricator → fabricator → apprentice (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Shop / Fabrication","lead":"Shop Foreman","children":[
          {"type":"position","title":"Lead Fabricator","children":[
            {"type":"position","title":"Sheet Metal Fabricator","children":[{"type":"position","title":"Apprentice"}]}]}]},
        {"type":"area","name":"Field / Install","lead":"Field Foreman","children":[
          {"type":"position","title":"Installer"}]},
        {"type":"area","name":"Detailing","lead":"Detailing Manager","children":[
          {"type":"position","title":"CAD Detailer"}]}]}},
    {"subcategory":"Refrigeration","name":"Commercial Refrigeration Contractor","description":"Owner → service manager → lead tech → technician → apprentice, plus install area (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"position","title":"Service Manager","children":[
          {"type":"position","title":"Lead Refrigeration Tech","children":[
            {"type":"position","title":"Refrigeration Technician","children":[
              {"type":"position","title":"Apprentice"}]}]}]},
        {"type":"area","name":"Installation","lead":"Install Manager","children":[
          {"type":"position","title":"Install Technician"}]},
        {"type":"position","title":"Dispatcher"}]}},
    {"subcategory":"Skylights","name":"Skylight Contractor","description":"Owner → installation/sales areas; install foreman → installer → helper (5 levels).","tree":
      {"type":"position","title":"Owner","children":[
        {"type":"area","name":"Installation","lead":"Install Manager","children":[
          {"type":"position","title":"Install Foreman","children":[
            {"type":"position","title":"Installer","children":[{"type":"position","title":"Helper"}]}]}]},
        {"type":"area","name":"Sales","lead":"Sales Manager","children":[
          {"type":"position","title":"Sales Representative"}]},
        {"type":"position","title":"Office Manager"}]}}
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
