-- ============================================================================
-- Vendor invoices → job expenses + price check   (Phase 2)
-- ----------------------------------------------------------------------------
--   • vendor_invoices       — one row per uploaded invoice (header).
--   • vendor_invoice_lines  — extracted line items, each with the matched
--     material, the master price in effect on the invoice date, and the
--     variance % (the price-check result).
--   • job_expenses          — posted expenses against a job. qb_sync_status
--     queues each row for the QuickBooks pipeline (native is the system of
--     record now; the QBWC push consumes 'pending' rows later).
--   • grants price_as_of() to authenticated so the UI can ask "master price
--     as of the invoice date" per line.
--
-- Depends on supabase-price-history-migration.sql. Idempotent.
-- Run on STAGING first, then PROD.
-- ============================================================================

-- 1) Invoice header ----------------------------------------------------------
create table if not exists public.vendor_invoices (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  job_id        uuid references public.jobs(id) on delete set null,
  vendor_id     uuid references public.subs_vendors(id) on delete set null,
  invoice_no    text,
  invoice_date  date,
  file_url      text,
  subtotal      numeric,
  total         numeric,
  status        text not null default 'pending_review', -- pending_review | posted | discarded
  created_at    timestamptz not null default now(),
  created_by    uuid
);

-- 2) Invoice line items (with price-check result) ----------------------------
create table if not exists public.vendor_invoice_lines (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  invoice_id       uuid not null references public.vendor_invoices(id) on delete cascade,
  material_rate_id uuid references public.material_rates(id) on delete set null,
  description      text not null,
  qty              numeric,
  unit             text,
  unit_price       numeric,
  amount           numeric,
  master_price     numeric,   -- price_as_of(material_rate_id, invoice_date)
  variance_pct     numeric,   -- (unit_price - master_price)/master_price * 100
  matched          boolean not null default false,
  created_at       timestamptz not null default now()
);

-- 3) Job expenses ------------------------------------------------------------
create table if not exists public.job_expenses (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  job_id         uuid references public.jobs(id) on delete set null,
  vendor_id      uuid references public.subs_vendors(id) on delete set null,
  invoice_id     uuid references public.vendor_invoices(id) on delete set null,
  description    text,
  category       text,
  qty            numeric,
  unit           text,
  unit_cost      numeric,
  amount         numeric not null default 0,
  expense_date   date,
  source         text not null default 'invoice', -- invoice | manual
  qb_sync_status text not null default 'pending',  -- pending | synced | skip
  qb_ref         text,
  created_at     timestamptz not null default now(),
  created_by     uuid
);

create index if not exists idx_vi_job     on public.vendor_invoices (job_id, invoice_date desc);
create index if not exists idx_vil_invoice on public.vendor_invoice_lines (invoice_id);
create index if not exists idx_je_job     on public.job_expenses (job_id, expense_date desc);
create index if not exists idx_je_qb      on public.job_expenses (qb_sync_status);

-- 4) Tenant-stamp triggers ---------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['vendor_invoices','vendor_invoice_lines','job_expenses'] loop
    execute format('drop trigger if exists set_tenant_id on public.%I', t);
    execute format('create trigger set_tenant_id before insert on public.%I for each row execute function public.set_tenant_id()', t);
  end loop;
end $$;

-- 5) RLS ---------------------------------------------------------------------
alter table public.vendor_invoices      enable row level security;
alter table public.vendor_invoice_lines enable row level security;
alter table public.job_expenses         enable row level security;

drop policy if exists vendor_invoices_rw on public.vendor_invoices;
create policy vendor_invoices_rw on public.vendor_invoices
  for all to authenticated
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

drop policy if exists vendor_invoice_lines_rw on public.vendor_invoice_lines;
create policy vendor_invoice_lines_rw on public.vendor_invoice_lines
  for all to authenticated
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

drop policy if exists job_expenses_rw on public.job_expenses;
create policy job_expenses_rw on public.job_expenses
  for all to authenticated
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

grant select, insert, update, delete on public.vendor_invoices      to authenticated;
grant select, insert, update, delete on public.vendor_invoice_lines to authenticated;
grant select, insert, update, delete on public.job_expenses         to authenticated;

-- 6) Let the UI call price_as_of() for per-line "as of invoice date" checks --
grant execute on function public.price_as_of(uuid, date) to authenticated;

-- 7) Storage bucket for uploaded invoices ------------------------------------
insert into storage.buckets (id, name, public)
values ('vendor-invoices', 'vendor-invoices', false)
on conflict (id) do nothing;
