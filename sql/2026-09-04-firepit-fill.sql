-- Fire pit fill: one sub-category, one labor rate, seven Home Depot products.
-- Idempotent — every statement guards on NOT EXISTS, so a re-run changes nothing.
-- Run on staging AND production.

-- 1. Sub-category 'Fire Pit Fill' under the Fire Pit category.
insert into public.subcategory (tenant_id, category_id, code, name)
select c.tenant_id, c.id, 'FIRE_PIT_FILL', 'Fire Pit Fill'
from public.category c
where c.name = 'Fire Pit'
  and not exists (
    select 1 from public.subcategory sc
    where sc.category_id = c.id and sc.name = 'Fire Pit Fill'
  );

-- 2. Fill labor — 0.25 hours per Cu Ft. Hours per unit, like every other
--    labor rate in the system (no production-rate divide).
insert into public.labor_rates
  (tenant_id, name, label, category, sub_category, unit, rate)
select c.tenant_id, 'FP Fill Labor Rate', 'Fill Labor',
       'Fire Pit', 'Fire Pit Fill', 'Hrs per Cu Ft', 0.25
from public.category c
where c.name = 'Fire Pit'
  and not exists (
    select 1 from public.labor_rates lr
    where lr.name = 'FP Fill Labor Rate' and lr.tenant_id = c.tenant_id
  );

-- 3. Home Depot as a vendor (created only if it is not already there).
insert into public.subs_vendors (tenant_id, company_name, type)
select c.tenant_id, 'Home Depot', 'vendor'
from public.category c
where c.name = 'Fire Pit'
  and not exists (
    select 1 from public.subs_vendors v
    where lower(trim(v.company_name)) = 'home depot'
      and v.tenant_id = c.tenant_id
  );

-- 4. The seven products. Sold by the bag, so the price below is the SHELF
--    price and calc_meta.cu_ft_per_unit says what a bag covers; the estimator
--    divides one by the other to show $ per Cu Ft.
insert into public.material
  (tenant_id, category_id, subcategory_id, description, unit, calc_meta, ref_key)
select c.tenant_id, c.id, sc.id, i.descr, 'Each',
       jsonb_build_object('cu_ft_per_unit', i.cuft), i.ref_key
from public.category c
join public.subcategory sc
  on sc.category_id = c.id and sc.name = 'Fire Pit Fill'
cross join (values
  ('MAT-fp-fill-red-lava-34',
   'Bagged Red Lava Rock 3/4 in. - .5 Cu Ft', 0.5),
  ('MAT-fp-fill-black-lava-1-3',
   'Black Lava Rock 1 to 3 in. - .5 Cu Ft', 0.5),
  ('MAT-fp-fill-black-lava-34',
   'Black Lava Rock 3/4 in. - .5 Cu Ft', 0.5),
  ('MAT-fp-fill-black-lava-13',
   'Black Lava Rock 1/3 in. - .5 Cu Ft', 0.5),
  ('MAT-fp-fill-barksdale-glass',
   'Fire Pit Essentials 1/2 in. Barksdale Glass - .5 Cu Ft', 0.5),
  ('MAT-fp-fill-deep-sea-blue-glass',
   'Fire Pit Essentials 1/2 in. Deep Sea Blue Glass - .5 Cu Ft', 0.5),
  ('MAT-fp-fill-element-fire-glass',
   'Element Fire Glass 1/2 in. - .5 Cu Ft', 0.5)
) as i(ref_key, descr, cuft)
where c.name = 'Fire Pit'
  and not exists (
    select 1 from public.material m
    where m.ref_key = i.ref_key and m.tenant_id = c.tenant_id
  );

-- 5. Home Depot prices, left open (no effective_end) so they are the live price.
insert into public.material_price
  (tenant_id, material_id, vendor_id, price, effective_start, source)
select m.tenant_id, m.id, v.id, i.price, current_date, 'Home Depot shelf price'
from public.material m
join public.subs_vendors v
  on lower(trim(v.company_name)) = 'home depot'
 and v.type = 'vendor'
 and v.tenant_id = m.tenant_id
cross join (values
  ('MAT-fp-fill-red-lava-34', 7.40),
  ('MAT-fp-fill-black-lava-1-3', 100.00),
  ('MAT-fp-fill-black-lava-34', 100.00),
  ('MAT-fp-fill-black-lava-13', 100.00),
  ('MAT-fp-fill-barksdale-glass', 45.00),
  ('MAT-fp-fill-deep-sea-blue-glass', 35.00),
  ('MAT-fp-fill-element-fire-glass', 14.00)
) as i(ref_key, price)
where m.ref_key = i.ref_key
  and not exists (
    select 1 from public.material_price mp
    where mp.material_id = m.id
      and mp.vendor_id = v.id
      and mp.effective_end is null
  );

-- Check: 7 products, each with one open Home Depot price, plus the labor rate.
select m.description, mp.price,
       round((mp.price / (m.calc_meta->>'cu_ft_per_unit')::numeric), 2) as per_cu_ft
from public.material m
join public.material_price mp
  on mp.material_id = m.id and mp.effective_end is null
where m.ref_key like 'MAT-fp-fill-%'
order by m.description;
