-- ============================================================================
-- SUBSCRIPTION BILLING DETAILS  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Surfaces billing/payment-method state in Settings → Billing, and seeds the
-- Picture Build tenant as a full Tier 3 + Contractor instance with TEST card
-- data (beta — no live charge until Helcim is wired).
--   • adds card_brand / card_exp to tenants (card_last4 already exists)
--   • get_my_subscription() now returns billing_status + card fields + period end
--   • Picture Build → tier3, contractor package, active, Visa test card 4242
-- ============================================================================

-- 0) Base billing columns (also in supabase-billing-schema.sql — included here so
--    this file is self-contained and order-independent).
alter table public.tenants add column if not exists helcim_customer_id     text;
alter table public.tenants add column if not exists helcim_subscription_id text;
alter table public.tenants add column if not exists billing_status         text;  -- trialing|active|past_due|canceled
alter table public.tenants add column if not exists card_last4             text;
alter table public.tenants add column if not exists current_period_end     timestamptz;

-- 1) Card display columns
alter table public.tenants add column if not exists card_brand text;   -- Visa | Mastercard | ...
alter table public.tenants add column if not exists card_exp   text;   -- 'MM/YYYY'

-- 2) Subscription snapshot incl. billing/payment method --------------------------
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
    'trial_ends_at',    tn.trial_ends_at,
    'plan_id',          pl.id,
    'plan_name',        pl.name,
    'plan_rank',        pl.rank,
    'price_monthly',    pl.price_monthly,
    'plan_module_keys', pl.module_keys,
    'package_ids', coalesce(
        (select array_agg(tp.package_id)
           from public.tenant_packages tp where tp.tenant_id = tn.id), '{}'),
    -- billing / payment method
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

-- 3) Picture Build = full subscription + test card -----------------------------
update public.tenants
   set plan_id            = 'tier3',
       status             = 'active',
       billing_status     = 'active',
       card_brand         = 'Visa',
       card_last4         = '4242',
       card_exp           = '12/2030',
       current_period_end = coalesce(current_period_end, date_trunc('month', now()) + interval '1 month')
 where name = 'Picture Build';

-- ensure the Contractor add-on is attached (idempotent)
insert into public.tenant_packages (tenant_id, package_id)
select id, 'contractor' from public.tenants where name = 'Picture Build'
on conflict do nothing;
