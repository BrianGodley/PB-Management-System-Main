-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing rebuild — PHASE 2b (Layer 4): route labor / sub / fee rows
--
-- Non-destructive; material_rates untouched (modules still read it until the
-- estimator repoint). Copies each non-material map row to its home table:
--   labor → labor_rates, sub → subcontractor_rates (name → company_name),
--   fee → misc_rates. rate = source unit_cost; category carried through.
-- Idempotent (NOT EXISTS guards).
--
-- Result on prod (2026-08-06): labor 24/24, sub 14/14, fee 23/23 matched.
-- ─────────────────────────────────────────────────────────────────────────────

-- LABOR → labor_rates
insert into public.labor_rates (tenant_id, name, rate, category, sub_category)
select mm.tenant_id, mm.name, mm.unit_cost, mm.category, mm.sub_category
  from public.material_migration_map mm
 where mm.kind = 'labor'
   and not exists (
     select 1 from public.labor_rates l
      where l.tenant_id = mm.tenant_id and l.name = mm.name
        and coalesce(l.category,'') = coalesce(mm.category,''));

-- SUB → subcontractor_rates (item name → company_name, matching existing usage)
insert into public.subcontractor_rates (tenant_id, company_name, rate, category, sub_category)
select mm.tenant_id, mm.name, mm.unit_cost, mm.category, mm.sub_category
  from public.material_migration_map mm
 where mm.kind = 'sub'
   and not exists (
     select 1 from public.subcontractor_rates s
      where s.tenant_id = mm.tenant_id and s.company_name = mm.name
        and coalesce(s.category,'') = coalesce(mm.category,''));

-- FEE → misc_rates
insert into public.misc_rates (tenant_id, category, name, rate)
select mm.tenant_id, mm.category, mm.name, mm.unit_cost
  from public.material_migration_map mm
 where mm.kind = 'fee'
   and not exists (
     select 1 from public.misc_rates x
      where x.tenant_id = mm.tenant_id and x.name = mm.name
        and coalesce(x.category,'') = coalesce(mm.category,''));

-- ── Parity (each row: map_rows should equal matched) ──────────────────────────
-- select 'labor' kind, count(*) map_rows,
--        count(*) filter (where exists (select 1 from public.labor_rates l
--          where l.tenant_id=mm.tenant_id and l.name=mm.name)) matched
--   from public.material_migration_map mm where mm.kind='labor'
-- union all select 'sub', count(*),
--        count(*) filter (where exists (select 1 from public.subcontractor_rates s
--          where s.tenant_id=mm.tenant_id and s.company_name=mm.name))
--   from public.material_migration_map mm where mm.kind='sub'
-- union all select 'fee', count(*),
--        count(*) filter (where exists (select 1 from public.misc_rates x
--          where x.tenant_id=mm.tenant_id and x.name=mm.name))
--   from public.material_migration_map mm where mm.kind='fee';
