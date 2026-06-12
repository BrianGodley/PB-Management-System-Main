-- ============================================================================
-- Opportunities (clients): populate + reformat the Cell Phone field
-- ----------------------------------------------------------------------------
-- The Opportunities table now shows clients.cell as the "Cell Phone" column.
-- Many opportunities historically stored their number in `phone` and left
-- `cell` empty, so this:
--   1) Backfills `cell` from `phone` wherever `cell` is blank (NON-destructive:
--      `phone` is left intact), then
--   2) Reformats both `cell` and `phone` to "1 (AAA) NNN-NNNN".
-- Non-standard values (extensions, partials) are left untouched.
--
-- Requires the pbs_fmt_phone() helper; the block below re-creates it so this
-- file is safe to run on its own.
-- ============================================================================

create or replace function pbs_fmt_phone(raw text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  if raw is null then
    return null;
  end if;
  d := regexp_replace(raw, '\D', '', 'g');
  if length(d) = 11 and left(d, 1) = '1' then
    d := substring(d from 2);
  end if;
  if length(d) = 10 then
    return '1 (' || substring(d, 1, 3) || ') ' || substring(d, 4, 3) || '-' || substring(d, 7, 4);
  end if;
  return raw;
end;
$$;

-- ── PREVIEW (read-only) ──────────────────────────────────────────────────────
-- new_cell shows what the Cell Phone column will display: existing cell, or
-- phone backfilled when cell is empty — then formatted.
select
  id,
  phone                                                   as old_phone,
  cell                                                    as old_cell,
  pbs_fmt_phone(coalesce(nullif(trim(cell), ''), phone))  as new_cell,
  pbs_fmt_phone(phone)                                    as new_phone
from clients
where phone is not null or cell is not null
order by id
limit 100;

-- ── MIGRATION ────────────────────────────────────────────────────────────────
update clients
set
  cell  = pbs_fmt_phone(coalesce(nullif(trim(cell), ''), phone)),
  phone = pbs_fmt_phone(phone)
where phone is not null or cell is not null;

-- ── VERIFY ───────────────────────────────────────────────────────────────────
select id, phone, cell
from clients
where phone is not null or cell is not null
order by id
limit 100;
