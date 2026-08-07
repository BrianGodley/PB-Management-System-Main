-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing rebuild — PHASE 1: category + subcategory tables (per-tenant) + seed
--
-- Foundation for docs/pricing-materials-spec.md. Tenant-scoped to match the rest
-- of the app (tenant_id + set_tenant_id trigger + RLS on auth_tenant_id()).
-- Seeds the approved taxonomy (docs/pricing-taxonomy-proposal.md) for every
-- tenant that has material data. Additive; nothing reads these yet.
--
-- Run once on prod. Idempotent (ON CONFLICT DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Tables --------------------------------------------------------------------
create table if not exists public.category (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  code       text not null,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.subcategory (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  category_id       uuid not null references public.category(id) on delete cascade,
  code              text not null,
  name              text not null,
  default_vendor_id uuid references public.subs_vendors(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (tenant_id, category_id, code)
);
create index if not exists idx_subcategory_category on public.subcategory (category_id);

-- 2) Tenant stamp + RLS (same pattern as every other table) --------------------
drop trigger if exists set_tenant_id on public.category;
create trigger set_tenant_id before insert on public.category
  for each row execute function public.set_tenant_id();
drop trigger if exists set_tenant_id on public.subcategory;
create trigger set_tenant_id before insert on public.subcategory
  for each row execute function public.set_tenant_id();

alter table public.category    enable row level security;
alter table public.subcategory enable row level security;

drop policy if exists category_rw on public.category;
create policy category_rw on public.category for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());
drop policy if exists subcategory_rw on public.subcategory;
create policy subcategory_rw on public.subcategory for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

grant select, insert, update, delete on public.category    to authenticated;
grant select, insert, update, delete on public.subcategory to authenticated;

-- 3) Seed CATEGORIES for each tenant that has material data --------------------
insert into public.category (tenant_id, code, name)
select t.tenant_id, v.code, v.name
  from (select distinct tenant_id from public.material_rates where tenant_id is not null) t
  cross join (values
    ('TURF','Artificial Turf'), ('BASE','Basic Materials'), ('COL','Columns'),
    ('CONC','Concrete'), ('DEMO','Demo'), ('DRN','Drainage'), ('FIN','Finishes'),
    ('FP','Fire Pit'), ('GT','Ground Treatments'), ('IRR','Irrigation'),
    ('LT','Lighting'), ('OK','Outdoor Kitchen'), ('PVR','Paver'), ('PLT','Planting'),
    ('POOL','Pool'), ('STEP','Steps'), ('UTIL','Utilities'), ('WALL','Walls'),
    ('WATR','Water Features'), ('WEED','Weed Abatement')
  ) as v(code, name)
on conflict (tenant_id, code) do nothing;

-- 4) Seed SUB-CATEGORIES (resolve category_id per tenant by category code) -----
insert into public.subcategory (tenant_id, category_id, code, name)
select c.tenant_id, c.id, s.subcode, s.subname
  from (values
    ('TURF','TMAT','Turf Material'),('TURF','TBASE','Turf Base'),('TURF','TINF','Turf Infill'),('TURF','TACC','Turf Accessories'),
    ('BASE','AGG','Aggregate & Concrete'),('BASE','RBR','Reinforcement'),('BASE','GRT','Grout'),
    ('COL','CBLK','Column Block'),('COL','CFIN','Column Finish'),('COL','CCAP','Column Cap'),
    ('CONC','CMIX','Concrete Mix'),('CONC','CBSE','Concrete Base'),('CONC','CACC','Concrete Accessories'),
    ('DEMO','DDMP','Dump Fees'),('DEMO','DHAUL','Haul & Container'),('DEMO','DEQP','Equipment & Method'),
    ('DRN','DPIPE','Drain Pipe'),('DRN','DFIX','Drain Fixtures'),('DRN','DADD','Additional Items'),
    ('FIN','FMAT','Finish Material'),('FIN','FCAP','Cap'),
    ('FP','FPBLK','Structure & Block'),('FP','FPFIN','Wall Finish'),('FP','FPCAP','Wall Cap'),
    ('GT','SOD','Sod'),('GT','SOIL','Soils'),('GT','SPREP','Soil Prep'),('GT','FERT','Fertilizer'),
    ('GT','MULCH','Mulch'),('GT','DG','Decomposed Granite'),('GT','GRVL','Gravel'),('GT','PEBL','Pebble'),
    ('GT','COBL','Cobbles'),('GT','STPR','Steppers'),('GT','EDGE','Edging'),('GT','FAB','Fabrics'),
    ('IRR','ICTRL','Controllers'),('IRR','IDRIP','Drip'),('IRR','IGLUE','Glue & Solvents'),
    ('IRR','IPIPE','Pipe'),('IRR','ISPR','Sprinklers'),('IRR','IVLV','Valves'),('IRR','IFIT','Fittings & Misc'),
    ('LT','LFIX','Light Fixture'),('LT','LTRAN','Transformer'),('LT','LWIRE','Wire'),
    ('OK','OKBLK','Structure & Block'),('OK','OKFIN','Wall Finish'),('OK','OKCNT','Counter & Cap'),
    ('PVR','PMAT','Paver Material'),('PVR','PWALL','Wall'),('PVR','PBASE','Base Material'),
    ('PVR','PCOPE','Coping & Bullnose'),('PVR','PSTEP','Step'),
    ('PLT','PLPLANT','Plants'),('PLT','PLTOOL','Tools'),('PLT','PLAMD','Amendments'),
    ('POOL','POTILE','Tile'),('POOL','POCOPE','Coping'),('POOL','POFIN','Interior Finish'),
    ('POOL','POEQP','Equipment'),('POOL','POACC','Accessories'),
    ('STEP','SMAT','Step Material'),
    ('UTIL','ULINE','Utility Lines'),('UTIL','UGAS','Gas Fixtures'),('UTIL','UELEC','Electrical Fixtures'),
    ('WALL','WBLK','Wall Block'),('WALL','WMOD','Modular Wall'),('WALL','WFIN','Wall Finish'),
    ('WALL','WCAP','Wall Cap'),('WALL','WWP','Waterproofing'),
    ('WATR','WFEQP','Pump & Equipment'),('WATR','WFBSN','Basin & Reservoir'),
    ('WATR','WFROK','Rock & Feature'),('WATR','WFPLM','Plumbing'),
    ('WEED','WDHRB','Herbicide & Chemical'),('WEED','WDFAB','Weed Fabric')
  ) as s(catcode, subcode, subname)
  join public.category c on c.code = s.catcode
on conflict (tenant_id, category_id, code) do nothing;

-- 5) Check
-- select c.code cat, count(s.*) subcats
--   from public.category c left join public.subcategory s on s.category_id = c.id
--  group by c.code order by c.code;
