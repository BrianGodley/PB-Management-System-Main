-- Store the Turf Prep base-layer defaults (Vendor + Type per Roadbase / DG Base /
-- Weed Barrier) on the single-row company_settings table as JSON. The Artificial
-- Turf module's "Defaults" link reads/writes this and pre-fills new estimates.
-- Shape: { "Gravel": {"vendor": "<id|Standard>", "type": "<name>"},
--          "DG": {...}, "Weed": {...} }
alter table public.company_settings
  add column if not exists turf_base_defaults jsonb;
