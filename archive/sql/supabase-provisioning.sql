-- ============================================================================
-- SELF-SERVE PROVISIONING  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Lets a brand-new signed-up user create their own tenant + owner profile.
-- Runs SECURITY DEFINER so the new user (who has no tenant yet, and is blocked
-- by RLS) can create one. Idempotent-ish: refuses if the caller already belongs
-- to a tenant.
-- ============================================================================

-- Tenant columns used by signup (Stage A created a minimal tenants table).
alter table public.tenants add column if not exists owner_user_id uuid;
alter table public.tenants add column if not exists trial_ends_at timestamptz;

create or replace function public.provision_my_tenant(
  p_company text,
  p_plan    text default 'starter'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t   uuid;
  plan_id text;
  company text := coalesce(nullif(trim(p_company), ''), 'My Company');
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Don't let an existing tenant member re-provision.
  if exists (select 1 from public.profiles where id = uid and tenant_id is not null) then
    raise exception 'This account is already set up';
  end if;

  -- Validate the requested plan; default to starter.
  select id into plan_id from public.plans where id = p_plan;
  if plan_id is null then plan_id := 'starter'; end if;

  insert into public.tenants (name, plan_id, status, trial_ends_at, owner_user_id)
  values (company, plan_id, 'trialing', now() + interval '14 days', uid)
  returning id into t;

  insert into public.profiles (id, email, full_name, role, tenant_id)
  values (uid, (select email from auth.users where id = uid), company, 'owner', t)
  on conflict (id) do update
    set tenant_id = excluded.tenant_id, role = 'owner';

  return t;
end $$;

grant execute on function public.provision_my_tenant(text, text) to authenticated;

-- Convenience: does the caller already have a tenant? (used by the app to
-- decide whether to finish provisioning on first load)
create or replace function public.my_tenant_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select tenant_id from public.profiles where id = auth.uid() limit 1;
$$;
grant execute on function public.my_tenant_id() to authenticated;
