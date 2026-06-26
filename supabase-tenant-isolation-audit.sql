-- supabase-tenant-isolation-audit.sql
-- =============================================================================
-- READ-ONLY tenant-isolation audit. Modifies nothing. Run on production.
-- Returns one row per potential gap, tagged with an `issue` category:
--
--   1_RLS_DISABLED        tenant_id present but RLS not enabled  -> READ LEAK
--   2_NO_ISOLATION_POLICY RLS on but no policy references tenant_id -> LEAK
--   3_PERMISSIVE_TRUE     a policy whose USING/CHECK is just TRUE -> defeats isolation
--   4_NO_INSERT_TRIGGER   tenant table missing trg_set_tenant_id -> inserts fail / unscoped
--   5_TENANT_ID_NULLABLE  tenant_id column allows NULL -> orphan/unscoped rows
--   6_UNIQUE_NOT_SCOPED   UNIQUE constraint omits tenant_id -> cross-tenant collision
--   7_NO_TENANT_ID_COLUMN base table has no tenant_id -> confirm it holds no tenant data
--
-- An empty result for categories 1-5 means the DB layer is clean.
-- Category 6 = the constraint work. Category 7 must be eyeballed: platform-global
-- tables (tenants, plans, packages, sam_public_usage, etc.) legitimately appear here.
-- =============================================================================
with
tenant_tables as (
  select table_name from information_schema.columns
   where table_schema = 'public' and column_name = 'tenant_id'
),
base_tables as (
  select table_name from information_schema.tables
   where table_schema = 'public' and table_type = 'BASE TABLE'
)
select '1_RLS_DISABLED' as issue, t.table_name as object,
       'tenant_id present but RLS not enabled' as detail
  from tenant_tables t
  join pg_class c on c.relname = t.table_name
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
 where c.relrowsecurity = false

union all
select '2_NO_ISOLATION_POLICY', t.table_name,
       'RLS on but no policy references tenant_id/auth_tenant_id'
  from tenant_tables t
 where not exists (
   select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = t.table_name
      and (coalesce(p.qual,'') like '%tenant_id%'
        or coalesce(p.qual,'') like '%auth_tenant_id%')
 )

union all
select '3_PERMISSIVE_TRUE', p.tablename || ' :: ' || p.policyname,
       'policy USING/CHECK is TRUE — overrides isolation'
  from pg_policies p
  join tenant_tables t on t.table_name = p.tablename
 where p.schemaname = 'public'
   and (btrim(coalesce(p.qual,'')) = 'true'
     or btrim(coalesce(p.with_check,'')) = 'true')

union all
select '4_NO_INSERT_TRIGGER', t.table_name, 'no trg_set_tenant_id trigger'
  from tenant_tables t
 where not exists (
   select 1 from pg_trigger tg
     join pg_class cl on cl.oid = tg.tgrelid
     join pg_namespace nn on nn.oid = cl.relnamespace and nn.nspname = 'public'
    where cl.relname = t.table_name and tg.tgname = 'trg_set_tenant_id'
 )

union all
select '5_TENANT_ID_NULLABLE', t.table_name, 'tenant_id column is NULLABLE'
  from tenant_tables t
  join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = t.table_name
   and c.column_name = 'tenant_id'
 where c.is_nullable = 'YES'

union all
select '6_UNIQUE_NOT_SCOPED', tc.table_name || ' :: ' || tc.constraint_name,
       string_agg(kcu.column_name, ', ' order by kcu.ordinal_position)
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.table_schema = tc.table_schema
  join tenant_tables t on t.table_name = tc.table_name
 where tc.constraint_type = 'UNIQUE' and tc.table_schema = 'public'
 group by tc.table_name, tc.constraint_name
having string_agg(kcu.column_name, ',') not like '%tenant_id%'

union all
select '7_NO_TENANT_ID_COLUMN', b.table_name,
       'no tenant_id column — confirm this table holds no tenant data'
  from base_tables b
 where b.table_name not in (select table_name from tenant_tables)

order by 1, 2;
