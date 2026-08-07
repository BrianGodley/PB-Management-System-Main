-- RESEARCHED + STRUCTURALLY-VARIED sample org charts for BANKING.
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
  category_name text := 'Banking';
  charts jsonb := $json$
  [
    {"subcategory":"Retail / Consumer Banking","name":"Retail / Consumer Bank","description":"Branch network: CEO → head of retail → regional manager → branch manager → teller/personal banker, plus lending and operations (5 levels).","tree":
      {"type":"position","title":"President / CEO","children":[
        {"type":"position","title":"Head of Retail Banking","children":[
          {"type":"position","title":"Regional Manager","children":[
            {"type":"position","title":"Branch Manager","children":[
              {"type":"position","title":"Teller"},{"type":"position","title":"Personal Banker"}]}]}]},
        {"type":"area","name":"Lending","lead":"Lending Manager","children":[
          {"type":"position","title":"Loan Officer"}]},
        {"type":"area","name":"Operations","lead":"Operations Manager","children":[
          {"type":"position","title":"Operations Specialist"}]}]}},
    {"subcategory":"Commercial Banking","name":"Commercial Bank","description":"Relationship-manager teams: CEO → head of commercial → market manager → RM → analyst, plus credit and treasury (5 levels).","tree":
      {"type":"position","title":"President / CEO","children":[
        {"type":"position","title":"Head of Commercial Banking","children":[
          {"type":"position","title":"Market Manager","children":[
            {"type":"position","title":"Relationship Manager","children":[
              {"type":"position","title":"Credit Analyst"}]}]}]},
        {"type":"area","name":"Credit / Underwriting","lead":"Chief Credit Officer","children":[
          {"type":"position","title":"Underwriter"}]},
        {"type":"area","name":"Treasury Management","lead":"Treasury Manager","children":[
          {"type":"position","title":"Treasury Sales Officer"}]}]}},
    {"subcategory":"Investment Banking","name":"Investment Bank","description":"Classic ladder inside divisions: Head MD → M&A / Capital Markets areas → VP → Associate → Analyst (5 levels).","tree":
      {"type":"position","title":"Managing Director (Head of IB)","children":[
        {"type":"area","name":"Mergers & Acquisitions","lead":"M&A Managing Director","children":[
          {"type":"position","title":"Vice President","children":[
            {"type":"position","title":"Associate","children":[
              {"type":"position","title":"Analyst"}]}]}]},
        {"type":"area","name":"Capital Markets","lead":"Capital Markets MD","children":[
          {"type":"position","title":"VP, Capital Markets","children":[{"type":"position","title":"Associate"}]}]}]}},
    {"subcategory":"Credit Unions","name":"Credit Union","description":"Board → CEO → VPs of lending / member services / operations → managers → staff (5 levels).","tree":
      {"type":"position","title":"Board of Directors","children":[
        {"type":"position","title":"CEO / President","children":[
          {"type":"area","name":"Lending","lead":"VP of Lending","children":[
            {"type":"position","title":"Loan Manager","children":[{"type":"position","title":"Loan Officer"}]}]},
          {"type":"area","name":"Member Services","lead":"VP of Member Services","children":[
            {"type":"position","title":"Branch Manager","children":[{"type":"position","title":"Member Service Rep"}]}]},
          {"type":"area","name":"Operations","lead":"VP of Operations","children":[
            {"type":"position","title":"Operations Specialist"}]}]}]}},
    {"subcategory":"Mortgage Lending","name":"Mortgage Lender","description":"Production and operations lanes: President → branch manager → loan officer → assistant; processing/underwriting/closing (5 levels).","tree":
      {"type":"position","title":"President","children":[
        {"type":"area","name":"Production","lead":"VP of Production","children":[
          {"type":"position","title":"Branch Manager","children":[
            {"type":"position","title":"Loan Officer","children":[{"type":"position","title":"Loan Officer Assistant"}]}]}]},
        {"type":"area","name":"Operations","lead":"VP of Operations","children":[
          {"type":"position","title":"Processing Manager","children":[{"type":"position","title":"Loan Processor"}]},
          {"type":"position","title":"Underwriting Manager","children":[{"type":"position","title":"Underwriter"}]},
          {"type":"position","title":"Closing Manager","children":[{"type":"position","title":"Closer"}]}]}]}},
    {"subcategory":"Private Banking & Wealth","name":"Private Banking & Wealth","description":"Head of private banking → market manager → private banker → associate → client service, plus investments and trust (5 levels).","tree":
      {"type":"position","title":"Head of Private Banking","children":[
        {"type":"position","title":"Market Manager","children":[
          {"type":"position","title":"Private Banker / Relationship Manager","children":[
            {"type":"position","title":"Banking Associate","children":[
              {"type":"position","title":"Client Service Associate"}]}]}]},
        {"type":"area","name":"Investments / Advisory","lead":"Chief Investment Officer","children":[
          {"type":"position","title":"Portfolio Manager"},{"type":"position","title":"Financial Advisor"}]},
        {"type":"area","name":"Trust & Estate","lead":"Trust Manager","children":[
          {"type":"position","title":"Trust Officer"}]}]}},
    {"subcategory":"Digital / Online Banking","name":"Digital / Online Bank","description":"Functional product org: GM → product / engineering / operations / risk areas; product manager → owner → designer (5 levels).","tree":
      {"type":"position","title":"CEO / GM, Digital Bank","children":[
        {"type":"area","name":"Product","lead":"Head of Product","children":[
          {"type":"position","title":"Product Manager","children":[
            {"type":"position","title":"Product Owner","children":[{"type":"position","title":"UX Designer"}]}]}]},
        {"type":"area","name":"Engineering","lead":"Head of Engineering","children":[
          {"type":"position","title":"Engineering Manager","children":[{"type":"position","title":"Software Engineer"}]}]},
        {"type":"area","name":"Operations & Support","lead":"Head of Operations","children":[
          {"type":"position","title":"Support Lead","children":[{"type":"position","title":"Support Specialist"}]}]},
        {"type":"area","name":"Risk & Compliance","lead":"Chief Risk Officer","children":[
          {"type":"position","title":"Compliance Analyst"}]}]}},
    {"subcategory":"Payments & Cards","name":"Payments & Cards","description":"GM → product / operations / risk-fraud / merchant areas; operations ladder processing manager → team lead → specialist (5 levels).","tree":
      {"type":"position","title":"President / GM","children":[
        {"type":"area","name":"Product & Network","lead":"Head of Product","children":[
          {"type":"position","title":"Product Manager","children":[{"type":"position","title":"Product Analyst"}]}]},
        {"type":"area","name":"Operations","lead":"Head of Card Operations","children":[
          {"type":"position","title":"Processing Manager","children":[
            {"type":"position","title":"Team Lead","children":[
              {"type":"position","title":"Operations Specialist"}]}]}]},
        {"type":"area","name":"Risk & Fraud","lead":"Chief Risk Officer","children":[
          {"type":"position","title":"Fraud Manager","children":[{"type":"position","title":"Fraud Analyst"}]}]},
        {"type":"area","name":"Merchant Services","lead":"Head of Merchant Services","children":[
          {"type":"position","title":"Account Manager"}]}]}}
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
