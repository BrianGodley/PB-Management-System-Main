-- ============================================================================
-- Concrete finish/sealer/vapor MATERIAL catalog products. Idempotent, insert-
-- only (never overwrites). Run on prod + staging.
--   Sealers (Home Depot, gallon, coverage 100 SqFt @ 2 coats):
--     Glaze and Seal Wet Look $65, Eagle Natural Look $30
--   Vapor barrier (Home Depot, priced per SqFt):
--     200 SqFt Roll x 6 Mil $0.35, 500 SqFt Roll x 10 Mil $0.40
--   Sand finish (White Cap, gallon, coverage 50 SqFt): Top Cast 01/03/05/15 $60
-- Prices live on material_price (vendor-specific). Coverage lives in calc_meta.
-- ============================================================================

-- 1) Vendors (type 'vendor') --------------------------------------------------
insert into public.subs_vendors (tenant_id, company_name, type)
select t.tid, v.name, 'vendor'
from (select tenant_id tid from public.category where name = 'Concrete' limit 1) t
cross join (values ('Home Depot'), ('White Cap')) v(name)
where not exists (
  select 1 from public.subs_vendors s where s.company_name = v.name and s.tenant_id = t.tid
);

-- 2) Sub-categories under Concrete --------------------------------------------
insert into public.subcategory (tenant_id, category_id, code, name)
select c.tenant_id, c.id, v.code, v.name
from public.category c
cross join (values
  ('CSEAL', 'Concrete Sealer'),
  ('CVAP',  'Vapor Barrier'),
  ('CFIN',  'Concrete Finish Material')
) v(code, name)
where c.name = 'Concrete'
and not exists (
  select 1 from public.subcategory s where s.category_id = c.id and s.name = v.name
);

-- 3) Materials (description + unit + coverage in calc_meta) --------------------
insert into public.material (tenant_id, category_id, subcategory_id, description, unit, calc_meta)
select c.tenant_id, c.id, sc.id, m.descr, m.unit, m.meta::jsonb
from public.category c
cross join (values
  ('Concrete Sealer',           'Glaze and Seal Wet Look',  'gallon', '{"coverageSqFt":100,"coats":2}'),
  ('Concrete Sealer',           'Eagle Natural Look',       'gallon', '{"coverageSqFt":100,"coats":2}'),
  ('Vapor Barrier',             '200 Sq Ft Roll x 6 Mil',   'Sq Ft',  '{}'),
  ('Vapor Barrier',             '500 Sq Ft Roll x 10 Mil',  'Sq Ft',  '{}'),
  ('Concrete Finish Material',  'Top Cast 01',              'gallon', '{"coverageSqFt":50,"finish":"Sand Finish"}'),
  ('Concrete Finish Material',  'Top Cast 03',              'gallon', '{"coverageSqFt":50,"finish":"Sand Finish"}'),
  ('Concrete Finish Material',  'Top Cast 05',              'gallon', '{"coverageSqFt":50,"finish":"Sand Finish"}'),
  ('Concrete Finish Material',  'Top Cast 15',              'gallon', '{"coverageSqFt":50,"finish":"Sand Finish"}')
) m(subcat, descr, unit, meta)
join public.subcategory sc on sc.category_id = c.id and sc.name = m.subcat
where c.name = 'Concrete'
and not exists (
  select 1 from public.material x where x.subcategory_id = sc.id and x.description = m.descr
);

-- 4) Vendor prices ------------------------------------------------------------
insert into public.material_price (tenant_id, material_id, vendor_id, price, effective_start, source)
select mat.tenant_id, mat.id, ven.id, p.price, current_date, 'manual'
from (values
  ('Glaze and Seal Wet Look', 'Home Depot', 65),
  ('Eagle Natural Look',      'Home Depot', 30),
  ('200 Sq Ft Roll x 6 Mil',  'Home Depot', 0.35),
  ('500 Sq Ft Roll x 10 Mil', 'Home Depot', 0.40),
  ('Top Cast 01',             'White Cap',  60),
  ('Top Cast 03',             'White Cap',  60),
  ('Top Cast 05',             'White Cap',  60),
  ('Top Cast 15',             'White Cap',  60)
) p(descr, vendor, price)
join public.material mat on mat.description = p.descr
join public.subs_vendors ven on ven.company_name = p.vendor and ven.type = 'vendor' and ven.tenant_id = mat.tenant_id
where not exists (
  select 1 from public.material_price mp
  where mp.material_id = mat.id and mp.vendor_id = ven.id and mp.effective_end is null
);
