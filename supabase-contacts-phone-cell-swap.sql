-- ============================================================================
-- Contacts: swap phone <-> cell, then format both to "1 (AAA) NNN-NNNN"
-- ----------------------------------------------------------------------------
-- 1) Every value currently in `phone` moves to `cell`, and vice-versa.
-- 2) Both columns are reformatted to the US pattern  1 (AAA) NNN-NNNN
--    (e.g. 1 (555) 123-4567) when the value is a standard 10-digit number
--    (or 11 digits with a leading country-code 1). Anything that isn't a
--    clean 10-digit US number is left exactly as-is, so extensions, partial
--    numbers, or notes are never mangled.
--
-- Texting is unaffected: the send-sms Edge Function strips everything back to
-- digits and rebuilds E.164 (+1AAANNNNNNN) before sending, so this display
-- format is purely cosmetic for the stored data.
--
-- Run the PREVIEW first to eyeball the result, then run the MIGRATION.
-- ============================================================================

-- ── Formatting helper ───────────────────────────────────────────────────────
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
  d := regexp_replace(raw, '\D', '', 'g');           -- digits only
  if length(d) = 11 and left(d, 1) = '1' then         -- drop leading country code
    d := substring(d from 2);
  end if;
  if length(d) = 10 then
    return '1 (' || substring(d, 1, 3) || ') ' || substring(d, 4, 3) || '-' || substring(d, 7, 4);
  end if;
  return raw;                                          -- not a clean US number: leave untouched
end;
$$;

-- ── PREVIEW (read-only): shows old vs. new for the first 100 rows ────────────
-- Note the swap: new phone is built from the OLD cell, new cell from OLD phone.
select
  id,
  phone                     as old_phone,
  cell                      as old_cell,
  pbs_fmt_phone(cell)       as new_phone,
  pbs_fmt_phone(phone)      as new_cell
from contacts
where phone is not null or cell is not null
order by id
limit 100;

-- ── MIGRATION ────────────────────────────────────────────────────────────────
-- A single UPDATE: Postgres evaluates the right-hand side against the row's
-- pre-update values, so this swaps AND formats atomically (no temp column).
update contacts
set
  phone = pbs_fmt_phone(cell),
  cell  = pbs_fmt_phone(phone)
where phone is not null or cell is not null;

-- ── VERIFY ───────────────────────────────────────────────────────────────────
select id, phone, cell
from contacts
where phone is not null or cell is not null
order by id
limit 100;
