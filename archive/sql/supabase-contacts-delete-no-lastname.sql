-- ============================================================================
-- Contacts: delete every contact with no last name
-- ----------------------------------------------------------------------------
-- "No last name" = last_name IS NULL or blank (whitespace only).
-- Run the COUNT + PREVIEW first to see exactly what will be removed, then run
-- the DELETE. This is permanent — there is no undo.
-- ============================================================================

-- ── COUNT ────────────────────────────────────────────────────────────────────
select count(*) as will_delete
from contacts
where last_name is null or btrim(last_name) = '';

-- ── PREVIEW (read-only): the rows that will be deleted ───────────────────────
select id, first_name, last_name, email, phone, cell, city, state
from contacts
where last_name is null or btrim(last_name) = ''
order by id
limit 200;

-- ── DELETE ───────────────────────────────────────────────────────────────────
delete from contacts
where last_name is null or btrim(last_name) = '';
