-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing rebuild — PHASE 2b (Layer 1): migration map + KIND classification
--
-- Builds a staging table with one row per material_rates row, tagging each as
-- material / labor / sub / fee by rule. NOTHING is moved yet — this is purely
-- so you can review the routing split (and correct any row) before Layer 2
-- (sub-category homing) and the actual migration.
--
-- Safe / re-runnable (drops + rebuilds the staging table only).
-- ─────────────────────────────────────────────────────────────────────────────

drop table if exists public.material_migration_map;
create table public.material_migration_map (
  rate_id      uuid primary key references public.material_rates(id) on delete cascade,
  tenant_id    uuid,
  name         text,
  category     text,
  sub_category text,
  vendor_id    uuid,
  unit_cost    numeric,
  kind         text,        -- material | labor | sub | fee
  subcat_code  text,        -- filled in Layer 2 (materials only)
  collection   text,        -- Paver collection attribute (Layer 2)
  note         text
);

insert into public.material_migration_map
  (rate_id, tenant_id, name, category, sub_category, vendor_id, unit_cost, kind)
select m.id, m.tenant_id, m.name, m.category, m.sub_category, m.vendor_id, m.unit_cost,
  case
    -- SUB-contractor rates ("… - Sub SF", "Sub Structure", "Steps - Sub … Base")
    when m.name ilike '%sub sf%' or m.name ilike '% - sub %'
      or m.name ilike '%sub structure%' or m.name ilike 'steps - sub%'
      then 'sub'
    -- LABOR (keyword, plus the confirmed labor-only items)
    when m.name ilike '%labor%'
      or m.name in ('Curb Core','Hydrocut Under Hardscape')
      or (m.category = 'Irrigation' and m.name ilike 'irrigation zone%')
      or (m.category = 'Steps' and m.name like '%$/SF%')
      or (m.category = 'Pool' and m.name ilike 'plumbing -%')
      then 'labor'
    -- FEES / delivery / dump / hauling → misc_rates
    when m.name ilike '%dump%' or m.name ilike '%container%'
      or m.name ilike '%delivery%' or m.name ilike '%pallet charge%'
      or m.name ilike '%fitting fee%' or m.name = 'Shotcrete Minimum'
      or m.category = 'Demo'
      then 'fee'
    -- everything else is a MATERIAL
    else 'material'
  end
from public.material_rates m;

-- ── REVIEW (run these, share the output) ──────────────────────────────────────
-- Overall split:
-- select kind, count(*) from public.material_migration_map group by kind order by kind;
--
-- Split per category (so you can eyeball each module):
-- select category, kind, count(*) from public.material_migration_map
--  group by category, kind order by category, kind;
--
-- Spot-check what's leaving the material list (labor/sub/fee):
-- select kind, category, name from public.material_migration_map
--  where kind <> 'material' order by kind, category, name;
