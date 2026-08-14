-- Link subcontractor_rates to the assigned vendor by id (not just the name text),
-- so a vendor rename can flow through. company_name stays as a denormalized copy
-- that the app keeps in sync when a vendor is edited.
alter table public.subcontractor_rates
  add column if not exists vendor_id uuid references public.subs_vendors(id);

update public.subcontractor_rates r
set vendor_id = v.id
from public.subs_vendors v
where r.vendor_id is null
  and r.company_name is not null
  and r.company_name = v.company_name;

-- Resync the denormalized name from the live vendor (fixes any rename made before
-- the auto-sync existed, and any future drift).
update public.subcontractor_rates r
set company_name = v.company_name
from public.subs_vendors v
where r.vendor_id = v.id
  and r.company_name is distinct from v.company_name;
