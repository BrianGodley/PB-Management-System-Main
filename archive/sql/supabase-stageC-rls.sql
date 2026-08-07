-- ============================================================================
-- STAGE C — Tenant isolation via RLS   (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- The real cutover. After this, a logged-in user only sees/writes rows for
-- THEIR tenant. Run after Stage A + B.
--
-- Handles the two traps:
--   • the resolver auth_tenant_id() is SECURITY DEFINER so policies can read the
--     caller's profile without an RLS chicken-and-egg lockout;
--   • we DROP any pre-existing (old prod) policies on each table before adding
--     one clean tenant policy, so nothing permissive leaks across tenants.
--
-- service_role (edge functions) bypasses RLS automatically — they keep working.
-- Reversible: rollback block at the bottom disables RLS again.
-- ============================================================================

-- 1) Resolver must bypass RLS to read the caller's tenant --------------------
create or replace function public.auth_tenant_id()
returns uuid
language sql stable
security definer
set search_path = ''
as $$
  select tenant_id from public.profiles where id = auth.uid() limit 1;
$$;

-- 2) Every tenant_id table: enable RLS, drop old policies, add tenant policy --
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

    -- remove any existing policies (old prod policies could over-permit)
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = r.tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, r.tbl);
    end loop;

    -- one clean tenant-isolation policy for logged-in users
    execute format(
      'create policy tenant_isolation on public.%I for all to authenticated '
      || 'using (tenant_id = public.auth_tenant_id()) '
      || 'with check (tenant_id = public.auth_tenant_id())',
      r.tbl
    );
  end loop;
end $$;

-- 3) The tenants table itself: a user may read only their own tenant ---------
alter table public.tenants enable row level security;
drop policy if exists tenant_self on public.tenants;
create policy tenant_self on public.tenants
  for select to authenticated
  using (id = public.auth_tenant_id());

-- 4) Verify ------------------------------------------------------------------
select 'tables with RLS enabled' as check, count(*)::text as result
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relrowsecurity
union all
select 'tenant_isolation policies', count(*)::text
  from pg_policies where schemaname='public' and policyname='tenant_isolation';

-- ============================================================================
-- ISOLATION TEST  (prove Company B can't see Picture Build's rows)
-- ----------------------------------------------------------------------------
-- 5a) Create a second tenant:
--     insert into public.tenants (name) values ('Test Co');
--
-- 5b) In Supabase → Authentication → Users → Add user, create a 2nd login,
--     e.g. testco@example.com / a password. Then attach it to Test Co:
--
--     insert into public.profiles (id, email, full_name, role, tenant_id)
--     select u.id, u.email, 'Test Co Admin', 'admin',
--            (select id from public.tenants where name='Test Co')
--       from auth.users u
--      where u.email = 'testco@example.com'
--     on conflict (id) do update
--        set role='admin',
--            tenant_id=(select id from public.tenants where name='Test Co');
--
-- 5c) THE PROOF — two ways:
--   • App: open the staging preview in a private window, log in as
--     testco@example.com → every list (Jobs, Contacts…) should be EMPTY, and
--     none of Picture Build's data appears. Logging back in as your PB admin
--     still shows all PB data. That's tenant isolation working.
--   • SQL (simulate the Test Co user without the app):
--       set local role authenticated;
--       select set_config('request.jwt.claims',
--              json_build_object('sub',(select id::text from auth.users where email='testco@example.com'))::text, true);
--       select count(*) as should_be_zero from public.contacts;   -- expect 0
--       reset role;
-- ============================================================================

-- ============================================================================
-- ROLLBACK (turn isolation back off)
-- ----------------------------------------------------------------------------
-- do $$
-- declare r record;
-- begin
--   for r in select tablename from pg_policies
--            where schemaname='public' and policyname='tenant_isolation'
--   loop
--     execute format('drop policy if exists tenant_isolation on public.%I', r.tablename);
--     execute format('alter table public.%I disable row level security', r.tablename);
--   end loop;
--   drop policy if exists tenant_self on public.tenants;
--   alter table public.tenants disable row level security;
-- end $$;
-- ============================================================================
