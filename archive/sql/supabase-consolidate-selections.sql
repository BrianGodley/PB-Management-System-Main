-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-consolidate-selections.sql
-- Consolidate the `selections` design catalog INTO `material_rates` so there is
-- ONE product/material record, viewed through three lenses:
--   • Master Material Rates = pricing lens
--   • Vendor Catalog        = photo lens (rows with a photo)
--   • Design → Selections   = design/spec lens (rows with show_in_selections)
--
-- This adds the few spec columns material_rates was missing, folds selections
-- data in, and flags which rows appear in the Selections browser. It does NOT
-- drop the selections table — verify the app first, then drop it separately.
--
-- Idempotent. Run on STAGING, verify, then PROD.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Spec columns on material_rates ------------------------------------------
alter table public.material_rates add column if not exists description        text;
alter table public.material_rates add column if not exists attributes         jsonb not null default '{}'::jsonb;
alter table public.material_rates add column if not exists sku                 text;
alter table public.material_rates add column if not exists show_in_selections  boolean not null default false;

create index if not exists material_rates_show_in_selections_idx
  on public.material_rates (show_in_selections) where show_in_selections;

-- 2) Enrich material_rates rows that a selection already points at -------------
update public.material_rates m
set description        = coalesce(m.description, s.description),
    attributes         = case when m.attributes = '{}'::jsonb or m.attributes is null
                              then coalesce(s.attributes, '{}'::jsonb) else m.attributes end,
    sku                = coalesce(m.sku, s.sku),
    photo_url          = coalesce(m.photo_url, s.photo_url),
    show_in_selections = true
from public.selections s
where s.material_rate_id = m.id;

-- 3) Fold in selections with NO linked material rate (manual + catalog copies).
--    Collision on (tenant_id, name, category) just flips the flag + enriches the
--    existing row instead of duplicating.
insert into public.material_rates
  (tenant_id, name, category, sub_category, vendor_id, unit, unit_cost,
   photo_url, description, attributes, sku, show_in_selections)
select
  s.tenant_id, s.name, s.category, s.sub_category, s.vendor_id, s.unit, s.price,
  s.photo_url, s.description, coalesce(s.attributes, '{}'::jsonb), s.sku, true
from public.selections s
where s.material_rate_id is null
  and s.name is not null
on conflict (tenant_id, name, category) do update
set show_in_selections = true,
    description = coalesce(material_rates.description, excluded.description),
    attributes  = case when material_rates.attributes = '{}'::jsonb
                       then excluded.attributes else material_rates.attributes end,
    photo_url   = coalesce(material_rates.photo_url, excluded.photo_url),
    sku         = coalesce(material_rates.sku, excluded.sku);

-- 4) Sanity counts (optional to review) --------------------------------------
--   select count(*) as shown_in_selections from public.material_rates where show_in_selections;
--   select count(*) as remaining_selections  from public.selections;

-- After verifying Design → Selections shows the right items in the app, retire
-- the old table:   drop table if exists public.selections;
