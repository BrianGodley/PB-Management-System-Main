-- ============================================================================
-- Subcontractor rates cleanup — move ITEM text out of the "Subcontractor"
-- (company_name) column into the Item (trade) + Sub Category columns, leaving
-- company_name holding the actual company.
--
-- I'm working without a view of your data, so this is CONSERVATIVE and
-- PREVIEW-FIRST. Run STEP 1, look at the proposed split, and either:
--   (a) run STEP 2 as-is if it looks right, or
--   (b) paste the STEP 1 output back to me and I'll tailor the parse exactly.
-- Snapshot first (STEP 0). Run on prod (and staging).
-- ============================================================================

-- STEP 0 — SNAPSHOT (so this is reversible):
create table if not exists public.subcontractor_rates_backup_20260813 as
  select * from public.subcontractor_rates;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1 — PREVIEW (read-only). Shows every row and what STEP 2 would do.
-- "looks_like_item" flags company_name values that read like a service/item
-- rather than a company (contain digits, a unit, or install/demo/haul/per…).
-- ─────────────────────────────────────────────────────────────────────────
select
  id,
  category,
  company_name                              as current_subcontractor,
  sub_category                              as current_sub_category,
  trade                                     as current_item,
  rate,
  (company_name ~* '[0-9]|/|per |install|demo|haul|remov|excav|sq ?ft|\ylf\y|\ysf\y|labor|pour|prep|grade')
                                            as company_looks_like_item,
  -- proposed: if Item is empty and the company field looks like an item, the
  -- company text becomes the Item and the real company is left blank to fill in.
  case
    when coalesce(btrim(trade), '') = ''
     and (company_name ~* '[0-9]|/|per |install|demo|haul|remov|excav|sq ?ft|\ylf\y|\ysf\y|labor|pour|prep|grade')
    then company_name
    else trade
  end                                       as proposed_item,
  case
    when coalesce(btrim(trade), '') = ''
     and (company_name ~* '[0-9]|/|per |install|demo|haul|remov|excav|sq ?ft|\ylf\y|\ysf\y|labor|pour|prep|grade')
    then null
    else company_name
  end                                       as proposed_subcontractor
from public.subcontractor_rates
order by category, company_name;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2 — APPLY (conservative). Only touches rows where the Item (trade) is
-- EMPTY and the company field reads like an item: moves that text into Item and
-- blanks company_name (so you can set the real subcontractor afterward). Never
-- overwrites an Item that already has text.
-- ─────────────────────────────────────────────────────────────────────────
-- update public.subcontractor_rates
--   set trade = company_name,
--       company_name = null
-- where coalesce(btrim(trade), '') = ''
--   and (company_name ~* '[0-9]|/|per |install|demo|haul|remov|excav|sq ?ft|\ylf\y|\ysf\y|labor|pour|prep|grade');

-- Rollback if needed:
-- update public.subcontractor_rates r
--   set company_name = b.company_name, trade = b.trade, sub_category = b.sub_category
--   from public.subcontractor_rates_backup_20260813 b where b.id = r.id;
