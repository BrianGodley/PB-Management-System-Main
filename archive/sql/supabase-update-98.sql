-- supabase-update-98.sql
-- Company phone numbers shown/edited in Admin > Company Info.
--   main_phone       — the company's primary phone
--   pbs_system_phone — the Picture Build System phone line
-- Run once in the Supabase SQL editor.

alter table company_settings
  add column if not exists main_phone text,
  add column if not exists pbs_system_phone text;
