-- Consolidate weed fabric to ONE canonical record every module shares, exactly
-- like Class II Roadbase / Decomposed Granite:
--   • Canonical: category 'Basic Materials', NEW subcategory 'Barriers',
--     description 'Weed Fabric' -> Standard price $0.10, unit 'Sq Ft'.
--   • Ground Treatments (Mulch / DG / Gravel / Pebble / Cobbles weed-fabric
--     options) and Artificial Turf (Turf-Prep Weed Barrier) both resolve their
--     weed-fabric price from this item by name.
-- Run AFTER deploying the code that points those modules at 'Weed Fabric'.
-- Idempotent. Run on prod + staging.

-- 1) Subcategory 'Barriers' under Basic Materials.
insert into public.subcategory (tenant_id, category_id, code, name)
select c.tenant_id, c.id, 'BAR', 'Barriers'
from public.category c
where c.name = 'Basic Materials'
  and not exists (
    select 1 from public.subcategory s
    where s.category_id = c.id and lower(trim(s.name)) = 'barriers'
  );

-- 2) Canonical material 'Weed Fabric' (unit Sq Ft) in Basic Materials -> Barriers.
insert into public.material (tenant_id, category_id, subcategory_id, description, unit)
select c.tenant_id, c.id, s.id, 'Weed Fabric', 'Sq Ft'
from public.category c
join public.subcategory s on s.category_id = c.id and lower(trim(s.name)) = 'barriers'
where c.name = 'Basic Materials'
  and not exists (
    select 1 from public.material m
    where m.category_id = c.id and m.subcategory_id = s.id and m.description = 'Weed Fabric'
  );

-- 3) Standard-vendor open price = $0.10 / Sq Ft (insert if missing).
insert into public.material_price (tenant_id, material_id, vendor_id, price, effective_start, source)
select m.tenant_id, m.id, v.id, 0.10, current_date, 'migration'
from public.material m
join public.category c on c.id = m.category_id
join public.subcategory s on s.id = m.subcategory_id
join lateral (
  select id from public.subs_vendors
  where company_name ilike 'standard' or company_name ilike 'unspecified'
  order by (company_name ilike 'standard') desc
  limit 1
) v on true
where c.name = 'Basic Materials' and lower(trim(s.name)) = 'barriers'
  and m.description = 'Weed Fabric'
  and not exists (
    select 1 from public.material_price mp
    where mp.material_id = m.id and mp.vendor_id = v.id and mp.effective_end is null
  );

-- Verify:
-- select c.name, s.name, m.description, m.unit, mp.price
-- from public.material m
-- join public.category c on c.id = m.category_id
-- join public.subcategory s on s.id = m.subcategory_id
-- join public.material_price mp on mp.material_id = m.id and mp.effective_end is null
-- where m.description = 'Weed Fabric';
