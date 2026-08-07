-- ============================================================================
-- Phase 4 Step 3 — keep the price ledger in sync with every price write
-- ----------------------------------------------------------------------------
-- Now that the estimator resolves prices from material_price_history (the open
-- period per material+vendor), ANY change to material_rates.unit_cost must be
-- reflected in the ledger — otherwise the estimator would show a stale ledger
-- price after a manual edit.
--
-- Rather than touch every writer (RateEditPopover, Master Rates, the per-module
-- rate editors, catalog import), a single AFTER UPDATE trigger keeps the open
-- ledger period's unit_cost aligned with material_rates.unit_cost. Price-sheet
-- imports still write their own close+open history periods for full temporal
-- granularity; this trigger is a no-op in that case (the open period it finds
-- already has the new price).
--
-- Additive + idempotent. Run STAGING → PROD (after the Step-1 backfill).
-- ============================================================================

-- Optional explicit helper: set a material's price with a fresh ledger period.
create or replace function public.set_material_price_row(
  p_material_id uuid,
  p_unit_cost   numeric,
  p_source      text default 'manual',
  p_date        date default current_date
)
returns void
language plpgsql
as $$
declare
  v_vendor uuid;
  v_tenant uuid;
begin
  select vendor_id, tenant_id into v_vendor, v_tenant
    from public.material_rates where id = p_material_id;

  -- Reuse an open period that already starts today; otherwise close the prior
  -- open period and open a new one.
  if exists (
    select 1 from public.material_price_history
     where material_rate_id = p_material_id
       and effective_end is null
       and effective_start = p_date
  ) then
    update public.material_price_history
       set unit_cost = p_unit_cost, source = p_source
     where material_rate_id = p_material_id
       and effective_end is null
       and effective_start = p_date;
  else
    update public.material_price_history
       set effective_end = p_date - 1
     where material_rate_id = p_material_id
       and effective_end is null;
    insert into public.material_price_history
      (tenant_id, material_rate_id, vendor_id, unit_cost, effective_start, source)
    values (v_tenant, p_material_id, v_vendor, p_unit_cost, p_date, p_source);
  end if;

  update public.material_rates set unit_cost = p_unit_cost where id = p_material_id;
end $$;

-- Trigger: on any unit_cost change, keep the open ledger period aligned.
create or replace function public.sync_material_price_ledger()
returns trigger
language plpgsql
as $$
begin
  if NEW.unit_cost is distinct from OLD.unit_cost then
    if exists (
      select 1 from public.material_price_history
       where material_rate_id = NEW.id and effective_end is null
    ) then
      update public.material_price_history
         set unit_cost = NEW.unit_cost
       where material_rate_id = NEW.id and effective_end is null;
    else
      insert into public.material_price_history
        (tenant_id, material_rate_id, vendor_id, unit_cost, effective_start, source)
      values (NEW.tenant_id, NEW.id, NEW.vendor_id, NEW.unit_cost, current_date, 'material_edit');
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists sync_material_price_ledger on public.material_rates;
create trigger sync_material_price_ledger
  after update on public.material_rates
  for each row
  execute function public.sync_material_price_ledger();

-- Verify: edit a material price in Master Rates, then confirm the open ledger
-- row matches:
-- select h.unit_cost, mr.unit_cost
--   from public.material_price_history h
--   join public.material_rates mr on mr.id = h.material_rate_id
--  where h.effective_end is null and h.material_rate_id = '<id>';
