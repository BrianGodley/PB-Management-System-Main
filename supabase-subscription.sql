-- ============================================================================
-- SUBSCRIPTION + BILLING READ MODEL  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Powers Settings → Subscription and Settings → Billing tabs.
--   • get_my_subscription()  — current tenant's plan, price, status, trial end,
--                              and the add-on package ids it has.
--   • package_requests        — a tenant's "request to enable" an add-on app.
--   • request_package(id)     — record a pending request (does NOT charge or
--                               auto-enable; SoftCake enables after billing).
-- Reference data (plans, packages) is already granted SELECT to authenticated.
-- ============================================================================

-- 1) Current tenant's subscription snapshot ----------------------------------
create or replace function public.get_my_subscription()
returns json
language plpgsql stable security definer set search_path = ''
as $$
declare
  t uuid := (select tenant_id from public.profiles where id = auth.uid() limit 1);
  result json;
begin
  if t is null then return null; end if;
  select json_build_object(
    'tenant_id',      tn.id,
    'tenant_name',    tn.name,
    'status',         tn.status,
    'trial_ends_at',  tn.trial_ends_at,
    'plan_id',        pl.id,
    'plan_name',      pl.name,
    'plan_rank',      pl.rank,
    'price_monthly',  pl.price_monthly,
    'plan_module_keys', pl.module_keys,
    'package_ids', coalesce(
        (select array_agg(tp.package_id)
           from public.tenant_packages tp where tp.tenant_id = tn.id), '{}')
  )
  into result
  from public.tenants tn
  left join public.plans pl on pl.id = tn.plan_id
  where tn.id = t;
  return result;
end $$;
grant execute on function public.get_my_subscription() to authenticated;

-- 2) Add-on requests ----------------------------------------------------------
create table if not exists public.package_requests (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  package_id   text not null references public.packages(id),
  status       text not null default 'pending',   -- pending | enabled | declined
  requested_by uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
alter table public.package_requests enable row level security;

drop policy if exists package_requests_read on public.package_requests;
create policy package_requests_read on public.package_requests
  for select to authenticated using (tenant_id = public.auth_tenant_id());

-- 3) Request an add-on (records intent; no charge, no auto-enable) ------------
create or replace function public.request_package(p_package_id text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  t   uuid := (select tenant_id from public.profiles where id = auth.uid() limit 1);
  rid uuid;
begin
  if t is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from public.packages where id = p_package_id) then
    raise exception 'Unknown package';
  end if;
  -- already enabled? do nothing
  if exists (select 1 from public.tenant_packages
             where tenant_id = t and package_id = p_package_id) then
    return null;
  end if;
  -- existing pending request? return it (idempotent)
  select id into rid from public.package_requests
   where tenant_id = t and package_id = p_package_id and status = 'pending'
   limit 1;
  if rid is not null then return rid; end if;

  insert into public.package_requests (tenant_id, package_id, requested_by)
  values (t, p_package_id, auth.uid())
  returning id into rid;
  return rid;
end $$;
grant execute on function public.request_package(text) to authenticated;
