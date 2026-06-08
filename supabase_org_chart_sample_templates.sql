-- ~10 hand-built SAMPLE org-chart templates across common industries.
-- Each spec lists a top role and its areas (each area = a division led by a
-- position, with a few junior roles). The block builds the template `data`
-- snapshot (nodes + edges) the app's instantiate-from-template path expects,
-- matches category/subcategory by NAME, and inserts as is_sample = true.
-- Idempotent: skips a sample whose name already exists. Safe to re-run.
--
-- Run AFTER: supabase_org_chart_templates.sql, _subcategories.sql,
-- _industry_subcategories.sql, and _is_sample.sql.

do $$
declare
  specs jsonb := $json$
  [
    {"category":"Banking","subcategory":"Retail / Consumer Banking","name":"Retail Bank — Branch Network","description":"A consumer/retail bank with branch operations, lending, and service.","top":"President","areas":[
      {"name":"Branch Operations","lead":"Operations Manager","roles":["Branch Manager","Teller Supervisor","Teller"]},
      {"name":"Lending","lead":"Lending Manager","roles":["Loan Officer","Mortgage Specialist"]},
      {"name":"Customer Service","lead":"Service Manager","roles":["Personal Banker","Customer Service Rep"]},
      {"name":"Finance & Compliance","lead":"Chief Financial Officer","roles":["Controller","Compliance Officer"]},
      {"name":"Marketing","lead":"Marketing Manager","roles":["Relationship Manager"]}
    ]},
    {"category":"Construction","subcategory":"Residential","name":"Residential Home Builder","description":"A residential construction company with field, estimating, and PM teams.","top":"President","areas":[
      {"name":"Field Operations","lead":"Construction Manager","roles":["Site Superintendent","Foreman","Crew Lead"]},
      {"name":"Estimating","lead":"Chief Estimator","roles":["Estimator"]},
      {"name":"Project Management","lead":"PM Director","roles":["Project Manager","Project Coordinator"]},
      {"name":"Purchasing","lead":"Purchasing Manager","roles":["Buyer"]},
      {"name":"Sales & Design","lead":"Sales Manager","roles":["Sales Rep","Designer"]},
      {"name":"Administration","lead":"Office Manager","roles":["Accountant","Admin Assistant"]}
    ]},
    {"category":"Health Care","subcategory":"Physician Practices & Clinics","name":"Medical Group / Clinic","description":"A multi-provider physician practice or outpatient clinic.","top":"Medical Director","areas":[
      {"name":"Clinical","lead":"Lead Physician","roles":["Physician","Nurse Practitioner","Physician Assistant"]},
      {"name":"Nursing","lead":"Nurse Manager","roles":["Registered Nurse","Medical Assistant"]},
      {"name":"Front Office","lead":"Office Manager","roles":["Receptionist","Scheduler"]},
      {"name":"Billing & Coding","lead":"Billing Manager","roles":["Medical Coder","Biller"]},
      {"name":"Administration","lead":"Practice Administrator","roles":["HR Manager","Accountant"]}
    ]},
    {"category":"Information Technology","subcategory":"Managed IT Services","name":"Managed Services Provider (MSP)","description":"An IT managed-services provider with service desk, NOC, and security.","top":"President","areas":[
      {"name":"Service Desk","lead":"Support Manager","roles":["Tier 1 Technician","Tier 2 Technician"]},
      {"name":"Field Services","lead":"Field Manager","roles":["Field Technician"]},
      {"name":"Network Operations","lead":"NOC Manager","roles":["Network Engineer","Systems Administrator"]},
      {"name":"Cybersecurity","lead":"Security Manager","roles":["Security Analyst"]},
      {"name":"Sales","lead":"Sales Manager","roles":["Account Executive"]},
      {"name":"Finance & Admin","lead":"Controller","roles":["Accountant"]}
    ]},
    {"category":"Software Development","subcategory":"SaaS","name":"SaaS Company","description":"A software-as-a-service company spanning engineering, product, and go-to-market.","top":"Chief Executive Officer","areas":[
      {"name":"Engineering","lead":"VP of Engineering","roles":["Backend Engineer","Frontend Engineer","QA Engineer"]},
      {"name":"Product","lead":"VP of Product","roles":["Product Manager","UX Designer"]},
      {"name":"Sales","lead":"VP of Sales","roles":["Account Executive","Sales Development Rep"]},
      {"name":"Marketing","lead":"Chief Marketing Officer","roles":["Content Marketer","Growth Manager"]},
      {"name":"Customer Success","lead":"CS Director","roles":["Customer Success Manager","Support Engineer"]},
      {"name":"Finance & Operations","lead":"Chief Financial Officer","roles":["Controller"]}
    ]},
    {"category":"Retail","subcategory":"E-commerce","name":"E-commerce Retailer","description":"An online retailer with merchandising, fulfillment, and digital marketing.","top":"Chief Executive Officer","areas":[
      {"name":"Merchandising","lead":"Merchandising Director","roles":["Buyer","Category Manager"]},
      {"name":"Operations & Fulfillment","lead":"Operations Manager","roles":["Warehouse Lead","Fulfillment Associate"]},
      {"name":"Marketing","lead":"Marketing Director","roles":["Digital Marketer","SEO Specialist"]},
      {"name":"Customer Service","lead":"CS Manager","roles":["Support Rep"]},
      {"name":"Technology","lead":"Chief Technology Officer","roles":["Web Developer"]},
      {"name":"Finance","lead":"Controller","roles":["Accountant"]}
    ]},
    {"category":"Manufacturing","subcategory":"Consumer Goods","name":"Consumer Goods Manufacturer","description":"A manufacturer of consumer products with production, quality, and supply chain.","top":"President","areas":[
      {"name":"Production","lead":"Plant Manager","roles":["Production Supervisor","Line Lead","Machine Operator"]},
      {"name":"Quality","lead":"Quality Manager","roles":["QA Inspector"]},
      {"name":"Supply Chain","lead":"Supply Chain Manager","roles":["Procurement Specialist","Logistics Coordinator"]},
      {"name":"Engineering","lead":"Engineering Manager","roles":["Process Engineer"]},
      {"name":"Sales & Marketing","lead":"Sales Director","roles":["Account Manager"]},
      {"name":"Finance & HR","lead":"Chief Financial Officer","roles":["Accountant","HR Manager"]}
    ]},
    {"category":"Professional and Consulting","subcategory":"Management Consulting","name":"Management Consulting Firm","description":"A consulting firm organized around its practice and business development.","top":"Managing Partner","areas":[
      {"name":"Consulting Practice","lead":"Practice Lead","roles":["Principal","Senior Consultant","Consultant","Analyst"]},
      {"name":"Business Development","lead":"BD Director","roles":["Account Manager"]},
      {"name":"Operations","lead":"Operations Manager","roles":["Project Coordinator"]},
      {"name":"Finance & Admin","lead":"Controller","roles":["Accountant","Administrative Assistant"]}
    ]},
    {"category":"Hospitality","subcategory":"Hotels & Lodging","name":"Hotel","description":"A full-service hotel with front office, housekeeping, and food & beverage.","top":"General Manager","areas":[
      {"name":"Front Office","lead":"Front Office Manager","roles":["Front Desk Agent","Concierge"]},
      {"name":"Housekeeping","lead":"Executive Housekeeper","roles":["Room Attendant","Laundry Attendant"]},
      {"name":"Food & Beverage","lead":"F&B Manager","roles":["Chef","Server","Bartender"]},
      {"name":"Sales & Events","lead":"Sales Manager","roles":["Event Coordinator"]},
      {"name":"Maintenance","lead":"Chief Engineer","roles":["Maintenance Technician"]},
      {"name":"Finance & HR","lead":"Controller","roles":["HR Manager"]}
    ]},
    {"category":"Personal and Consumer Services","subcategory":"Landscaping & Lawn Care","name":"Landscaping Company","description":"A residential/commercial landscaping company with field crews and design/install.","top":"President","areas":[
      {"name":"Field Operations","lead":"Operations Manager","roles":["Crew Lead","Foreman","Laborer"]},
      {"name":"Maintenance","lead":"Maintenance Manager","roles":["Maintenance Crew"]},
      {"name":"Design & Install","lead":"Design Manager","roles":["Landscape Designer","Install Crew"]},
      {"name":"Sales","lead":"Sales Manager","roles":["Sales Rep","Estimator"]},
      {"name":"Administration","lead":"Office Manager","roles":["Accountant","Admin Assistant"]}
    ]}
  ]
  $json$;
  spec jsonb;
  area jsonb;
  role text;
  cat_id bigint;
  sub_id bigint;
  nodes jsonb;
  edges jsonb;
  i int;
  k int;
  dref text;
  colors text[] := array['#1E40AF','#047857','#B45309','#7C3AED','#BE123C','#0F766E','#4338CA','#9333EA'];
begin
  for spec in select * from jsonb_array_elements(specs) loop
    select id into cat_id from public.org_chart_template_categories
      where name = spec->>'category' limit 1;
    if cat_id is null then
      raise notice 'Category not found, skipping template: %', spec->>'name';
      continue;
    end if;
    select id into sub_id from public.org_chart_template_subcategories
      where name = spec->>'subcategory' and category_id = cat_id limit 1;

    if exists (select 1 from public.org_chart_templates where name = spec->>'name' and is_sample = true) then
      continue;
    end if;

    nodes := jsonb_build_array(
      jsonb_build_object('ref','top','kind','position','position_title',spec->>'top','tier',0,'tier_order',0)
    );
    edges := '[]'::jsonb;
    i := 0;
    for area in select * from jsonb_array_elements(spec->'areas') loop
      dref := 'div' || i;
      nodes := nodes || jsonb_build_object(
        'ref', dref, 'kind', 'container', 'label', area->>'name',
        'position_title', area->>'lead',
        'bg_color', colors[(i % array_length(colors,1)) + 1],
        'box_style', jsonb_build_object('fill','border','borderWidth',2),
        'container_mode', 'independent', 'width', 210, 'height', 90,
        'tier', 1, 'tier_order', i
      );
      edges := edges || jsonb_build_object(
        'source_ref','top','target_ref',dref,'relationship','reports_to','style','solid'
      );
      k := 0;
      for role in select jsonb_array_elements_text(area->'roles') loop
        nodes := nodes || jsonb_build_object(
          'ref', dref || '_r' || k, 'kind', 'position', 'position_title', role,
          'parent_ref', dref, 'tier', 2, 'tier_order', k
        );
        k := k + 1;
      end loop;
      i := i + 1;
    end loop;

    insert into public.org_chart_templates (name, description, category_id, subcategory_id, data, is_sample)
    values (
      spec->>'name', spec->>'description', cat_id, sub_id,
      jsonb_build_object('nodes', nodes, 'edges', edges), true
    );
  end loop;
end $$;
