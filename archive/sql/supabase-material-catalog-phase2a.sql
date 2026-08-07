-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing rebuild — PHASE 2a: material (product) + material_price tables
--
-- Per docs/pricing-materials-spec.md. Product attributes live ONCE on `material`;
-- `material_price` holds one row per (product × vendor), Standard = the shared
-- Standard vendor. Tenant-scoped, same trigger/RLS pattern as the rest.
--
-- Additive — nothing populated yet; the migration (Phase 2b) routes rows in.
-- Run once on prod.
-- ─────────────────────────────────────────────────────────────────────────────

-- material — the product. One row per product; description/unit/calc_meta here.
create table if not exists public.material (
  id             uuid primary key default gen_random_uuid(),   -- the Material ID
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  category_id    uuid not null references public.category(id),
  subcategory_id uuid not null references public.subcategory(id),
  description    text not null,
  unit           text,
  calc_meta      jsonb,
  is_default     boolean not null default false,   -- default item for its sub-category
  legacy_rate_id uuid,                              -- source material_rates.id (migration trace)
  created_at     timestamptz not null default now(),
  unique (tenant_id, category_id, subcategory_id, description)
);
create index if not exists idx_material_subcat on public.material (subcategory_id);

-- material_price — the priced list. One current (open) price per product × vendor.
create table if not exists public.material_price (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  material_id     uuid not null references public.material(id) on delete cascade,
  vendor_id       uuid not null references public.subs_vendors(id) on delete cascade,
  price           numeric,
  effective_start date not null default current_date,
  effective_end   date,                             -- null = current/open
  source          text,                             -- migration | manual | price_sheet | invoice
  created_at      timestamptz not null default now()
);
create index if not exists idx_material_price_mat on public.material_price (material_id);
-- exactly one open price per product+vendor
create unique index if not exists uq_material_price_open
  on public.material_price (material_id, vendor_id) where (effective_end is null);

-- Tenant stamp + RLS -----------------------------------------------------------
drop trigger if exists set_tenant_id on public.material;
create trigger set_tenant_id before insert on public.material
  for each row execute function public.set_tenant_id();
drop trigger if exists set_tenant_id on public.material_price;
create trigger set_tenant_id before insert on public.material_price
  for each row execute function public.set_tenant_id();

alter table public.material       enable row level security;
alter table public.material_price enable row level security;

drop policy if exists material_rw on public.material;
create policy material_rw on public.material for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());
drop policy if exists material_price_rw on public.material_price;
create policy material_price_rw on public.material_price for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

grant select, insert, update, delete on public.material       to authenticated;
grant select, insert, update, delete on public.material_price to authenticated;
