-- Artificial Turf: Turf Install labor now driven by SF/hr alone (dropped the 0.5
-- PH multiplier). Old effective was 20 SF/hr × 0.5 = 40 SF/hr, so realign the
-- rate to 40 to keep pricing unchanged — only where it's still the old default 20.
-- (Cut/Staple/Seam PH was 1.0, so LF/hr=100 is unchanged; no update needed.)
-- Idempotent. Run on prod + staging.
update public.labor_rates
set rate = 40
where name = 'Turf - Turf Install SF/hr' and category = 'Artificial Turf' and rate = 20;
