-- ============================================================================
-- Normalize stored display-unit values to the standard scheme (mirrors
-- src/lib/units.js formatUnit):  Sq Ft / Ln Ft / Each / Cu Yd / Cu Ft / Tons,
-- and a "/" or "-" that means "per" -> the word "per".
-- Targets the `unit` DISPLAY column on material / labor_rates / subcontractor_rates.
-- These are display metadata, NOT lookup keys, so this is safe. Idempotent.
-- Run STEP 1 first, eyeball the before->after list, then run STEP 2.
-- Run on prod AND staging.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1 — PREVIEW ONLY (read-only, changes nothing). Review the output.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function pg_temp.fmt_unit(u text) returns text
language plpgsql immutable as $$
declare s text := u;
begin
  if s is null or btrim(s) = '' then return s; end if;
  s := regexp_replace(s, '([0-9])\s*sf\M', '\1 Sq Ft', 'gi');
  s := regexp_replace(s, '([0-9])\s*lf\M', '\1 Ln Ft', 'gi');
  s := regexp_replace(s, '([0-9])\s*cy\M', '\1 Cu Yd', 'gi');
  s := regexp_replace(s, '([0-9])\s*cf\M', '\1 Cu Ft', 'gi');
  s := regexp_replace(s, '\y(square\s*feet|sq\s*feet|sq\s*ft|sf)\y', 'Sq Ft', 'gi');
  s := regexp_replace(s, '\y(linear\s*feet|lin\s*feet|linear\s*f|ln\s*feet|ln\s*ft|lf)\y', 'Ln Ft', 'gi');
  s := regexp_replace(s, '\y(cubic\s*yards?|cu\s*yd|cub\s*yard|c\s*yard|cubic\s*y|cy)\y', 'Cu Yd', 'gi');
  s := regexp_replace(s, '\y(cubic\s*feet|cubic\s*foot|cu\s*ft|cf)\y', 'Cu Ft', 'gi');
  s := regexp_replace(s, '\y(each|ea)\y', 'Each', 'gi');
  s := regexp_replace(s, '\y(tons?)\y', 'Tons', 'gi');
  s := regexp_replace(s, '\s*[/-]\s*', ' per ', 'g');
  return btrim(s);
end $$;

select 'material' tbl, unit as before, pg_temp.fmt_unit(unit) as after, count(*) as rows
  from material where unit is not null and unit <> pg_temp.fmt_unit(unit) group by unit
union all
select 'labor_rates', unit, pg_temp.fmt_unit(unit), count(*)
  from labor_rates where unit is not null and unit <> pg_temp.fmt_unit(unit) group by unit
union all
select 'subcontractor_rates', unit, pg_temp.fmt_unit(unit), count(*)
  from subcontractor_rates where unit is not null and unit <> pg_temp.fmt_unit(unit) group by unit
order by tbl, before;


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2 — APPLY (run after the preview looks right).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function pg_temp.fmt_unit(u text) returns text
language plpgsql immutable as $$
declare s text := u;
begin
  if s is null or btrim(s) = '' then return s; end if;
  s := regexp_replace(s, '([0-9])\s*sf\M', '\1 Sq Ft', 'gi');
  s := regexp_replace(s, '([0-9])\s*lf\M', '\1 Ln Ft', 'gi');
  s := regexp_replace(s, '([0-9])\s*cy\M', '\1 Cu Yd', 'gi');
  s := regexp_replace(s, '([0-9])\s*cf\M', '\1 Cu Ft', 'gi');
  s := regexp_replace(s, '\y(square\s*feet|sq\s*feet|sq\s*ft|sf)\y', 'Sq Ft', 'gi');
  s := regexp_replace(s, '\y(linear\s*feet|lin\s*feet|linear\s*f|ln\s*feet|ln\s*ft|lf)\y', 'Ln Ft', 'gi');
  s := regexp_replace(s, '\y(cubic\s*yards?|cu\s*yd|cub\s*yard|c\s*yard|cubic\s*y|cy)\y', 'Cu Yd', 'gi');
  s := regexp_replace(s, '\y(cubic\s*feet|cubic\s*foot|cu\s*ft|cf)\y', 'Cu Ft', 'gi');
  s := regexp_replace(s, '\y(each|ea)\y', 'Each', 'gi');
  s := regexp_replace(s, '\y(tons?)\y', 'Tons', 'gi');
  s := regexp_replace(s, '\s*[/-]\s*', ' per ', 'g');
  return btrim(s);
end $$;

update material            set unit = pg_temp.fmt_unit(unit) where unit is not null and unit <> pg_temp.fmt_unit(unit);
update labor_rates         set unit = pg_temp.fmt_unit(unit) where unit is not null and unit <> pg_temp.fmt_unit(unit);
update subcontractor_rates set unit = pg_temp.fmt_unit(unit) where unit is not null and unit <> pg_temp.fmt_unit(unit);
