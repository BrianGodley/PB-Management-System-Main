-- Phase 1: unify the CATEGORY namespace across the three rate systems. After
-- this, category / labor_category / subcontractor_category all hold the same set
-- of category names (sub-categories stay independent per system). The app then
-- keeps them in sync on every add / rename / delete.
--
-- Idempotent: inserts only the category names a table is missing; codes follow
-- the app's scheme (6-char slug, 2-digit suffix on collision). Safe to re-run.
--
-- SNAPSHOT the DB before running (this writes to all three category tables).

-- Union of every category name currently used anywhere (the three category
-- tables plus any free-text categories on labor / subcontractor / misc rates).
with all_names as (
  select btrim(name) as name from public.category where btrim(coalesce(name,'')) <> ''
  union select btrim(name) from public.labor_category where btrim(coalesce(name,'')) <> ''
  union select btrim(name) from public.subcontractor_category where btrim(coalesce(name,'')) <> ''
  union select btrim(category) from public.labor_rates where btrim(coalesce(category,'')) <> ''
  union select btrim(category) from public.subcontractor_rates where btrim(coalesce(category,'')) <> ''
  union select btrim(category) from public.misc_rates where btrim(coalesce(category,'')) <> ''
),
-- Per tenant × name, so codes are generated within the right tenant scope. Every
-- category table is tenant-stamped; pull the tenant set from existing rows.
tenants as (
  select distinct tenant_id from public.category
  union select distinct tenant_id from public.labor_category
  union select distinct tenant_id from public.subcontractor_category
),
wanted as (
  select t.tenant_id, n.name,
    coalesce(nullif(upper(regexp_replace(left(n.name, 6), '[^a-zA-Z0-9]', '', 'g')), ''), 'GEN') as base
  from tenants t cross join all_names n
)
-- Insert missing rows into each of the three category tables.
, mat as (
  insert into public.category (tenant_id, code, name)
  select tenant_id, code, name from (
    select tenant_id, name,
      case when count(*) over (partition by tenant_id, base) = 1 then base
           else base || lpad((row_number() over (partition by tenant_id, base order by name))::text, 2, '0') end as code
    from wanted w
    where not exists (select 1 from public.category c where c.tenant_id = w.tenant_id and c.name = w.name)
  ) d
  on conflict (tenant_id, code) do nothing
  returning 1
)
, lab as (
  insert into public.labor_category (tenant_id, code, name)
  select tenant_id, code, name from (
    select tenant_id, name,
      case when count(*) over (partition by tenant_id, base) = 1 then base
           else base || lpad((row_number() over (partition by tenant_id, base order by name))::text, 2, '0') end as code
    from wanted w
    where not exists (select 1 from public.labor_category c where c.tenant_id = w.tenant_id and c.name = w.name)
  ) d
  on conflict (tenant_id, code) do nothing
  returning 1
)
insert into public.subcontractor_category (tenant_id, code, name)
select tenant_id, code, name from (
  select tenant_id, name,
    case when count(*) over (partition by tenant_id, base) = 1 then base
         else base || lpad((row_number() over (partition by tenant_id, base order by name))::text, 2, '0') end as code
  from wanted w
  where not exists (select 1 from public.subcontractor_category c where c.tenant_id = w.tenant_id and c.name = w.name)
) d
on conflict (tenant_id, code) do nothing;
