-- ============================================================================
-- PRODUCTION CATCH-UP MIGRATION  (idempotent — safe to run/re-run on PROD)
-- ----------------------------------------------------------------------------
-- Brings a production database fully in line with what the app expects for
-- multi-tenancy, plans/packages, provisioning, billing and the trial lifecycle.
-- Consolidates: provisioning, plans-entitlements, tiers-packages, billing-schema,
-- subscription(+billing), beta-card, provision-baseline, tenant-whitelabel,
-- Stage C RLS, and trial-subscription — every statement guarded so re-running is
-- harmless.
--
-- Assumes Stage A (tenant_id columns on data tables) is already applied — the
-- RLS step below isolates whatever tables currently have a tenant_id column.
-- Run on STAGING first if you like, but this is meant for PRODUCTION.
-- ============================================================================

-- ── 1) TENANTS: every column the app/functions read ─────────────────────────
alter table public.tenants add column if not exists plan_id                text;
alter table public.tenants add column if not exists status                 text default 'trialing';
alter table public.tenants add column if not exists owner_user_id          uuid;
alter table public.tenants add column if not exists trial_ends_at          timestamptz;
alter table public.tenants add column if not exists trial_started_at       timestamptz default now();
alter table public.tenants add column if not exists trial_extended_count   int not null default 0;
alter table public.tenants add column if not exists data_retention_until   timestamptz;
-- billing / payment method (mirrors Helcim)
alter table public.tenants add column if not exists helcim_customer_id     text;
alter table public.tenants add column if not exists helcim_subscription_id text;
alter table public.tenants add column if not exists billing_status         text;
alter table public.tenants add column if not exists card_last4             text;
alter table public.tenants add column if not exists card_brand             text;
alter table public.tenants add column if not exists card_exp               text;
alter table public.tenants add column if not exists current_period_end     timestamptz;
-- white-label
alter table public.tenants add column if not exists brand_name             text;
alter table public.tenants add column if not exists brand_logo_url         text;

-- ── 2) PLANS (tiers) ─────────────────────────────────────────────────────────
create table if not exists public.plans (
  id          text primary key,
  name        text not null,
  rank        int  not null default 0,
  module_keys text[] not null default '{}'
);
alter table public.plans add column if not exists price_monthly  numeric;
alter table public.plans add column if not exists helcim_plan_id text;

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
  set name=excluded.name, rank=excluded.rank,
      price_monthly=excluded.price_monthly, module_keys=excluded.module_keys;

-- retire old plan ids if they still exist
update public.tenants set plan_id='tier1' where plan_id='starter';
update public.tenants set plan_id='tier2' where plan_id='pro';
update public.tenants set plan_id='tier3' where plan_id='enterprise';
delete from public.plans where id in ('starter','pro','enterprise');

grant select on public.plans to anon, authenticated, service_role;

-- ── 3) PACKAGES (add-ons) + tenant_packages ─────────────────────────────────
create table if not exists public.packages (
  id                 text primary key,
  name               text not null,
  price_monthly      numeric,
  requires_tier_rank int not null default 1,
  module_keys        text[] not null default '{}'
);
insert into public.packages (id, name, price_monthly, requires_tier_rank, module_keys) values
  ('contractor', 'Contractor Extension Package', 199, 2, array['/jobs', '/bids', '/design'])
on conflict (id) do update
  set name=excluded.name, price_monthly=excluded.price_monthly,
      requires_tier_rank=excluded.requires_tier_rank, module_keys=excluded.module_keys;
grant select on public.packages to anon, authenticated, service_role;

create table if not exists public.tenant_packages (
  tenant_id  uuid references public.tenants(id) on delete cascade,
  package_id text references public.packages(id),
  created_at timestamptz default now(),
  primary key (tenant_id, package_id)
);
alter table public.tenant_packages enable row level security;

create table if not exists public.package_requests (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  package_id   text not null references public.packages(id),
  status       text not null default 'pending',
  requested_by uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
alter table public.package_requests enable row level security;

create table if not exists public.cancellation_feedback (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  kind       text not null,
  comment    text,
  reason     text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.cancellation_feedback enable row level security;

-- ── 4) company_settings: per-tenant (drop the global singleton) ─────────────
alter table public.company_settings drop constraint if exists single_row;
alter table public.company_settings add column if not exists tenant_id uuid;

-- ── 5) RESOLVERS (SECURITY DEFINER so RLS policies can use them) ────────────
create or replace function public.auth_tenant_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select tenant_id from public.profiles where id = auth.uid() limit 1; $$;

create or replace function public.my_tenant_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select tenant_id from public.profiles where id = auth.uid() limit 1; $$;
grant execute on function public.my_tenant_id() to authenticated;

-- ── 6) PROVISIONING (owner → super_admin, per-tenant company_settings) ──────
create or replace function public.provision_my_tenant(
  p_company text, p_plan text default 'tier1', p_packages text[] default '{}'
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t uuid; plan_id text;
  company text := coalesce(nullif(trim(p_company), ''), 'My Company');
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id=uid and tenant_id is not null) then
    raise exception 'This account is already set up';
  end if;

  select id into plan_id from public.plans where id = p_plan;
  if plan_id is null then plan_id := 'tier1'; end if;

  insert into public.tenants (name, plan_id, status, trial_started_at, trial_ends_at, owner_user_id)
  values (company, plan_id, 'trialing', now(), now() + interval '14 days', uid)
  returning id into t;

  insert into public.profiles (id, email, full_name, role, tenant_id)
  values (uid, (select email from auth.users where id=uid), company, 'super_admin', t)
  on conflict (id) do update set tenant_id=excluded.tenant_id, role='super_admin';

  if array_length(p_packages, 1) is not null then
    insert into public.tenant_packages (tenant_id, package_id)
    select t, pk.id from public.packages pk
     where pk.id = any(p_packages)
       and (select rank from public.plans where id=plan_id) >= pk.requires_tier_rank
    on conflict do nothing;
  end if;

  insert into public.company_settings (id, company_name, tenant_id)
  values ((select coalesce(max(id),0)+1 from public.company_settings), company, t)
  on conflict do nothing;

  return t;
end $$;
grant execute on function public.provision_my_tenant(text, text, text[]) to authenticated;

-- ── 7) ENTITLEMENTS + SUBSCRIPTION READ MODEL ───────────────────────────────
create or replace function public.get_my_modules()
returns text[] language plpgsql stable security definer set search_path = ''
as $$
declare
  t uuid := (select tenant_id from public.profiles where id=auth.uid() limit 1);
  pid text; tier_keys text[]; pkg_keys text[];
begin
  if t is null then return null; end if;
  select plan_id into pid from public.tenants where id=t;
  if pid is null then return null; end if;
  select module_keys into tier_keys from public.plans where id=pid;
  select coalesce(array_agg(distinct k), '{}') into pkg_keys
    from public.tenant_packages tp
    join public.packages pk on pk.id=tp.package_id
    cross join lateral unnest(pk.module_keys) k
   where tp.tenant_id=t;
  return coalesce(tier_keys,'{}') || coalesce(pkg_keys,'{}');
end $$;
grant execute on function public.get_my_modules() to authenticated;

create or replace function public.get_my_subscription()
returns json language plpgsql stable security definer set search_path = ''
as $$
declare
  t uuid := (select tenant_id from public.profiles where id=auth.uid() limit 1);
  result json;
begin
  if t is null then return null; end if;
  select json_build_object(
    'tenant_id', tn.id, 'tenant_name', tn.name, 'status', tn.status,
    'trial_started_at', tn.trial_started_at, 'trial_ends_at', tn.trial_ends_at,
    'trial_extended_count', tn.trial_extended_count, 'data_retention_until', tn.data_retention_until,
    'plan_id', pl.id, 'plan_name', pl.name, 'plan_rank', pl.rank,
    'price_monthly', pl.price_monthly, 'plan_module_keys', pl.module_keys,
    'package_ids', coalesce((select array_agg(tp.package_id) from public.tenant_packages tp where tp.tenant_id=tn.id), '{}'),
    'billing_status', tn.billing_status, 'card_brand', tn.card_brand, 'card_last4', tn.card_last4,
    'card_exp', tn.card_exp, 'current_period_end', tn.current_period_end,
    'has_live_billing', (tn.helcim_subscription_id is not null)
  ) into result
  from public.tenants tn left join public.plans pl on pl.id=tn.plan_id
  where tn.id=t;
  return result;
end $$;
grant execute on function public.get_my_subscription() to authenticated;

-- ── 8) BILLING / TRIAL ACTION RPCs ──────────────────────────────────────────
create or replace function public.set_beta_card(p_brand text, p_last4 text, p_exp text)
returns void language plpgsql security definer set search_path = ''
as $$
declare t uuid := (select tenant_id from public.profiles where id=auth.uid() limit 1);
begin
  if t is null then return; end if;
  update public.tenants
     set card_brand=nullif(p_brand,''),
         card_last4=right(regexp_replace(coalesce(p_last4,''),'\D','','g'),4),
         card_exp=nullif(p_exp,''), billing_status=coalesce(billing_status,'trialing'),
         updated_at=now()
   where id=t and helcim_subscription_id is null;
end $$;
grant execute on function public.set_beta_card(text,text,text) to authenticated;

create or replace function public.request_package(p_package_id text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare t uuid := (select tenant_id from public.profiles where id=auth.uid() limit 1); rid uuid;
begin
  if t is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from public.packages where id=p_package_id) then raise exception 'Unknown package'; end if;
  if exists (select 1 from public.tenant_packages where tenant_id=t and package_id=p_package_id) then return null; end if;
  select id into rid from public.package_requests where tenant_id=t and package_id=p_package_id and status='pending' limit 1;
  if rid is not null then return rid; end if;
  insert into public.package_requests (tenant_id, package_id, requested_by) values (t, p_package_id, auth.uid()) returning id into rid;
  return rid;
end $$;
grant execute on function public.request_package(text) to authenticated;

create or replace function public._billing_admin_tenant()
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare t uuid; r text;
begin
  select tenant_id, role into t, r from public.profiles where id=auth.uid() limit 1;
  if t is null then raise exception 'Not authenticated'; end if;
  if r not in ('owner','admin','super_admin') then raise exception 'Only an owner or admin can manage the subscription.'; end if;
  return t;
end $$;

create or replace function public.extend_my_trial(p_comment text default null)
returns json language plpgsql security definer set search_path = ''
as $$
declare t uuid := public._billing_admin_tenant(); st text; ext int;
begin
  select status, trial_extended_count into st, ext from public.tenants where id=t;
  if st <> 'trialing' then raise exception 'Only an active trial can be extended.'; end if;
  if ext >= 1 then raise exception 'Your trial has already been extended once.'; end if;
  update public.tenants
     set trial_started_at=now(), trial_ends_at=now()+interval '14 days',
         trial_extended_count=trial_extended_count+1, status='trialing', updated_at=now()
   where id=t;
  insert into public.cancellation_feedback (tenant_id, kind, comment, created_by)
  values (t, 'trial_extend', nullif(p_comment,''), auth.uid());
  return (select json_build_object('trial_ends_at', trial_ends_at, 'trial_extended_count', trial_extended_count)
            from public.tenants where id=t);
end $$;
grant execute on function public.extend_my_trial(text) to authenticated;

create or replace function public.cancel_my_trial(p_comment text default null)
returns json language plpgsql security definer set search_path = ''
as $$
declare t uuid := public._billing_admin_tenant(); st text;
begin
  select status into st from public.tenants where id=t;
  if st <> 'trialing' then raise exception 'No active trial to cancel.'; end if;
  insert into public.cancellation_feedback (tenant_id, kind, comment, created_by)
  values (t, 'trial_cancel', nullif(p_comment,''), auth.uid());
  update public.tenants set status='canceled', data_retention_until=now()+interval '60 days', updated_at=now() where id=t;
  return (select json_build_object('status', status, 'data_retention_until', data_retention_until) from public.tenants where id=t);
end $$;
grant execute on function public.cancel_my_trial(text) to authenticated;

create or replace function public.cancel_my_subscription(p_reason text)
returns json language plpgsql security definer set search_path = ''
as $$
declare t uuid := public._billing_admin_tenant();
begin
  insert into public.cancellation_feedback (tenant_id, kind, reason, created_by)
  values (t, 'subscription_cancel', nullif(p_reason,''), auth.uid());
  update public.tenants set status='canceled', billing_status='canceled', data_retention_until=now()+interval '60 days', updated_at=now() where id=t;
  return (select json_build_object('status', status, 'data_retention_until', data_retention_until) from public.tenants where id=t);
end $$;
grant execute on function public.cancel_my_subscription(text) to authenticated;

-- ── 9) RLS — isolate every tenant_id table; per-table read policies ─────────
do $$
declare r record; pol record;
begin
  for r in
    select col.table_name as tbl
      from information_schema.columns col
      join pg_class c on c.relname=col.table_name
      join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where col.table_schema='public' and col.column_name='tenant_id'
       and col.table_name<>'tenants' and c.relkind='r'
  loop
    execute format('alter table public.%I enable row level security', r.tbl);
    for pol in select policyname from pg_policies where schemaname='public' and tablename=r.tbl loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, r.tbl);
    end loop;
    execute format(
      'create policy tenant_isolation on public.%I for all to authenticated '
      || 'using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id())',
      r.tbl);
  end loop;
end $$;

-- read policies for the helper tables (own tenant)
drop policy if exists tenant_packages_read on public.tenant_packages;
create policy tenant_packages_read on public.tenant_packages for select to authenticated using (tenant_id = public.auth_tenant_id());
drop policy if exists package_requests_read on public.package_requests;
create policy package_requests_read on public.package_requests for select to authenticated using (tenant_id = public.auth_tenant_id());
drop policy if exists cancellation_feedback_read on public.cancellation_feedback;
create policy cancellation_feedback_read on public.cancellation_feedback for select to authenticated using (tenant_id = public.auth_tenant_id());

alter table public.tenants enable row level security;
drop policy if exists tenant_self on public.tenants;
create policy tenant_self on public.tenants for select to authenticated using (id = public.auth_tenant_id());

-- ── 10) BACKFILLS ────────────────────────────────────────────────────────────
-- owners locked out of admin → super_admin
update public.profiles set role='super_admin' where role='owner';

-- every tenant gets exactly one company_settings row
insert into public.company_settings (id, company_name, tenant_id)
select (select coalesce(max(id),0) from public.company_settings) + row_number() over (order by tn.id),
       tn.name, tn.id
  from public.tenants tn
 where not exists (select 1 from public.company_settings cs where cs.tenant_id=tn.id);

-- trial start dates for existing trials
update public.tenants
   set trial_started_at = coalesce(trial_started_at, trial_ends_at - interval '14 days', now())
 where status='trialing' and trial_started_at is null;

-- ── 11) PICTURE BUILD = full subscription + test card ───────────────────────
update public.tenants
   set plan_id='tier3', status='active', billing_status='active',
       card_brand='Visa', card_last4='4242', card_exp='12/2030',
       current_period_end=coalesce(current_period_end, date_trunc('month', now()) + interval '1 month')
 where name='Picture Build';
insert into public.tenant_packages (tenant_id, package_id)
select id, 'contractor' from public.tenants where name='Picture Build'
on conflict do nothing;

-- ── 12) VERIFY ───────────────────────────────────────────────────────────────
select 'tables with RLS enabled' as check, count(*)::text as result
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relrowsecurity
union all
select 'tenant_isolation policies', count(*)::text
  from pg_policies where schemaname='public' and policyname='tenant_isolation'
union all
select 'tenants missing company_settings', count(*)::text
  from public.tenants tn where not exists (select 1 from public.company_settings cs where cs.tenant_id=tn.id);
