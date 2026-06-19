-- ============================================================================
-- DOCUMENT DRIVE LABEL  (admin-editable name for the "Drive" tab)
-- ----------------------------------------------------------------------------
-- Lets each company name its main document drive tab (e.g. "Picture Build",
-- "Pete's Gardening Drive", "Shreveport Wellness Drive"). Edited in
-- Admin → Company Info. NULL/blank → the app falls back to "Drive".
--
-- Seeds the existing row from company_name so the current label "remains"
-- (Picture Build) until an admin changes it. Run on prod + staging; safe to re-run.
-- ============================================================================

alter table public.company_settings add column if not exists drive_label text;

update public.company_settings
   set drive_label = company_name
 where drive_label is null
   and company_name is not null
   and btrim(company_name) <> '';
