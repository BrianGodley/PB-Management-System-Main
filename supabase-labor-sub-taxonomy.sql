-- ============================================================================
-- Master Category + Sub-Category tables for LABOR and SUBCONTRACTOR rates.
-- Independent per table (labor has its own lists; subs have their own), mirroring
-- the material category/subcategory tables (same tenant stamp + RLS + code field).
--
-- NOTE: labor_rates / subcontractor_rates KEEP their free-text `category` /
-- `sub_category` columns (every estimator module queries by that text). These
-- taxonomy tables back the managed dropdowns in Master Rates and supply the
-- `code` used to generate each row's identity code. Matched by NAME.
--
-- Run once on prod (and staging). Idempotent.
-- ============================================================================

-- 1) Tables --------------------------------------------------------------------
create table if not exists public.labor_category (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create table if not exists public.labor_subcategory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.labor_category(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, category_id, code)
);
create index if not exists idx_labor_subcategory_category on public.labor_subcategory (category_id);

create table if not exists public.subcontractor_category (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create table if not exists public.subcontractor_subcategory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.subcontractor_category(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, category_id, code)
);
create index if not exists idx_sub_subcategory_category on public.subcontractor_subcategory (category_id);

-- 2) Tenant stamp + RLS (same pattern as every other table) --------------------
do $$
declare t text;
begin
  foreach t in array array[
    'labor_category','labor_subcategory','subcontractor_category','subcontractor_subcategory'
  ] loop
    execute format('drop trigger if exists set_tenant_id on public.%I', t);
    execute format('create trigger set_tenant_id before insert on public.%I for each row execute function public.set_tenant_id()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_rw on public.%I', t, t);
    execute format('create policy %I_rw on public.%I for all to authenticated using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id())', t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- 3) Seed from existing rate data (distinct category / sub_category values). ----
--    Code = up-to-6-char uppercase alphanumeric slug of the name, de-duplicated
--    with a 2-digit suffix on collision. Matches the misc-rate code style.

-- 3a) Labor categories
insert into public.labor_category (tenant_id, code, name)
select tenant_id, code, name from (
  select tenant_id, name,
    case when count(*) over (partition by tenant_id, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, base order by name))::text, 2, '0') end as code
  from (
    select distinct tenant_id, btrim(category) as name,
      coalesce(nullif(upper(regexp_replace(left(btrim(category), 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
    from public.labor_rates where btrim(coalesce(category, '')) <> ''
  ) d
) e
on conflict (tenant_id, code) do nothing;

-- 3b) Labor sub-categories (linked to their category by name)
insert into public.labor_subcategory (tenant_id, category_id, code, name)
select s.tenant_id, c.id, s.code, s.name from (
  select tenant_id, cat_name, name,
    case when count(*) over (partition by tenant_id, cat_name, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, cat_name, base order by name))::text, 2, '0') end as code
  from (
    select distinct tenant_id, btrim(category) as cat_name, btrim(sub_category) as name,
      coalesce(nullif(upper(regexp_replace(left(btrim(sub_category), 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
    from public.labor_rates
    where btrim(coalesce(sub_category, '')) <> '' and btrim(coalesce(category, '')) <> ''
  ) d
) s
join public.labor_category c on c.tenant_id = s.tenant_id and c.name = s.cat_name
on conflict (tenant_id, category_id, code) do nothing;

-- 3c) Subcontractor categories
insert into public.subcontractor_category (tenant_id, code, name)
select tenant_id, code, name from (
  select tenant_id, name,
    case when count(*) over (partition by tenant_id, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, base order by name))::text, 2, '0') end as code
  from (
    select distinct tenant_id, btrim(category) as name,
      coalesce(nullif(upper(regexp_replace(left(btrim(category), 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
    from public.subcontractor_rates where btrim(coalesce(category, '')) <> ''
  ) d
) e
on conflict (tenant_id, code) do nothing;

-- 3d) Subcontractor sub-categories
insert into public.subcontractor_subcategory (tenant_id, category_id, code, name)
select s.tenant_id, c.id, s.code, s.name from (
  select tenant_id, cat_name, name,
    case when count(*) over (partition by tenant_id, cat_name, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, cat_name, base order by name))::text, 2, '0') end as code
  from (
    select distinct tenant_id, btrim(category) as cat_name, btrim(sub_category) as name,
      coalesce(nullif(upper(regexp_replace(left(btrim(sub_category), 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
    from public.subcontractor_rates
    where btrim(coalesce(sub_category, '')) <> '' and btrim(coalesce(category, '')) <> ''
  ) d
) s
join public.subcontractor_category c on c.tenant_id = s.tenant_id and c.name = s.cat_name
on conflict (tenant_id, category_id, code) do nothing;

-- 4) Review what got seeded:
-- select 'labor_cat' t, code, name from public.labor_category
-- union all select 'labor_sub', code, name from public.labor_subcategory
-- union all select 'sub_cat', code, name from public.subcontractor_category
-- union all select 'sub_sub', code, name from public.subcontractor_subcategory
-- order by 1, 3;
