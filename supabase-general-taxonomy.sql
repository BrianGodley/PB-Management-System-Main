-- ─────────────────────────────────────────────────────────────────────────────
-- General taxonomy — general_category + general_subcategory (per-tenant)
--
-- Mirrors the material category/subcategory tables (same tenant stamp + RLS
-- pattern) but standalone: no default vendor, no material links. Backs the new
-- Vendors › General ▾ dropdown (General Categories / General Sub Categories).
--
-- Run once on prod (and staging). Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Tables --------------------------------------------------------------------
create table if not exists public.general_category (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  code       text not null,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.general_subcategory (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.general_category(id) on delete cascade,
  code        text not null,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, category_id, code)
);
create index if not exists idx_general_subcategory_category
  on public.general_subcategory (category_id);

-- 2) Tenant stamp + RLS (same pattern as every other table) --------------------
drop trigger if exists set_tenant_id on public.general_category;
create trigger set_tenant_id before insert on public.general_category
  for each row execute function public.set_tenant_id();
drop trigger if exists set_tenant_id on public.general_subcategory;
create trigger set_tenant_id before insert on public.general_subcategory
  for each row execute function public.set_tenant_id();

alter table public.general_category    enable row level security;
alter table public.general_subcategory enable row level security;

drop policy if exists general_category_rw on public.general_category;
create policy general_category_rw on public.general_category for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());
drop policy if exists general_subcategory_rw on public.general_subcategory;
create policy general_subcategory_rw on public.general_subcategory for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

grant select, insert, update, delete on public.general_category    to authenticated;
grant select, insert, update, delete on public.general_subcategory to authenticated;
