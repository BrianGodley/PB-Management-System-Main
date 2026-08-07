-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing rebuild — misc_rates table (fees) + PACC sub-category
--
-- (1) misc_rates — a per-tenant "Miscellaneous Rates" table for fees/delivery/
--     dump charges that are neither materials, labor, nor sub-rates. Sits in
--     Jobs → Settings next to Master Labor Rates. Same shape as labor_rates.
-- (2) Add the Paver Accessories (PACC) sub-category to the taxonomy.
--
-- Additive. Run once on prod.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Miscellaneous Rates -------------------------------------------------------
create table if not exists public.misc_rates (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  category    text,          -- optional grouping (Demo, Paver, Drainage…)
  name        text not null,
  unit        text,
  rate        numeric,
  notes       text,
  created_at  timestamptz not null default now()
);

drop trigger if exists set_tenant_id on public.misc_rates;
create trigger set_tenant_id before insert on public.misc_rates
  for each row execute function public.set_tenant_id();

alter table public.misc_rates enable row level security;
drop policy if exists misc_rates_rw on public.misc_rates;
create policy misc_rates_rw on public.misc_rates for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

grant select, insert, update, delete on public.misc_rates to authenticated;

-- 2) Paver Accessories sub-category --------------------------------------------
insert into public.subcategory (tenant_id, category_id, code, name)
select c.tenant_id, c.id, 'PACC', 'Paver Accessories'
  from public.category c
 where c.code = 'PVR'
on conflict (tenant_id, category_id, code) do nothing;
