-- ============================================================================
-- PROVISIONING BASELINE  (give every new tenant the rows the app assumes)
-- ----------------------------------------------------------------------------
-- Supersedes provision_my_tenant from supabase-tiers-packages.sql. Adds a
-- company_settings row for the new tenant, so the app's single-row reads/writes
-- resolve to the tenant's OWN settings:
--   • maybeSingle() reads return the tenant's row (RLS-scoped)
--   • the `id: existing?.id || 1` upsert always finds the tenant's id — never
--     collides with Picture Build's row
--   • `.single()` reads in the estimate modules find exactly one row
--
-- Run AFTER Stage A (needs tenants + company_settings.tenant_id). Test on
-- staging first. Safe to re-run.
-- ============================================================================

-- 0) company_settings was a HARD global singleton (CHECK constraint "single_row"
--    forcing one row). Multi-tenancy needs one row PER tenant, so drop it.
alter table public.company_settings drop constraint if exists single_row;

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

  -- BASELINE: one company_settings row per tenant (the app treats it as a
  -- per-company singleton). id is an integer singleton whose default sequence is
  -- unreliable (the seed row was inserted as id=1), so assign max(id)+1 explicitly.
  insert into public.company_settings (id, company_name, tenant_id)
  values (
    (select coalesce(max(id), 0) + 1 from public.company_settings),
    company, t
  )
  on conflict do nothing;

  return t;
end $$;

grant execute on function public.provision_my_tenant(text, text, text[]) to authenticated;

-- Backfill: any existing tenant that lacks a company_settings row. Assign ids
-- explicitly above the current max (the id default sequence is unreliable).
insert into public.company_settings (id, company_name, tenant_id)
select (select coalesce(max(id), 0) from public.company_settings)
         + row_number() over (order by tn.id),
       tn.name, tn.id
  from public.tenants tn
 where not exists (
   select 1 from public.company_settings cs where cs.tenant_id = tn.id
 );
