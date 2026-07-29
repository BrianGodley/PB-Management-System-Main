-- ============================================================================
-- Paver catalog → standard vendor structure
-- ----------------------------------------------------------------------------
-- Ports the one-off global `paver_prices` table into the standard
-- subs_vendors + material_rates structure used by every other module:
--   • each paver BRAND becomes a vendor (subs_vendors, type='vendor'),
--     tagged to the 'Paver Material' category.
--   • each paver becomes a material_rates row (category='Paver',
--     subcategory='Paver Material', vendor_id=<brand vendor>, unit_cost=$/SF).
--   • two paver-specific attributes (sf_per_pallet, price_per_lf_vert) that
--     don't fit unit_cost get their own nullable columns on material_rates.
--
-- Also seeds the 'Paver Material' + 'Base Material' material categories and a
-- House base-rock type ('Class II Roadbase').
--
-- Idempotent (guarded by NOT EXISTS). Run on STAGING first, then PROD.
-- ============================================================================

-- 0) Ensure material_categories exists (newer Vendors-feature table; may be
--    missing on a database that never got the vendor-category setup). --------
create table if not exists public.material_categories (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);
drop trigger if exists set_tenant_id on public.material_categories;
create trigger set_tenant_id before insert on public.material_categories
  for each row execute function public.set_tenant_id();
alter table public.material_categories enable row level security;
drop policy if exists material_categories_rw on public.material_categories;
create policy material_categories_rw on public.material_categories
  for all to authenticated
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());
grant select, insert, update, delete on public.material_categories to authenticated;

-- 1) Paver-specific attribute columns on material_rates ----------------------
alter table public.material_rates add column if not exists sf_per_pallet     numeric;
alter table public.material_rates add column if not exists price_per_lf_vert numeric;

-- 2) Material categories so vendors can be tagged ----------------------------
insert into public.material_categories (tenant_id, name)
select t.tenant_id, c.name
from (select distinct tenant_id from public.material_rates) t
cross join (values ('Paver Material'), ('Base Material')) as c(name)
where not exists (
  select 1 from public.material_categories mc
  where mc.tenant_id = t.tenant_id and mc.name = c.name
);

-- 3) One vendor per paver brand (for every tenant already using material_rates)
insert into public.subs_vendors (tenant_id, company_name, type, supplied_categories)
select t.tenant_id, b.brand, 'vendor', array['Paver Material']::text[]
from (select distinct tenant_id from public.material_rates) t
cross join (select distinct brand from public.paver_prices where brand is not null) b
where not exists (
  select 1 from public.subs_vendors sv
  where sv.tenant_id = t.tenant_id and sv.company_name = b.brand and sv.type = 'vendor'
);

-- 4) Each paver → a vendor-tagged material_rates row -------------------------
--    Name is prefixed 'Paver Material - …' to match the module's catalog
--    convention (the picker strips the '<subcategory> - ' prefix for display).
--    De-dupe on (brand, name) since paver_prices has duplicate rows, and
--    ON CONFLICT guards the material_rates (tenant_id, name, category) unique key.
insert into public.material_rates
  (tenant_id, category, subcategory, vendor_id, name, unit_cost, sf_per_pallet, price_per_lf_vert)
select sv.tenant_id, 'Paver', 'Paver Material', sv.id,
       'Paver Material - ' || pp.name,
       pp.price_per_sf, pp.sf_per_pallet, pp.price_per_lf_vert
from (
  select distinct on (brand, name)
         brand, name, price_per_sf, sf_per_pallet, price_per_lf_vert
  from public.paver_prices
  where brand is not null and name is not null
  order by brand, name
) pp
join public.subs_vendors sv
  on sv.company_name = pp.brand and sv.type = 'vendor'
on conflict (tenant_id, name, category) do nothing;

-- 5) House base-rock type so Base Material has a default ('Class II Roadbase')
--    priced from the existing 'Paver - Base Rock' rate where present.
insert into public.material_rates (tenant_id, category, subcategory, name, unit_cost)
select t.tenant_id, 'Paver', 'Base Material', 'Base Material - Class II Roadbase',
       coalesce(
         (select mr.unit_cost from public.material_rates mr
           where mr.tenant_id = t.tenant_id and mr.name = 'Paver - Base Rock' limit 1),
         38.5)
from (select distinct tenant_id from public.material_rates) t
where not exists (
  select 1 from public.material_rates mr
  where mr.tenant_id = t.tenant_id
    and mr.category = 'Paver'
    and mr.subcategory = 'Base Material'
    and mr.name = 'Base Material - Class II Roadbase'
);
