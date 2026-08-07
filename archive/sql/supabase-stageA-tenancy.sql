-- ============================================================================
-- STAGE A — Additive tenancy  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Adds a `tenants` table, tags every tenant-scoped table with a nullable
-- `tenant_id`, and backfills Picture Build as tenant #1.
--
-- SAFE + REVERSIBLE: columns are nullable, no FKs, no NOT NULL, no RLS yet, so
-- the app keeps behaving exactly as today. (FK + NOT NULL come in Stage B; RLS
-- in Stage C.) Rollback block is at the bottom.
-- ============================================================================

-- 1) Tenants table -----------------------------------------------------------
create table if not exists public.tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  status     text not null default 'active',   -- active|trialing|past_due|suspended|canceled
  created_at timestamptz default now()
);

-- 2) Picture Build = tenant #1 ----------------------------------------------
insert into public.tenants (name, status)
select 'Picture Build', 'active'
where not exists (select 1 from public.tenants where name = 'Picture Build');

-- 3) Link existing users to PB (membership via profiles.tenant_id) ----------
alter table public.profiles add column if not exists tenant_id uuid;
update public.profiles
   set tenant_id = (select id from public.tenants where name = 'Picture Build' limit 1)
 where tenant_id is null;

-- 4) Add nullable tenant_id to every tenant-scoped table + backfill to PB ----
--    Everything in `public` gets tenant_id EXCEPT the tables listed below.
--    >>> EDIT `global_tables` if you disagree with any classification. <<<
do $$
declare
  pb uuid := (select id from public.tenants where name = 'Picture Build' limit 1);
  r  record;
  global_tables text[] := array[
    -- platform / ops (never tenant-scoped)
    'tenants','plans','subscriptions','tenant_extensions',
    'drive_sync_jobs','drive_sync_queue','drive_sync_files','schema_migrations',
    -- shared PRODUCT content (identical for every customer)
    'help_docs','help_doc_categories','help_videos','help_video_categories',
    'org_chart_templates','org_chart_template_categories',
    'org_chart_template_subcategories','org_chart_wizard_feedback'
  ];
begin
  for r in
    select tablename
      from pg_tables
     where schemaname = 'public'
       and tablename <> 'profiles'              -- handled above
       and tablename <> all(global_tables)
  loop
    execute format('alter table public.%I add column if not exists tenant_id uuid', r.tablename);
    execute format('update public.%I set tenant_id = $1 where tenant_id is null', r.tablename) using pb;
  end loop;
end $$;

-- 5) Verify ------------------------------------------------------------------
-- a) one tenant row
select 'tenants' as check, count(*)::text as result from public.tenants
union all
-- b) all profiles tagged
select 'profiles tagged', count(*)::text from public.profiles where tenant_id is not null
union all
-- c) how many tables now carry tenant_id
select 'tables with tenant_id',
       count(*)::text
  from information_schema.columns
 where table_schema = 'public' and column_name = 'tenant_id'
union all
-- d) sanity: jobs all point to PB, none left null
select 'jobs null tenant_id (should be 0)', count(*)::text
  from public.jobs where tenant_id is null;

-- ============================================================================
-- ROLLBACK (only if needed — drops everything Stage A added)
-- ----------------------------------------------------------------------------
-- do $$
-- declare r record;
-- begin
--   for r in
--     select table_name from information_schema.columns
--      where table_schema='public' and column_name='tenant_id'
--   loop
--     execute format('alter table public.%I drop column if exists tenant_id', r.table_name);
--   end loop;
-- end $$;
-- drop table if exists public.tenants cascade;
-- ============================================================================
