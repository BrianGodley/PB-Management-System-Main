-- ============================================================================
-- DELETE A TRIAL TENANT  (RUN ON PRODUCTION)  ⚠️ edit the email first
-- ----------------------------------------------------------------------------
-- Removes the trial workspace created by a given email and detaches that login,
-- so you can sign up fresh. It REFUSES to run if the account is Picture Build,
-- and it only deletes rows scoped to that one trial tenant — PB's data is never
-- touched (the trial only *saw* PB data through the old RLS leak; it doesn't own
-- it).
--
-- 1) Replace OTHER_EMAIL below with the email you used for the trial.
-- 2) Run this in the Supabase SQL editor (production).
-- 3) Then, if you want to reuse the SAME email, delete the auth user too
--    (Supabase → Authentication → Users → that user → Delete). If you'll use a
--    DIFFERENT email for the new trial, you can skip that step.
-- ============================================================================

do $$
declare
  v_uid    uuid;
  v_tenant uuid;
  v_name   text;
begin
  select id into v_uid from auth.users where lower(email) = lower('OTHER_EMAIL');
  if v_uid is null then
    raise notice 'No auth user with that email — nothing to do.';
    return;
  end if;

  select tenant_id into v_tenant from public.profiles where id = v_uid;

  if v_tenant is not null then
    select name into v_name from public.tenants where id = v_tenant;

    -- SAFETY: never delete Picture Build (or anything that looks like it).
    if v_name is not distinct from 'Picture Build' then
      raise exception 'REFUSING: that login is attached to Picture Build (%).', v_name;
    end if;

    raise notice 'Deleting trial tenant "%" (%)', v_name, v_tenant;

    -- tenant-scoped helper rows (cascade-safe, deleted explicitly to be sure)
    delete from public.tenant_packages       where tenant_id = v_tenant;
    delete from public.package_requests       where tenant_id = v_tenant;
    delete from public.cancellation_feedback  where tenant_id = v_tenant;
    delete from public.company_settings       where tenant_id = v_tenant;

    -- the tenant itself (the trial created no real data of its own)
    delete from public.tenants where id = v_tenant;
  else
    raise notice 'User has no tenant — just detaching the profile.';
  end if;

  -- detach / remove the profile so the email can provision again
  delete from public.profiles where id = v_uid;

  raise notice 'Done. To reuse the same email, also delete the auth user in the dashboard.';
end $$;
