-- ============================================================================
-- BILLING PAYMENT HISTORY  (RUN ON STAGING FIRST, then PRODUCTION)
-- ----------------------------------------------------------------------------
-- A per-tenant ledger of billing events shown in Admin → Billing → History:
--   date · subscription · amount · method (card/ACH) · card brand · last 4.
-- A $0 "Free trial started" row is logged at signup so the history tracks the
-- trial from day one — even on the beta test card. Real charges are appended by
-- the billing edge functions / webhook.
-- ============================================================================

create table if not exists public.billing_payments (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  occurred_at           timestamptz not null default now(),
  description           text,                       -- "Free trial started", "Tier 3 + Contractor"
  amount                numeric not null default 0,
  method                text,                       -- 'card' | 'ach'
  card_brand            text,                       -- Visa | Mastercard | Amex | Discover
  card_last4            text,
  status                text not null default 'paid', -- paid | trial | pending | failed | refunded
  helcim_transaction_id text,
  created_at            timestamptz not null default now()
);
create index if not exists billing_payments_tenant_idx on public.billing_payments(tenant_id, occurred_at desc);

alter table public.billing_payments enable row level security;
drop policy if exists billing_payments_read on public.billing_payments;
create policy billing_payments_read on public.billing_payments
  for select to authenticated using (tenant_id = public.auth_tenant_id());
grant select on public.billing_payments to authenticated;
grant all on public.billing_payments to service_role;

-- Helper used by provisioning + backfill to log the trial-start row.
create or replace function public.log_trial_started(p_tenant uuid, p_when timestamptz default now())
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.billing_payments where tenant_id = p_tenant and status = 'trial') then
    insert into public.billing_payments (tenant_id, occurred_at, description, amount, status)
    values (p_tenant, coalesce(p_when, now()), 'Free trial started', 0, 'trial');
  end if;
end $$;

-- ── Provisioning: log the trial row for every new signup ─────────────────────
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

  perform public.log_trial_started(t, now());
  return t;
end $$;
grant execute on function public.provision_my_tenant(text, text, text[]) to authenticated;

-- ── Beta card: stamp the card onto the trial-start row so History shows it ──
create or replace function public.set_beta_card(p_brand text, p_last4 text, p_exp text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  t uuid := (select tenant_id from public.profiles where id=auth.uid() limit 1);
  v_last4 text := right(regexp_replace(coalesce(p_last4,''),'\D','','g'),4);
begin
  if t is null then return; end if;
  update public.tenants
     set card_brand=nullif(p_brand,''), card_last4=v_last4, card_exp=nullif(p_exp,''),
         billing_status=coalesce(billing_status,'trialing'), updated_at=now()
   where id=t and helcim_subscription_id is null;

  -- reflect the card on the trial ledger row (so the history table shows it)
  update public.billing_payments
     set method='card', card_brand=nullif(p_brand,''), card_last4=v_last4
   where tenant_id=t and status='trial';
end $$;
grant execute on function public.set_beta_card(text,text,text) to authenticated;

-- ── Backfill: a trial-start row for existing tenants that have none ──────────
do $$
declare r record;
begin
  for r in select id, trial_started_at, card_brand, card_last4 from public.tenants loop
    if not exists (select 1 from public.billing_payments where tenant_id = r.id) then
      insert into public.billing_payments (tenant_id, occurred_at, description, amount, status, method, card_brand, card_last4)
      values (r.id, coalesce(r.trial_started_at, now()), 'Free trial started', 0, 'trial',
              case when r.card_last4 is not null then 'card' end, r.card_brand, r.card_last4);
    end if;
  end loop;
end $$;
