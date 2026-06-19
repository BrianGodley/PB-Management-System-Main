-- ============================================================================
-- RLS / TENANT_ID COVERAGE AUDIT   (read-only — run anytime, changes nothing)
-- ----------------------------------------------------------------------------
-- Run on a database AFTER Stage A + C (staging now; prod after cutover) to
-- confirm every tenant-scoped table is actually isolated. Each query should
-- return ZERO rows in a fully-migrated database. Any rows = a gap to fix.
-- ============================================================================

-- 1) GAP: tables that HAVE tenant_id but RLS is NOT enabled.
--    These leak across tenants (no row filter). Expect 0 rows.
select c.relname as table_without_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relkind = 'r'
   and c.relrowsecurity = false
   and exists (
     select 1 from information_schema.columns col
      where col.table_schema = 'public'
        and col.table_name = c.relname
        and col.column_name = 'tenant_id'
   )
 order by 1;

-- 2) GAP: tables with tenant_id + RLS enabled but NO policy at all.
--    RLS-on with no policy = denies everyone (app breaks). Expect 0 rows.
select c.relname as table_rls_on_no_policy
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relkind = 'r'
   and c.relrowsecurity = true
   and exists (
     select 1 from information_schema.columns col
      where col.table_schema = 'public' and col.table_name = c.relname
        and col.column_name = 'tenant_id'
   )
   and not exists (
     select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname
   )
 order by 1;

-- 3) GAP: tenant-scoped tables whose tenant_id is still nullable.
--    After Stage B these should all be NOT NULL. Expect 0 rows.
select table_name as tenant_id_nullable
  from information_schema.columns
 where table_schema = 'public'
   and column_name = 'tenant_id'
   and is_nullable = 'YES'
 order by 1;

-- 4) REVIEW (not necessarily a bug): public tables WITHOUT a tenant_id column.
--    Some are global by design (plans, packages, etc.). Eyeball this list and
--    confirm each one is intentionally global, not a table that was missed.
select c.relname as table_without_tenant_id
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relkind = 'r'
   and not exists (
     select 1 from information_schema.columns col
      where col.table_schema = 'public' and col.table_name = c.relname
        and col.column_name = 'tenant_id'
   )
 order by 1;

-- 5) INFO: any tenant-scoped table with rows whose tenant_id is NULL.
--    (Run per-table if #3 ever shows a nullable column slipped through.)
--    Example:  select count(*) from public.clients where tenant_id is null;
