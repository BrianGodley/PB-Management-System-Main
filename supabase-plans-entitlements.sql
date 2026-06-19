-- ============================================================================
-- PLANS & ENTITLEMENTS  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Defines Starter / Pro / Enterprise tiers and which modules each unlocks.
-- A tenant's plan controls which nav items / routes are available in the app.
-- Backward-compatible: a tenant with NO plan = all modules (today's behavior).
-- ============================================================================

-- 1) Plans -------------------------------------------------------------------
create table if not exists public.plans (
  id          text primary key,           -- 'starter' | 'pro' | 'enterprise'
  name        text not null,
  rank        int  not null default 0,
  module_keys text[] not null default '{}'  -- nav paths this tier unlocks
);

insert into public.plans (id, name, rank, module_keys) values
  ('starter', 'Starter', 1, array[
     '/', '/jobs', '/contacts', '/clients', '/edocuments'
   ]),
  ('pro', 'Pro', 2, array[
     '/', '/jobs', '/contacts', '/clients', '/edocuments',
     '/bids', '/design', '/workflows', '/statistics', '/org-chart', '/collections'
   ]),
  ('enterprise', 'Enterprise', 3, array[
     '/', '/jobs', '/contacts', '/clients', '/edocuments',
     '/bids', '/design', '/workflows', '/statistics', '/org-chart', '/collections',
     '/hr', '/training', '/accounting', '/equipment-tracking', '/portal/subs'
   ])
on conflict (id) do update
  set name = excluded.name, rank = excluded.rank, module_keys = excluded.module_keys;

-- 2) Attach a plan to tenants; Picture Build = Enterprise (everything) --------
alter table public.tenants add column if not exists plan_id text references public.plans(id);
update public.tenants set plan_id = 'enterprise' where name = 'Picture Build' and plan_id is null;

-- plans is shared/global reference data — readable by all app roles, no RLS.
grant select on public.plans to anon, authenticated, service_role;

-- 3) RPC: the module keys unlocked for the CURRENT user's tenant -------------
--    Returns NULL when the tenant has no plan -> app treats that as "all on".
create or replace function public.get_my_modules()
returns text[]
language sql stable security definer
set search_path = ''
as $$
  select p.module_keys
    from public.profiles pr
    join public.tenants  t on t.id = pr.tenant_id
    join public.plans    p on p.id = t.plan_id
   where pr.id = auth.uid()
   limit 1;
$$;
grant execute on function public.get_my_modules() to authenticated;

-- 4) (Optional) helper to see a tenant's plan
-- select t.name, t.plan_id, p.module_keys
--   from public.tenants t left join public.plans p on p.id = t.plan_id;

-- ============================================================================
-- TEST TIP: set Test Co to Starter so you can SEE gating hide modules:
--   update public.tenants set plan_id='starter' where name='Test Co';
-- Then log in as testco@example.com — only Dashboard/Jobs/Contacts/
-- Opportunities/Documents should appear in the menu.
-- ============================================================================
