-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing rebuild — PHASE 2b (Layer 3): route material rows → material + material_price
--
-- Non-destructive. Populates the new catalog from material_migration_map's
-- kind='material' rows; material_rates is left fully intact so the estimator
-- keeps running unchanged until modules are repointed (later phase).
-- Standard rows (vendor_id null) resolve to the tenant's Standard vendor;
-- vendor-tagged rows keep their own vendor. Idempotent.
--
-- Result on prod (2026-08-06): 792 products, 792 prices, 0 unpriced.
-- ("Sink Plumbing - BBQ" is excluded — subcat_code still null pending a home.)
-- ─────────────────────────────────────────────────────────────────────────────

-- A) collection/style attribute (Paver collection, Lighting Path/Well)
alter table public.material add column if not exists collection text;

-- B) products — one per (category, subcategory, name); dedupes by unique key
insert into public.material
  (tenant_id, category_id, subcategory_id, description, calc_meta, collection, legacy_rate_id)
select mm.tenant_id, s.category_id, s.id, mm.name, mr.calc_meta, mm.collection, mm.rate_id
  from public.material_migration_map mm
  join public.subcategory s
    on s.tenant_id = mm.tenant_id and s.code = mm.subcat_code
  join public.material_rates mr on mr.id = mm.rate_id
 where mm.kind = 'material' and mm.subcat_code is not null
on conflict (tenant_id, category_id, subcategory_id, description) do nothing;

-- C) prices — one open price per (product, vendor); Standard rows → Standard vendor
insert into public.material_price
  (tenant_id, material_id, vendor_id, price, effective_start, source)
select mm.tenant_id, mat.id, coalesce(mm.vendor_id, std.id), mm.unit_cost, current_date, 'migration'
  from public.material_migration_map mm
  join public.subcategory s
    on s.tenant_id = mm.tenant_id and s.code = mm.subcat_code
  join public.material mat
    on mat.tenant_id = mm.tenant_id and mat.subcategory_id = s.id and mat.description = mm.name
  join lateral (
    select id from public.subs_vendors sv
     where sv.tenant_id = mm.tenant_id
       and lower(sv.company_name) in ('standard','unspecified')
     order by sv.company_name limit 1
  ) std on true
 where mm.kind = 'material' and mm.subcat_code is not null
on conflict (material_id, vendor_id) where (effective_end is null) do nothing;

-- ── Parity (run after) ────────────────────────────────────────────────────────
-- select
--   (select count(*) from public.material_migration_map where kind='material' and subcat_code is not null) as source_rows,
--   (select count(*) from public.material) as products,
--   (select count(*) from public.material_price where source='migration') as prices;
-- -- rows with no price (must be empty):
-- select mm.category, mm.subcat_code, mm.name from public.material_migration_map mm
--  where mm.kind='material' and mm.subcat_code is not null
--    and not exists (select 1 from public.material mt join public.material_price mp on mp.material_id=mt.id
--                    where mt.tenant_id=mm.tenant_id and mt.description=mm.name);
