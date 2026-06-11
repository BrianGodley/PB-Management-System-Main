-- RESEARCHED + STRUCTURALLY-VARIED sample org charts for EDUCATION AND TRAINING.
-- Subcategory names match supabase_org_chart_industry_subcategories.sql exactly.
-- Reuses pbs_build_tree. Each chart 4–5 levels with a distinct shape.

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
  category_name text := 'Education and Training';
  charts jsonb := $json$
  [
    {"subcategory":"K-12 Schools","name":"K-12 School District","description":"Board → superintendent → assistant superintendent → principal → teacher, plus operations (5 levels).","tree":
      {"type":"position","title":"Board of Education","children":[
        {"type":"position","title":"Superintendent","children":[
          {"type":"position","title":"Assistant Superintendent","children":[
            {"type":"position","title":"Principal","children":[
              {"type":"position","title":"Teacher"},{"type":"position","title":"Counselor"}]}]}]},
        {"type":"area","name":"Operations","lead":"Director of Operations","children":[
          {"type":"position","title":"Facilities Manager"}]}]}},
    {"subcategory":"Higher Education","name":"University","description":"President → provost → dean → department chair → professor, plus student affairs and finance (5 levels).","tree":
      {"type":"position","title":"President","children":[
        {"type":"position","title":"Provost / VP Academic Affairs","children":[
          {"type":"position","title":"Dean","children":[
            {"type":"position","title":"Department Chair","children":[
              {"type":"position","title":"Professor"},{"type":"position","title":"Lecturer"}]}]}]},
        {"type":"area","name":"Student Affairs","lead":"VP of Student Affairs","children":[
          {"type":"position","title":"Dean of Students"}]},
        {"type":"area","name":"Administration & Finance","lead":"VP of Finance","children":[
          {"type":"position","title":"Controller"}]}]}},
    {"subcategory":"Early Childhood","name":"Early Childhood Center","description":"Owner/executive director → center director → assistant director → lead teacher → assistant/aide (5 levels).","tree":
      {"type":"position","title":"Owner / Executive Director","children":[
        {"type":"position","title":"Center Director","children":[
          {"type":"position","title":"Assistant Director","children":[
            {"type":"position","title":"Lead Teacher","children":[
              {"type":"position","title":"Assistant Teacher"},{"type":"position","title":"Aide"}]}]}]},
        {"type":"position","title":"Office Manager"}]}},
    {"subcategory":"Vocational & Trade","name":"Vocational / Trade School","description":"Director → dean of instruction → program areas → lead instructor → instructor, plus student services (5 levels).","tree":
      {"type":"position","title":"President / Director","children":[
        {"type":"position","title":"Dean of Instruction","children":[
          {"type":"area","name":"Trades Programs","lead":"Trades Program Director","children":[
            {"type":"position","title":"Lead Instructor","children":[{"type":"position","title":"Instructor"}]}]},
          {"type":"area","name":"Healthcare Programs","lead":"Healthcare Program Director","children":[
            {"type":"position","title":"Instructor"}]}]},
        {"type":"area","name":"Student Services","lead":"Director of Student Services","children":[
          {"type":"position","title":"Career Counselor"}]},
        {"type":"position","title":"Admissions Director"}]}},
    {"subcategory":"Corporate Training","name":"Corporate Training Firm","description":"CEO → director of L&D → training manager → senior trainer → trainer, plus instructional design (5 levels).","tree":
      {"type":"position","title":"CEO / Managing Director","children":[
        {"type":"position","title":"Director of Learning & Development","children":[
          {"type":"position","title":"Training Manager","children":[
            {"type":"position","title":"Senior Trainer","children":[
              {"type":"position","title":"Trainer / Facilitator"}]}]}]},
        {"type":"area","name":"Instructional Design","lead":"Design Lead","children":[
          {"type":"position","title":"Instructional Designer"}]},
        {"type":"position","title":"Account Manager"}]}},
    {"subcategory":"Tutoring & Test Prep","name":"Tutoring & Test Prep Center","description":"Owner → center manager → lead tutor → tutor → assistant tutor, plus curriculum (5 levels).","tree":
      {"type":"position","title":"Owner / Director","children":[
        {"type":"position","title":"Center Manager","children":[
          {"type":"position","title":"Lead Tutor","children":[
            {"type":"position","title":"Tutor","children":[
              {"type":"position","title":"Assistant Tutor"}]}]}]},
        {"type":"area","name":"Curriculum","lead":"Curriculum Director","children":[
          {"type":"position","title":"Content Developer"}]},
        {"type":"position","title":"Enrollment Coordinator"}]}},
    {"subcategory":"EdTech","name":"EdTech Company","description":"CEO → product / engineering / curriculum / go-to-market areas; engineering ladder manager → engineer → junior (5 levels).","tree":
      {"type":"position","title":"CEO","children":[
        {"type":"area","name":"Product","lead":"VP of Product","children":[
          {"type":"position","title":"Product Manager","children":[
            {"type":"position","title":"Product Designer"}]}]},
        {"type":"area","name":"Engineering","lead":"VP of Engineering","children":[
          {"type":"position","title":"Engineering Manager","children":[
            {"type":"position","title":"Software Engineer","children":[{"type":"position","title":"Junior Engineer"}]}]}]},
        {"type":"area","name":"Curriculum / Content","lead":"Head of Curriculum","children":[
          {"type":"position","title":"Curriculum Designer"}]},
        {"type":"area","name":"Go-To-Market","lead":"VP of Sales","children":[
          {"type":"position","title":"Account Executive"}]}]}},
    {"subcategory":"Online Learning","name":"Online Learning Provider","description":"CEO → dean of online programs → program director → lead instructor → instructor, plus learning design and support (5 levels).","tree":
      {"type":"position","title":"Executive Director / CEO","children":[
        {"type":"position","title":"Dean of Online Programs","children":[
          {"type":"position","title":"Program Director","children":[
            {"type":"position","title":"Lead Instructor","children":[
              {"type":"position","title":"Online Instructor"},{"type":"position","title":"Teaching Assistant"}]}]}]},
        {"type":"area","name":"Learning Design","lead":"Director of Learning Design","children":[
          {"type":"position","title":"Instructional Designer"},{"type":"position","title":"Media Producer"}]},
        {"type":"area","name":"Student Support","lead":"Support Manager","children":[
          {"type":"position","title":"Student Success Advisor"}]}]}}
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
      raise notice 'Subcategory % not found — skipping.', ch->>'subcategory';
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
