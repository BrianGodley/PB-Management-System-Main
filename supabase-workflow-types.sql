-- ============================================================================
-- WORKFLOW TYPES  (user-defined, per-tenant workflow templates)
-- ----------------------------------------------------------------------------
-- Each type has a name + an ordered list of "objects" (template steps) stored
-- as jsonb: [{ id, kind, label, icon, purpose }]. Picking a type when building
-- a workflow pre-loads its objects as steps.
--
-- Tenant-isolated from the start (created after the cutover): tenant_id +
-- auto-fill trigger + NOT NULL + FK + tenant-scoped RLS, mirroring the other
-- tenant tables. The app self-seeds default types per tenant on first load, so
-- no seed is needed here.
--
-- Requires Stage A/B (tenants, public.auth_tenant_id(), public.set_tenant_id()).
-- Run on prod (live) and staging. Safe to re-run.
-- ============================================================================

create table if not exists public.workflow_types (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid,
  name        text not null,
  objects     jsonb not null default '[]'::jsonb,
  sort_order  int  not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-fill tenant_id on insert (app inserts without it) + NOT NULL + FK.
drop trigger if exists trg_set_tenant_id on public.workflow_types;
create trigger trg_set_tenant_id before insert on public.workflow_types
  for each row execute function public.set_tenant_id();

do $$
begin
  if exists (select 1 from public.workflow_types where tenant_id is null) then
    -- shouldn't happen on a fresh table, but guard before NOT NULL
    delete from public.workflow_types where tenant_id is null;
  end if;
  alter table public.workflow_types alter column tenant_id set not null;
exception when others then null;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workflow_types_tenant_id_fkey') then
    alter table public.workflow_types
      add constraint workflow_types_tenant_id_fkey foreign key (tenant_id) references public.tenants(id);
  end if;
end $$;

-- RLS: tenant-scoped.
alter table public.workflow_types enable row level security;
drop policy if exists workflow_types_tenant on public.workflow_types;
create policy workflow_types_tenant on public.workflow_types for all to authenticated
  using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

grant all on public.workflow_types to anon, authenticated, service_role;
