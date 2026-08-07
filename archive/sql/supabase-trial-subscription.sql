-- ============================================================================
-- TRIAL + SUBSCRIPTION LIFECYCLE  (RUN ON STAGING FIRST, then PRODUCTION)
-- ----------------------------------------------------------------------------
-- Adds trial-clock tracking, cancellation feedback, and the extend/cancel RPCs
-- used by Admin → Subscription:
--   • trial_started_at / trial_ends_at / trial_extended_count → the day counter
--   • data_retention_until → "we keep your data 60 more days" after a cancel
--   • cancellation_feedback → what users tell us on the way out / when extending
--   • extend_my_trial(), cancel_my_trial(), cancel_my_subscription()
-- ============================================================================

-- 1) Columns -----------------------------------------------------------------
-- Base tenant columns this script depends on (added by earlier migrations, but
-- declared here with IF NOT EXISTS so this file is self-contained on any DB).
alter table public.tenants add column if not exists status                 text default 'trialing';
alter table public.tenants add column if not exists owner_user_id          uuid;
alter table public.tenants add column if not exists trial_ends_at          timestamptz;
alter table public.tenants add column if not exists billing_status         text;
alter table public.tenants add column if not exists helcim_customer_id     text;
alter table public.tenants add column if not exists helcim_subscription_id text;
alter table public.tenants add column if not exists card_brand             text;
alter table public.tenants add column if not exists card_last4             text;
alter table public.tenants add column if not exists card_exp               text;
alter table public.tenants add column if not exists current_period_end     timestamptz;

-- New trial-clock columns.
alter table public.tenants add column if not exists trial_started_at     timestamptz default now();
alter table public.tenants add column if not exists trial_extended_count int not null default 0;
alter table public.tenants add column if not exists data_retention_until timestamptz;

-- Backfill a start date for existing trials (best effort: 14 days before end).
update public.tenants
   set trial_started_at = coalesce(trial_started_at, trial_ends_at - interval '14 days', now())
 where status = 'trialing' and trial_started_at is null;

-- 2) Feedback log ------------------------------------------------------------
create table if not exists public.cancellation_feedback (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  kind       text not null,            -- trial_cancel | trial_extend | subscription_cancel
  comment    text,
  reason     text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.cancellation_feedback enable row level security;
drop policy if exists cancellation_feedback_read on public.cancellation_feedback;
create policy cancellation_feedback_read on public.cancellation_feedback
  for select to authenticated using (tenant_id = public.auth_tenant_id());

-- 3) Helper: caller's tenant + a guard that they may manage billing ----------
create or replace function public._billing_admin_tenant()
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  t uuid;
  r text;
begin
  select tenant_id, role into t, r from public.profiles where id = auth.uid() limit 1;
  if t is null then raise exception 'Not authenticated'; end if;
  if r not in ('owner', 'admin', 'super_admin') then
    raise exception 'Only an owner or admin can manage the subscription.';
  end if;
  return t;
end $$;

-- 4) Extend the free trial by 14 days (retention offer) ----------------------
create or replace function public.extend_my_trial(p_comment text default null)
returns json
language plpgsql security definer set search_path = ''
as $$
declare t uuid := public._billing_admin_tenant(); st text; ext int;
begin
  select status, trial_extended_count into st, ext from public.tenants where id = t;
  if st <> 'trialing' then raise exception 'Only an active trial can be extended.'; end if;
  if ext >= 1 then raise exception 'Your trial has already been extended once.'; end if;

  update public.tenants
     set trial_started_at = now(),
         trial_ends_at = now() + interval '14 days',
         trial_extended_count = trial_extended_count + 1,
         status = 'trialing',
         updated_at = now()
   where id = t;

  insert into public.cancellation_feedback (tenant_id, kind, comment, created_by)
  values (t, 'trial_extend', nullif(p_comment, ''), auth.uid());

  return (select json_build_object('trial_ends_at', trial_ends_at, 'trial_extended_count', trial_extended_count)
            from public.tenants where id = t);
end $$;
grant execute on function public.extend_my_trial(text) to authenticated;

-- 5) Cancel the free trial (after feedback) ----------------------------------
create or replace function public.cancel_my_trial(p_comment text default null)
returns json
language plpgsql security definer set search_path = ''
as $$
declare t uuid := public._billing_admin_tenant(); st text;
begin
  select status into st from public.tenants where id = t;
  if st <> 'trialing' then raise exception 'No active trial to cancel.'; end if;

  insert into public.cancellation_feedback (tenant_id, kind, comment, created_by)
  values (t, 'trial_cancel', nullif(p_comment, ''), auth.uid());

  update public.tenants
     set status = 'canceled',
         data_retention_until = now() + interval '60 days',
         updated_at = now()
   where id = t;

  return (select json_build_object('status', status, 'data_retention_until', data_retention_until)
            from public.tenants where id = t);
end $$;
grant execute on function public.cancel_my_trial(text) to authenticated;

-- 6) Cancel a paid subscription (asks why) -----------------------------------
--    Marks the tenant canceled + sets the 60-day retention window. Canceling the
--    live Helcim subscription itself is done by an edge function / the webhook.
create or replace function public.cancel_my_subscription(p_reason text)
returns json
language plpgsql security definer set search_path = ''
as $$
declare t uuid := public._billing_admin_tenant();
begin
  insert into public.cancellation_feedback (tenant_id, kind, reason, created_by)
  values (t, 'subscription_cancel', nullif(p_reason, ''), auth.uid());

  update public.tenants
     set status = 'canceled',
         billing_status = 'canceled',
         data_retention_until = now() + interval '60 days',
         updated_at = now()
   where id = t;

  return (select json_build_object('status', status, 'data_retention_until', data_retention_until)
            from public.tenants where id = t);
end $$;
grant execute on function public.cancel_my_subscription(text) to authenticated;

-- 7) Surface the new fields in get_my_subscription ---------------------------
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
    'tenant_id',        tn.id,
    'tenant_name',      tn.name,
    'status',           tn.status,
    'trial_started_at', tn.trial_started_at,
    'trial_ends_at',    tn.trial_ends_at,
    'trial_extended_count', tn.trial_extended_count,
    'data_retention_until', tn.data_retention_until,
    'plan_id',          pl.id,
    'plan_name',        pl.name,
    'plan_rank',        pl.rank,
    'price_monthly',    pl.price_monthly,
    'plan_module_keys', pl.module_keys,
    'package_ids', coalesce(
        (select array_agg(tp.package_id)
           from public.tenant_packages tp where tp.tenant_id = tn.id), '{}'),
    'billing_status',     tn.billing_status,
    'card_brand',         tn.card_brand,
    'card_last4',         tn.card_last4,
    'card_exp',           tn.card_exp,
    'current_period_end', tn.current_period_end,
    'has_live_billing',   (tn.helcim_subscription_id is not null)
  )
  into result
  from public.tenants tn
  left join public.plans pl on pl.id = tn.plan_id
  where tn.id = t;
  return result;
end $$;
grant execute on function public.get_my_subscription() to authenticated;
