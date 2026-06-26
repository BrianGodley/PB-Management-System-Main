-- ============================================================================
-- TENANT ISOLATION — DIAGNOSE + FIX   ⚠️ RUN ON PRODUCTION (this is the leak)
-- ----------------------------------------------------------------------------
-- Symptom: a brand-new trial tenant can see Picture Build's data. That only
-- happens when RLS tenant-isolation is NOT actually enforced on the data tables.
-- This script (a) reports the current state, (b) re-applies isolation on every
-- table that has a tenant_id column, and (c) lists tables that have NO tenant_id
-- (those are global — review them; if any hold tenant data, they leak).
--
-- service_role / edge functions bypass RLS and keep working. Safe to re-run.
-- Run on STAGING first if you want, but the live leak is on PRODUCTION.
-- ============================================================================

-- ── PART 1: DIAGNOSE (read-only) ────────────────────────────────────────────
-- Look at this output. Danger = (has_tenant_id = true AND rls_on = false):
-- those tables are leaking across tenants right now.
select
  c.relname                                                   as table_name,
  exists(select 1 from information_schema.columns col
          where col.table_schema='public' and col.table_name=c.relname
            and col.column_name='tenant_id')                  as has_tenant_id,
  c.relrowsecurity                                            as rls_on,
  exists(select 1 from pg_policies p
          where p.schemaname='public' and p.tablename=c.relname
            and p.policyname='tenant_isolation')              as has_tenant_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relkind='r'
order by has_tenant_id desc, rls_on asc, c.relname;

-- ── PART 2: FIX — enforce isolation on every tenant_id table ────────────────
-- 2a) Resolver (SECURITY DEFINER so policies can read the caller's tenant).
create or replace function public.auth_tenant_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select tenant_id from public.profiles where id = auth.uid() limit 1;
$$;

-- 2b) For every base table that HAS a tenant_id column (except tenants):
--     enable RLS, drop any pre-existing policies, add one clean tenant policy.
do $$
declare r record; pol record;
begin
  for r in
    select col.table_name as tbl
      from information_schema.columns col
      join pg_class c on c.relname = col.table_name
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where col.table_schema = 'public'
       and col.column_name = 'tenant_id'
       and col.table_name <> 'tenants'
       and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', r.tbl);
    for pol in
      select policyname from pg_policies where schemaname='public' and tablename=r.tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, r.tbl);
    end loop;
    execute format(
      'create policy tenant_isolation on public.%I for all to authenticated '
      || 'using (tenant_id = public.auth_tenant_id()) '
      || 'with check (tenant_id = public.auth_tenant_id())',
      r.tbl
    );
  end loop;
end $$;

-- 2c) tenants table: a user may read only their own tenant row.
alter table public.tenants enable row level security;
drop policy if exists tenant_self on public.tenants;
create policy tenant_self on public.tenants
  for select to authenticated using (id = public.auth_tenant_id());

-- ── PART 3: REVIEW — tables with NO tenant_id (global / potential leak) ──────
-- Reference tables (plans, packages, module rate catalogs, etc.) legitimately
-- have no tenant_id and are meant to be shared. But if any table in THIS list
-- actually holds per-company data (jobs, clients, contacts, estimates,
-- employees, org_nodes, …), it is NOT isolated and must get a tenant_id column
-- + backfill + RLS. Send me this list and I'll write the migration.
select c.relname as table_without_tenant_id
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
  and not exists (
    select 1 from information_schema.columns col
     where col.table_schema='public' and col.table_name=c.relname
       and col.column_name='tenant_id')
order by 1;

-- ── PART 4: CONFIRM ─────────────────────────────────────────────────────────
select 'tables with RLS enabled' as check, count(*)::text as result
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relrowsecurity
union all
select 'tenant_isolation policies', count(*)::text
  from pg_policies where schemaname='public' and policyname='tenant_isolation';
