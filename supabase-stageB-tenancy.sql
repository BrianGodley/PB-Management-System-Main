-- ============================================================================
-- STAGE B — Constrain tenancy  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Run AFTER Stage A. Adds, for every tenant-scoped table:
--   1) an auto-fill trigger so inserts that omit tenant_id still work
--      (keeps the app running with NO code changes during the PB-only period),
--   2) NOT NULL on tenant_id,
--   3) a FOREIGN KEY tenant_id -> tenants(id).
-- Safe + reversible (rollback at bottom). Still no RLS — that's Stage C.
-- ============================================================================

-- 1) Resolver: the current user's tenant (also used by RLS in Stage C) --------
create or replace function public.auth_tenant_id()
returns uuid language sql stable
set search_path = ''
as $$
  select tenant_id from public.profiles where id = auth.uid() limit 1;
$$;

-- 2) Auto-fill tenant_id on insert when the caller didn't set it --------------
--    Order of preference: explicit value -> logged-in user's tenant ->
--    (migration only) the single existing tenant. Once there are 2+ tenants,
--    server-side inserts must set tenant_id explicitly (we'll update edge
--    functions before going multi-tenant).
create or replace function public.set_tenant_id()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare t uuid;
begin
  if new.tenant_id is not null then
    return new;
  end if;
  t := public.auth_tenant_id();
  if t is null and (select count(*) from public.tenants) = 1 then
    select id into t from public.tenants;
  end if;
  new.tenant_id := t;
  return new;
end $$;

-- 3) Apply trigger + NOT NULL + FK to every tenant_id table ------------------
do $$
declare
  r record;
  cname text;
  pb uuid := (select id from public.tenants order by created_at limit 1);
begin
  for r in
    select table_name from information_schema.columns
     where table_schema = 'public' and column_name = 'tenant_id'
       and table_name <> 'tenants'
  loop
    -- safety: re-stamp any stragglers so NOT NULL can't fail
    execute format('update public.%I set tenant_id = $1 where tenant_id is null', r.table_name) using pb;

    -- a) auto-fill trigger (idempotent)
    execute format('drop trigger if exists trg_set_tenant_id on public.%I', r.table_name);
    execute format('create trigger trg_set_tenant_id before insert on public.%I for each row execute function public.set_tenant_id()', r.table_name);

    -- b) NOT NULL
    execute format('alter table public.%I alter column tenant_id set not null', r.table_name);

    -- c) FK to tenants (idempotent)
    cname := left(r.table_name, 50) || '_tenant_id_fkey';
    if not exists (select 1 from pg_constraint where conname = cname) then
      execute format('alter table public.%I add constraint %I foreign key (tenant_id) references public.tenants(id)',
                     r.table_name, cname);
    end if;
  end loop;
end $$;

-- 4) Verify ------------------------------------------------------------------
select 'tenant_id NOT NULL cols' as check, count(*)::text as result
  from information_schema.columns
 where table_schema='public' and column_name='tenant_id' and is_nullable='NO'
union all
select 'tenant_id foreign keys', count(*)::text
  from pg_constraint where conname like '%\_tenant\_id\_fkey' escape '\'
union all
select 'auto-fill triggers', count(*)::text
  from pg_trigger where tgname = 'trg_set_tenant_id';

-- ============================================================================
-- ROLLBACK (only if needed)
-- ----------------------------------------------------------------------------
-- do $$
-- declare r record; cname text;
-- begin
--   for r in select table_name from information_schema.columns
--            where table_schema='public' and column_name='tenant_id' and table_name<>'tenants'
--   loop
--     execute format('drop trigger if exists trg_set_tenant_id on public.%I', r.table_name);
--     execute format('alter table public.%I alter column tenant_id drop not null', r.table_name);
--     cname := left(r.table_name,50) || '_tenant_id_fkey';
--     execute format('alter table public.%I drop constraint if exists %I', r.table_name, cname);
--   end loop;
-- end $$;
-- drop function if exists public.set_tenant_id();
-- -- (keep public.auth_tenant_id(); Stage C needs it)
-- ============================================================================
