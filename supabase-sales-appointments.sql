-- ============================================================================
-- SALES APPOINTMENTS  (Sales hub → Calendar tab)
-- ----------------------------------------------------------------------------
-- A scheduling system for sales meetings: a consultant/employee meets a
-- prospect (client) at a date/time. Drives the Sales → Calendar month/week
-- views, filterable by consultant.
--
-- Tenant-isolated (created after the multi-tenant cutover): tenant_id +
-- auto-fill trigger + NOT NULL + FK + tenant-scoped RLS, mirroring the other
-- tenant tables.
--
-- Also adds employees.is_consultant so the booking form can show consultants
-- first, then all other employees.
--
-- Requires Stage A/B (tenants, public.auth_tenant_id(), public.set_tenant_id()).
-- Run on prod (live) and staging. Safe to re-run.
-- ============================================================================

-- ── Consultant flag on employees ───────────────────────────────────────────
alter table public.employees
  add column if not exists is_consultant boolean not null default false;

-- ── Appointments table ──────────────────────────────────────────────────────
create table if not exists public.sales_appointments (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid,
  title            text not null default 'Meeting',
  client_id        uuid references public.clients(id) on delete set null,
  employee_id      uuid references public.employees(id) on delete set null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  location         text,
  notes            text,
  status           text not null default 'scheduled',  -- scheduled | completed | canceled | no_show
  created_by_email text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── Tenant plumbing ─────────────────────────────────────────────────────────
drop trigger if exists trg_set_tenant_id on public.sales_appointments;
create trigger trg_set_tenant_id before insert on public.sales_appointments
  for each row execute function public.set_tenant_id();

do $$
begin
  if exists (select 1 from public.sales_appointments where tenant_id is null) then
    delete from public.sales_appointments where tenant_id is null;
  end if;
  alter table public.sales_appointments alter column tenant_id set not null;
exception when others then null;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_appointments_tenant_id_fkey') then
    alter table public.sales_appointments
      add constraint sales_appointments_tenant_id_fkey foreign key (tenant_id) references public.tenants(id);
  end if;
end $$;

-- ── Indexes for calendar range + filter queries ────────────────────────────
create index if not exists sales_appointments_tenant_start_idx
  on public.sales_appointments (tenant_id, starts_at);
create index if not exists sales_appointments_employee_idx
  on public.sales_appointments (employee_id);
create index if not exists sales_appointments_client_idx
  on public.sales_appointments (client_id);

-- ── RLS: tenant-scoped ──────────────────────────────────────────────────────
alter table public.sales_appointments enable row level security;
drop policy if exists sales_appointments_tenant on public.sales_appointments;
create policy sales_appointments_tenant on public.sales_appointments for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

grant all on public.sales_appointments to anon, authenticated, service_role;
