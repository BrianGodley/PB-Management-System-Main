-- Reset the Construction category's subcategories: keep only "Specialty Trades",
-- remove the rest, then add the full trade list below. Idempotent.

do $$
declare
  cat_id bigint;
begin
  select id into cat_id
    from public.org_chart_template_categories
   where name = 'Construction' limit 1;
  if cat_id is null then
    raise notice 'Construction category not found — nothing done.';
    return;
  end if;

  -- Remove sample templates tied to the subcategories we're about to drop
  -- (avoids FK issues), then drop those subcategories.
  delete from public.org_chart_templates
   where category_id = cat_id
     and subcategory_id in (
       select id from public.org_chart_template_subcategories
        where category_id = cat_id and name <> 'Specialty Trades'
     );

  delete from public.org_chart_template_subcategories
   where category_id = cat_id and name <> 'Specialty Trades';

  -- Add the new trade subcategories (skip any that already exist).
  insert into public.org_chart_template_subcategories (category_id, name)
  select cat_id, v.name
    from (values
      ('Electrical'), ('Plumbing'), ('Landscaping'), ('HVAC'), ('Framing'),
      ('Drywall'), ('Concrete'), ('Asphalt Paving'), ('Paving Stone'),
      ('Demolition'), ('Earthwork'), ('Surveyor'), ('Inspections'),
      ('Architect'), ('Sanitation'), ('Sheet Metal'), ('Electric Sign'),
      ('Tree and Palm'), ('Commercial General Contractor'),
      ('Residential General Contractor'), ('Renovation General Contractor'),
      ('Industrial General Contractor'), ('Engineering'), ('Roofer'),
      ('Lathing and Plaster'), ('Refrigeration'), ('Windows and Doors'),
      ('Finish Carpenter'), ('Flooring'), ('Kitchen Remodeler'),
      ('ADU Contractor'), ('Insulation'), ('Lighting'), ('Audio/Visual'),
      ('Tiling'), ('Solar'), ('Skylights'), ('Painter'), ('Pool'),
      ('Shotcrete'), ('Structural Steel'), ('Reinforcing Steel'),
      ('Drilling'), ('Welding'), ('Elevator'), ('Fire Protection'),
      ('Water Features'), ('Low Voltage'), ('Fencing'), ('Ornamental Metal'),
      ('Lock and Security'), ('Masonry'), ('Traffic Control'),
      ('Highway Improvement'), ('Pipeline')
    ) as v(name)
   where not exists (
     select 1 from public.org_chart_template_subcategories s
      where s.category_id = cat_id and s.name = v.name
   );

  raise notice 'Construction subcategories reset.';
end $$;
