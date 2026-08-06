-- ============================================================================
-- Phase 4 Step 4 — merge consolidates per-vendor ledger prices cleanly
-- ----------------------------------------------------------------------------
-- merge_material_rates(keep, drop) already repoints material_price_history from
-- the dropped row onto the kept (canonical) material, so each vendor's price
-- moves onto the canonical material as a ledger row. This update adds the one
-- missing guarantee: after the repoint there must be exactly ONE open period per
-- (material, vendor). A merge of two rows for the SAME vendor (the classic
-- catalog-row + price-sheet-row dedupe) would otherwise leave two open periods
-- for that vendor; we keep the newest and drop the redundant older open rows.
--
-- Everything else in the function is unchanged. SECURITY INVOKER (RLS-safe).
-- Additive + idempotent. Run STAGING → PROD.
-- ============================================================================

create or replace function public.merge_material_rates(keep uuid, drop uuid)
returns void
language plpgsql
as $$
declare
  d public.material_rates;
begin
  if keep = drop then return; end if;

  select * into d from public.material_rates where id = drop;
  if d.id is null then
    raise exception 'merge_material_rates: source row % not found (or not visible)', drop;
  end if;
  if not exists (select 1 from public.material_rates where id = keep) then
    raise exception 'merge_material_rates: target row % not found (or not visible)', keep;
  end if;

  -- Fill missing fields on keep from drop.
  update public.material_rates m set
    unit_cost          = case when coalesce(m.unit_cost, 0) = 0 then d.unit_cost else m.unit_cost end,
    photo_url          = coalesce(m.photo_url, d.photo_url),
    description        = coalesce(m.description, d.description),
    sku                = coalesce(m.sku, d.sku),
    unit               = coalesce(m.unit, d.unit),
    sub_category       = coalesce(m.sub_category, d.sub_category),
    vendor_id          = coalesce(m.vendor_id, d.vendor_id),
    attributes         = case when m.attributes = '{}'::jsonb or m.attributes is null
                              then coalesce(d.attributes, '{}'::jsonb) else m.attributes end,
    show_in_selections = coalesce(m.show_in_selections, false) or coalesce(d.show_in_selections, false)
  where m.id = keep;

  -- Repoint price history (each row keeps its own vendor_id → per-vendor ledger).
  begin
    update public.material_price_history set material_rate_id = keep where material_rate_id = drop;

    -- Collapse any duplicate OPEN periods per (material, vendor) that the repoint
    -- may have produced — keep the newest, delete the redundant older open rows.
    delete from public.material_price_history h
     using (
       select id,
              row_number() over (
                partition by material_rate_id, vendor_id
                order by effective_start desc, created_at desc
              ) as rn
       from public.material_price_history
       where material_rate_id = keep and effective_end is null
     ) r
     where h.id = r.id and r.rn > 1;
  exception when undefined_table then null; end;

  -- Repoint id references buried in JSON blobs.
  begin
    update public.estimate_modules
      set data = replace(data::text, drop::text, keep::text)::jsonb
      where data is not null and data::text like '%' || drop::text || '%';
  exception when undefined_table then null; end;

  begin
    update public.cad_drawings
      set data = replace(data::text, drop::text, keep::text)::jsonb
      where data is not null and data::text like '%' || drop::text || '%';
  exception when undefined_table then null; end;

  -- Remove the duplicate.
  delete from public.material_rates where id = drop;
end;
$$;

grant execute on function public.merge_material_rates(uuid, uuid) to authenticated;
