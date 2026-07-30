-- ============================================================================
-- Vendor price history + price-sheet imports
-- ----------------------------------------------------------------------------
-- Foundation for Sam's price-sheet ingestion (Phase 1) and the later
-- invoice price-check (Phase 2).
--   • price_sheet_imports  — one row per uploaded price sheet (audit trail).
--   • material_price_history — per-item price timeline with effective ranges.
--     material_rates.unit_cost stays the CURRENT/active price; history holds
--     prior (and the current) periods so we can answer "price as of <date>".
--   • price_as_of() — helper returning a material's unit_cost on a given date.
--   • price-sheets storage bucket for the uploaded files.
--
-- Idempotent. Run on STAGING first, then PROD.
-- ============================================================================

-- 1) Price-sheet import audit -----------------------------------------------
create table if not exists public.price_sheet_imports (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  vendor_id      uuid references public.subs_vendors(id) on delete set null,
  effective_date date not null,
  file_url       text,
  status         text not null default 'pending_review',  -- pending_review | applied | discarded
  line_count     integer default 0,
  notes          text,
  created_at     timestamptz not null default now(),
  created_by     uuid
);

-- 2) Per-item price timeline -------------------------------------------------
create table if not exists public.material_price_history (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  material_rate_id uuid not null references public.material_rates(id) on delete cascade,
  vendor_id        uuid references public.subs_vendors(id) on delete set null,
  unit_cost        numeric not null,
  effective_start  date not null,
  effective_end    date,                          -- null = currently active
  source           text not null default 'price_sheet', -- price_sheet | manual | invoice
  source_doc_url   text,
  import_id        uuid references public.price_sheet_imports(id) on delete set null,
  created_at       timestamptz not null default now(),
  created_by       uuid
);

create index if not exists idx_mph_rate_start
  on public.material_price_history (material_rate_id, effective_start desc);
create index if not exists idx_mph_vendor
  on public.material_price_history (vendor_id);
create index if not exists idx_psi_vendor
  on public.price_sheet_imports (vendor_id, effective_date desc);

-- 3) Tenant-stamp triggers (same pattern as every other table) ---------------
drop trigger if exists set_tenant_id on public.price_sheet_imports;
create trigger set_tenant_id before insert on public.price_sheet_imports
  for each row execute function public.set_tenant_id();

drop trigger if exists set_tenant_id on public.material_price_history;
create trigger set_tenant_id before insert on public.material_price_history
  for each row execute function public.set_tenant_id();

-- 4) RLS ---------------------------------------------------------------------
alter table public.price_sheet_imports     enable row level security;
alter table public.material_price_history  enable row level security;

drop policy if exists price_sheet_imports_rw on public.price_sheet_imports;
create policy price_sheet_imports_rw on public.price_sheet_imports
  for all to authenticated
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

drop policy if exists material_price_history_rw on public.material_price_history;
create policy material_price_history_rw on public.material_price_history
  for all to authenticated
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

grant select, insert, update, delete on public.price_sheet_imports    to authenticated;
grant select, insert, update, delete on public.material_price_history to authenticated;

-- 5) price_as_of(): unit_cost effective on a given date ----------------------
--    Falls back to the live material_rates.unit_cost when no history row
--    covers that date (e.g. items that predate any imported sheet).
create or replace function public.price_as_of(p_rate_id uuid, p_date date)
returns numeric
language sql
stable
as $$
  select coalesce(
    (
      select h.unit_cost
      from public.material_price_history h
      where h.material_rate_id = p_rate_id
        and h.effective_start <= p_date
        and (h.effective_end is null or h.effective_end >= p_date)
      order by h.effective_start desc
      limit 1
    ),
    (select unit_cost from public.material_rates where id = p_rate_id)
  );
$$;

-- 6) Storage bucket for uploaded price sheets --------------------------------
insert into storage.buckets (id, name, public)
values ('price-sheets', 'price-sheets', false)
on conflict (id) do nothing;
