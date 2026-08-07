-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-merge-material-rates.sql
-- Safely merge one material_rates row into another (dedupe reconciliation).
--
-- merge_material_rates(keep, drop):
--   • fills any MISSING fields on `keep` from `drop` (price if keep has none,
--     photo, description, sku, unit, sub_category, vendor, attributes, and ORs
--     the show_in_selections flag) — so the catalog image + the price sheet's
--     price end up on one record,
--   • repoints references buried in JSON (estimate_modules.data, cad_drawings.data)
--     and material_price_history from `drop` → `keep`,
--   • deletes the now-redundant `drop` row.
--
-- SECURITY INVOKER (default) → runs under the caller's RLS, so it can only touch
-- the caller's own tenant. Idempotent to install. Run on STAGING then PROD.
-- ─────────────────────────────────────────────────────────────────────────────

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

  -- Repoint price history (table exists via supabase-price-history-migration.sql).
  begin
    update public.material_price_history set material_rate_id = keep where material_rate_id = drop;
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
