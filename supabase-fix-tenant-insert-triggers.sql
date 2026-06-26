-- supabase-fix-tenant-insert-triggers.sql
-- =============================================================================
-- PROBLEM: A brand-new trial tenant cannot create its first Weekly FP week.
--   collection_weeks (and other tables) gained a tenant_id column + RLS
--   isolation when multi-tenancy was added, but the trg_set_tenant_id auto-fill
--   trigger is missing on some of them on production. An INSERT that omits
--   tenant_id then leaves it NULL, which violates NOT NULL / the tenant_isolation
--   WITH CHECK (tenant_id = auth_tenant_id()), so the insert fails.
--
-- FIX: re-create the auth_tenant_id() + set_tenant_id() helpers and (re)attach
--   the BEFORE INSERT trigger to EVERY public table that has a tenant_id column.
--   Idempotent — safe to run repeatedly. No data is modified.
-- =============================================================================

-- 1) Tenant of the current user (SECURITY DEFINER so RLS can't hide the row) ----
create or replace function public.auth_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid() limit 1;
$$;

-- 2) Auto-fill tenant_id on insert when the caller didn't set it ----------------
create or replace function public.set_tenant_id()
returns trigger language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if new.tenant_id is not null then
    return new;                 -- caller (e.g. an edge function) set it explicitly
  end if;
  t := public.auth_tenant_id();
  if t is null then
    return new;                 -- no tenant context; let constraints decide
  end if;
  new.tenant_id := t;
  return new;
end;
$$;

-- 3) (Re)attach the trigger to every table that has a tenant_id column ----------
do $$
declare r record;
begin
  for r in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and c.column_name = 'tenant_id'
       and t.table_type = 'BASE TABLE'
       and c.table_name <> 'tenants'
  loop
    execute format('drop trigger if exists trg_set_tenant_id on public.%I', r.table_name);
    execute format(
      'create trigger trg_set_tenant_id before insert on public.%I
         for each row execute function public.set_tenant_id()', r.table_name);
  end loop;
end $$;

-- 4) Verify -------------------------------------------------------------------
-- Which collections tables have tenant_id + the trigger now?
select
  c.table_name,
  exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name=c.table_name and column_name='tenant_id'
  ) as has_tenant_id,
  exists (
    select 1 from pg_trigger tg
      join pg_class cl on cl.oid = tg.tgrelid
      join pg_namespace n on n.oid = cl.relnamespace
     where n.nspname='public' and cl.relname=c.table_name and tg.tgname='trg_set_tenant_id'
  ) as has_trigger
from (values
  ('collection_weeks'),('collection_rows'),('collection_payables'),('collection_financial')
) as c(table_name);

-- Total tables now carrying the auto-fill trigger
select 'tables with trg_set_tenant_id' as check,
       count(distinct cl.relname)::text as result
  from pg_trigger tg
  join pg_class cl on cl.oid = tg.tgrelid
  join pg_namespace n on n.oid = cl.relnamespace
 where n.nspname='public' and tg.tgname='trg_set_tenant_id';
