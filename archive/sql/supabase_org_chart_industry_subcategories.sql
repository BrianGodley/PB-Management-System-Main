-- Subcategories (sub-sectors) for each industry category used by the org-chart
-- template library. Matches categories by NAME, so it works against the
-- categories you already created in Org Chart > Settings. Idempotent: it skips
-- any subcategory that already exists under that category, so it's safe to
-- re-run. Edit the lists freely before running.

do $$
declare
  data jsonb := $json$
  {
    "Agriculture": ["Crop Production","Livestock & Ranching","Dairy","Aquaculture & Fisheries","Forestry & Logging","Horticulture & Nurseries","AgTech","Farm Services & Supply"],
    "Banking": ["Retail / Consumer Banking","Commercial Banking","Investment Banking","Credit Unions","Mortgage Lending","Private Banking & Wealth","Digital / Online Banking","Payments & Cards"],
    "Construction": ["Residential","Commercial","Industrial","Civil & Infrastructure","Heavy & Highway","Specialty Trades","Renovation & Remodeling","Design-Build"],
    "Education and Training": ["K-12 Schools","Higher Education","Early Childhood","Vocational & Trade","Corporate Training","Tutoring & Test Prep","EdTech","Online Learning"],
    "Energy": ["Oil & Gas - Upstream","Oil & Gas - Midstream","Oil & Gas - Downstream","Renewable Energy","Power Generation","Nuclear","Energy Storage","Energy Trading & Services"],
    "Entertainment": ["Film & Television","Music","Gaming & Esports","Live Events & Theater","Sports","Streaming","Talent & Production","Amusement & Recreation"],
    "Food Services": ["Full-Service Restaurants","Quick Service / Fast Food","Catering","Cafes & Coffee","Bars & Nightlife","Bakeries","Institutional / Contract Food","Delivery & Ghost Kitchens"],
    "Government": ["Federal","State / Provincial","Local / Municipal","Public Safety","Defense & Military","Public Works","Regulatory Agencies","Courts & Judiciary"],
    "Health Care": ["Hospitals & Health Systems","Physician Practices & Clinics","Dental","Mental & Behavioral Health","Long-Term & Senior Care","Home Health","Pharmacies","Diagnostics & Labs","Medical Devices","Pharmaceuticals"],
    "Hospitality": ["Hotels & Lodging","Resorts","Travel & Tourism","Event Venues","Vacation Rentals","Cruise Lines","Spas & Wellness"],
    "Information Technology": ["Managed IT Services","Cloud & Infrastructure","Cybersecurity","Networking","Data Centers","Hardware","IT Consulting","Support & Help Desk"],
    "Insurance": ["Life","Health","Property & Casualty","Auto","Commercial / Business","Reinsurance","Brokerage & Agencies","Claims & Underwriting"],
    "Investment and Finance": ["Asset Management","Private Equity","Venture Capital","Hedge Funds","Brokerage & Trading","Financial Planning & Advisory","Accounting & Audit","FinTech"],
    "Legal": ["Corporate Law","Litigation","Family Law","Criminal Law","Real Estate Law","Intellectual Property","Tax Law","Immigration","Employment & Labor"],
    "Manufacturing": ["Automotive","Aerospace & Defense","Electronics","Food & Beverage","Chemicals","Textiles & Apparel","Machinery & Equipment","Consumer Goods","Metals & Fabrication","Pharmaceuticals"],
    "Marketing": ["Advertising Agencies","Digital Marketing","SEO / SEM","Social Media","Branding & Creative","PR & Communications","Market Research","Content & Influencer"],
    "Media and Publishing": ["News & Newspapers","Magazines","Book Publishing","Broadcasting (Radio/TV)","Digital Media","Print & Advertising","Podcasting"],
    "Mining": ["Coal","Metals (Gold/Copper/Iron)","Precious Metals & Gems","Quarrying & Aggregates","Industrial Minerals","Mining Services & Equipment"],
    "Nonprofit and Social": ["Charities & Foundations","Religious Organizations","Advocacy & Social Services","Education Nonprofits","Healthcare Nonprofits","Arts & Culture","Environmental","Community & Civic"],
    "Personal and Consumer Services": ["Salons & Beauty","Fitness & Wellness","Childcare","Pet Services","Cleaning & Janitorial","Repair & Maintenance","Funeral Services","Laundry & Dry Cleaning","Landscaping & Lawn Care"],
    "Professional and Consulting": ["Management Consulting","Strategy","HR Consulting","IT Consulting","Engineering","Architecture","Accounting & Tax","Recruiting & Staffing"],
    "Real Estate": ["Residential Brokerage","Commercial Real Estate","Property Management","Development","Leasing","REITs","Appraisal","Title & Escrow"],
    "Research": ["Scientific R&D","Market Research","Clinical & Medical Research","Academic Research","Think Tanks & Policy","Product Development","Testing Labs"],
    "Retail": ["Apparel & Fashion","Grocery & Supermarket","Electronics","Home & Furniture","E-commerce","Specialty Retail","Department Stores","Convenience Stores","Automotive Retail"],
    "Software Development": ["SaaS","Mobile Apps","Web Development","Enterprise Software","Game Development","DevOps & Infrastructure","AI / ML","QA & Testing"],
    "Telecommunications": ["Wireless / Mobile Carriers","Internet Service Providers","Fiber & Broadband","Satellite","Telecom Equipment","VoIP & Unified Comms"],
    "Transportation": ["Trucking & Freight","Logistics & 3PL","Air","Rail","Maritime & Shipping","Public Transit","Last-Mile Delivery","Warehousing"],
    "Utilities": ["Electric","Water & Wastewater","Natural Gas","Waste Management","Renewable Utilities","Telecom Utilities"],
    "Wholesale and Distribution": ["Industrial & MRO","Food & Beverage Distribution","Consumer Goods","Building Materials","Electronics","Pharmaceuticals","Automotive Parts","Import / Export"]
  }
  $json$;
  cat_name text;
  sub_name text;
  cat_id bigint;
begin
  for cat_name in select jsonb_object_keys(data) loop
    select id into cat_id
      from public.org_chart_template_categories
      where name = cat_name
      limit 1;
    if cat_id is null then
      raise notice 'Category not found, skipping: %', cat_name;
      continue;
    end if;
    for sub_name in select jsonb_array_elements_text(data -> cat_name) loop
      if not exists (
        select 1 from public.org_chart_template_subcategories
        where category_id = cat_id and name = sub_name
      ) then
        insert into public.org_chart_template_subcategories (name, category_id)
        values (sub_name, cat_id);
      end if;
    end loop;
  end loop;
end $$;
