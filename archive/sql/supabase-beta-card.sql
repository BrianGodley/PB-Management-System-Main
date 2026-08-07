-- ============================================================================
-- BETA SIGNUP CARD  (RUN ON STAGING FIRST: fgyexksqinjczebtsuon)
-- ----------------------------------------------------------------------------
-- Lets a self-serve (beta) signup store the card they entered on their own
-- tenant, so Settings → Billing shows it with the "Test card (beta)" badge —
-- consistent with the Picture Build seed. NEVER overrides a live subscription
-- (helcim_subscription_id set), so converting to paying later is safe.
-- ============================================================================

create or replace function public.set_beta_card(p_brand text, p_last4 text, p_exp text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t uuid := (select tenant_id from public.profiles where id = auth.uid() limit 1);
begin
  if t is null then return; end if;
  update public.tenants
     set card_brand     = nullif(p_brand, ''),
         card_last4     = right(regexp_replace(coalesce(p_last4, ''), '\D', '', 'g'), 4),
         card_exp       = nullif(p_exp, ''),
         billing_status = coalesce(billing_status, 'trialing'),
         updated_at     = now()
   where id = t
     and helcim_subscription_id is null;   -- never clobber live billing
end $$;
grant execute on function public.set_beta_card(text, text, text) to authenticated;
