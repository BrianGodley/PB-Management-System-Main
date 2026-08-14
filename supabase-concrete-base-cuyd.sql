-- ─────────────────────────────────────────────────────────────────────────────
-- Concrete Base material → priced by the CUBIC YARD (company-wide move).
--
-- WHY: The Concrete estimator's Base Install rows previously priced base MATERIAL
-- with the AREA formula  (SF ÷ 100) × depth(in) × price , i.e. the stored catalog
-- price behaved as a $ per (100 SF · 1 inch) coefficient — NOT a real $/ton, even
-- though items were seeded with unit 'ton'. ConcreteModule.jsx now prices base
-- material by VOLUME:  base Cu Yd = SF × depth(in)/12 ÷ 27 ,  cost = Cu Yd × $/CY.
--
-- CONVERSION (cost-neutral): to keep every existing estimate's dollar amount
-- unchanged while re-basing the rate onto a true per-cubic-yard unit:
--     old cost = (SF/100)·d·p_old
--     new cost = (SF·d/12/27)·p_new = (SF·d/324)·p_new
--     equal ⇒ p_new = p_old × (324/100) = p_old × 3.24
-- So a per-(100 SF·in) coefficient of C becomes $/CY of C × 3.24. (Equivalently:
-- 100 SF × 1 in = 8.333 CF = 0.30864 CY, and 1 / 0.30864 = 3.24.)
--
-- ASSUMPTION DOCUMENTED: the estimator's per-row base MATERIAL price was a
-- per-(100 SF·in) coefficient (traced in code), NOT a genuine $/ton figure, so we
-- use the exact geometric factor 3.24 (= 12 × 27 / 100). This preserves existing
-- estimate totals to the penny. If a stored value happened to already be a clean
-- $/CY figure, it will be scaled by 3.24 the first (and only) time this runs — so
-- run this ONCE per environment; it self-guards against a second run via the unit.
--
-- SCOPE: materials whose sub-category is 'Concrete Base' under category 'Concrete'
-- or 'Basic Materials' — matching how ConcreteModule fetches base items
-- (fetchModuleCatalog(['Concrete','Basic Materials']) then filters sub_category).
--
-- IDEMPOTENT: only touches materials whose unit is not already 'Cu Yd'. Wrapped
-- in a transaction so the price scale + unit flip apply atomically (re-running is
-- a no-op once unit = 'Cu Yd'). Run on prod + staging.
-- ─────────────────────────────────────────────────────────────────────────────
begin;

-- 1) Scale the price of every open + historical material_price row for the base
--    items being re-based, from the per-(100 SF·in) coefficient to $/Cu Yd.
--    Guarded by material.unit <> 'Cu Yd' so it runs at most once.
update public.material_price mp
set price = round((mp.price * 3.24)::numeric, 4)
from public.material m
join public.category c     on c.id = m.category_id
join public.subcategory s  on s.id = m.subcategory_id
where mp.material_id = m.id
  and s.name = 'Concrete Base'
  and c.name in ('Concrete', 'Basic Materials')
  and m.unit is distinct from 'Cu Yd';

-- 2) Flip the unit label to 'Cu Yd' for those same base items.
update public.material m
set unit = 'Cu Yd'
from public.category c, public.subcategory s
where c.id = m.category_id
  and s.id = m.subcategory_id
  and s.name = 'Concrete Base'
  and c.name in ('Concrete', 'Basic Materials')
  and m.unit is distinct from 'Cu Yd';

commit;
