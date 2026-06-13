-- supabase-update-97.sql
-- Company office + truck-yard addresses, used by the Time Clock "Proximity"
-- column to decide which known location an employee clocked in/out closest to.
--
-- lat/lon are geocoded and saved automatically when an admin saves Company
-- Info (Admin > Company Settings). Run this once in the Supabase SQL editor.

alter table company_settings
  add column if not exists main_office_address text,
  add column if not exists main_office_lat double precision,
  add column if not exists main_office_lon double precision,
  add column if not exists truck_yard_address text,
  add column if not exists truck_yard_lat double precision,
  add column if not exists truck_yard_lon double precision;

-- Seed the known addresses (only if blank). Saving Company Info will geocode
-- them into lat/lon.
update company_settings
set
  main_office_address = coalesce(nullif(main_office_address, ''), '12410 Foothill Blvd Unit U, Sylmar, CA 91342'),
  truck_yard_address  = coalesce(nullif(truck_yard_address, ''),  '13241 Bradley Ave, Sylmar, CA 91342')
where id is not null;
