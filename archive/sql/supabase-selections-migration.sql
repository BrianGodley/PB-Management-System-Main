-- ============================================================================
-- Selections — a design/spec catalog of choosable items (plants, lighting,
-- BBQ, hardscape, etc.), separate from material_rates (which is for pricing).
-- Catalog import writes items here too, so selections get photos + descriptions.
--   • Browsed in Design → Selections, grouped by category / sub_category.
--   • `attributes` (jsonb) holds type-specific specs shown on the detail page.
-- Idempotent. Run on STAGING first, then PROD.
-- ============================================================================

create table if not exists public.selections (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  category         text,
  sub_category     text,
  name             text not null,
  description      text,
  photo_url        text,
  type             text,                                   -- layout/type tag (usually the category)
  attributes       jsonb not null default '{}'::jsonb,     -- flexible per-type specs
  vendor_id        uuid references public.subs_vendors(id) on delete set null,
  material_rate_id uuid references public.material_rates(id) on delete set null,
  sku              text,
  unit             text,
  price            numeric,
  source           text not null default 'manual',         -- catalog | manual
  created_at       timestamptz not null default now(),
  created_by       uuid
);

create index if not exists idx_selections_cat
  on public.selections (category, sub_category, name);

-- De-dupe key so re-importing a catalog doesn't pile up duplicates (per vendor;
-- House/manual selections keyed with a zero sentinel).
create unique index if not exists selections_tenant_vendor_name_cat_key
  on public.selections (
    tenant_id,
    coalesce(vendor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name),
    lower(coalesce(category, ''))
  );

drop trigger if exists set_tenant_id on public.selections;
create trigger set_tenant_id before insert on public.selections
  for each row execute function public.set_tenant_id();

alter table public.selections enable row level security;
drop policy if exists selections_rw on public.selections;
create policy selections_rw on public.selections
  for all to authenticated
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

grant select, insert, update, delete on public.selections to authenticated;
