-- ============================================================================
-- TIERS + PACKAGES  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Final model: three stacking tiers (flat, unlimited users) + add-on packages.
-- Supersedes the starter/pro/enterprise rows from supabase-plans-entitlements.sql.
-- Prices: Tier 1 $79, Tier 2 $229, Tier 3 $389, Contractor +$199.
-- ============================================================================

-- 0) Ensure pricing columns exist on plans (also in supabase-billing-schema.sql)
alter table public.plans add column if not exists price_monthly  numeric;
alter table public.plans add column if not exists helcim_plan_id text;

-- 1) Tiers (cumulative module_keys) ------------------------------------------
insert into public.plans (id, name, rank, price_monthly, module_keys) values
  ('tier1', 'Tier 1 — Base', 1, 79, array[
     '/', '/org-chart', '/statistics', '/edocuments', '/hr'
   ]),
  ('tier2', 'Tier 2', 2, 229, array[
     '/', '/org-chart', '/statistics', '/edocuments', '/hr',
     '/training', '/contacts', '/clients', '/workflows'
   ]),
  ('tier3', 'Tier 3', 3, 389, array[
     '/', '/org-chart', '/statistics', '/edocuments', '/hr',
     '/training', '/contacts', '/clients', '/workflows',
     '/accounting', '/collections', '/portal/subs', '/equipment-tracking'
   ])
on conflict (id) do update
  set name = excluded.name, rank = excluded.rank,
      price_monthly = excluded.price_monthly, module_keys = excluded.module_keys;

-- 2) Add-on packages ----------------------------------------------------------
create table if not exists public.packages (
  id                 text primary key,
  name               text not null,
  price_monthly      numeric,
  requires_tier_rank int not null default 1,   -- min tier rank required to buy
  module_keys        text[] not null default '{}'
);
insert into public.packages (id, name, price_monthly, requires_tier_rank, module_keys) values
  ('contractor', 'Contractor Extension Package', 199, 2, array['/jobs', '/bids', '/design'])
on conflict (id) do update
  set name = excluded.name, price_monthly = excluded.price_monthly,
      requires_tier_rank = excluded.requires_tier_rank, module_keys = excluded.module_keys;
grant select on public.packages to anon, authenticated, service_role;

-- 3) Which packages each tenant has ------------------------------------------
create table if not exists public.tenant_packages (
  tenant_id  uuid references public.tenants(id) on delete cascade,
  package_id text references public.packages(id),
  created_at timestamptz default now(),
  primary key (tenant_id, package_id)
);
alter table public.tenant_packages enable row level security;
drop policy if exists tenant_packages_read on public.tenant_packages;
create policy tenant_packages_read on public.tenant_packages
  for select to authenticated using (tenant_id = public.auth_tenant_id());

-- 4) Migrate existing tenants off the old plan ids ---------------------------
update public.tenants set plan_id = 'tier1' where plan_id = 'starter';
update public.tenants set plan_id = 'tier2' where plan_id = 'pro';
update public.tenants set plan_id = 'tier3' where plan_id = 'enterprise';
-- Picture Build runs the contractor workflow → give it the Contractor package.
insert into public.tenant_packages (tenant_id, package_id)
select id, 'contractor' from public.tenants where name = 'Picture Build'
on conflict do nothing;

-- 5) Drop the now-unreferenced old plan rows ---------------------------------
delete from public.plans where id in ('starter', 'pro', 'enterprise');

-- 6) Effective modules = tier module_keys ∪ all package module_keys ----------
create or replace function public.get_my_modules()
returns text[] language plpgsql stable security definer set search_path = ''
as $$
declare
  t uuid := (select tenant_id from public.profiles where id = auth.uid() limit 1);
  pid text;
  tier_keys text[];
  pkg_keys  text[];
begin
  if t is null then return null; end if;                 -- fail-open
  select plan_id into pid from public.tenants where id = t;
  if pid is null then return null; end if;               -- no plan = all (fail-open)
  select module_keys into tier_keys from public.plans where id = pid;
  select coalesce(array_agg(distinct k), '{}')
    into pkg_keys
    from public.tenant_packages tp
    join public.packages pk on pk.id = tp.package_id
    cross join lateral unnest(pk.module_keys) k
   where tp.tenant_id = t;
  return coalesce(tier_keys, '{}') || coalesce(pkg_keys, '{}');
end $$;
grant execute on function public.get_my_modules() to authenticated;

-- 7) Provisioning: default to tier1, accept optional packages (enforce tier rank)
create or replace function public.provision_my_tenant(
  p_company  text,
  p_plan     text default 'tier1',
  p_packages text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t   uuid;
  plan_id text;
  company text := coalesce(nullif(trim(p_company), ''), 'My Company');
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid and tenant_id is not null) then
    raise exception 'This account is already set up';
  end if;

  select id into plan_id from public.plans where id = p_plan;
  if plan_id is null then plan_id := 'tier1'; end if;

  insert into public.tenants (name, plan_id, status, trial_ends_at, owner_user_id)
  values (company, plan_id, 'trialing', now() + interval '14 days', uid)
  returning id into t;

  insert into public.profiles (id, email, full_name, role, tenant_id)
  values (uid, (select email from auth.users where id = uid), company, 'owner', t)
  on conflict (id) do update set tenant_id = excluded.tenant_id, role = 'owner';

  -- attach requested packages that the chosen tier qualifies for
  if array_length(p_packages, 1) is not null then
    insert into public.tenant_packages (tenant_id, package_id)
    select t, pk.id from public.packages pk
     where pk.id = any(p_packages)
       and (select rank from public.plans where id = plan_id) >= pk.requires_tier_rank
    on conflict do nothing;
  end if;

  return t;
end $$;
grant execute on function public.provision_my_tenant(text, text, text[]) to authenticated;
