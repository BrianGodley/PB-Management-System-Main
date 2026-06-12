-- ============================================================================
-- Subs & Vendors: Contracts
-- ----------------------------------------------------------------------------
-- One row per contract signed with a sub or vendor. A contract is either:
--   • "built"    — line items + totals + scope/exclusions + drawn signature +
--                  the standard agreement terms (all stored on the row), or
--   • "uploaded" — an existing file kept in the sub-vendor-files bucket
--                  (file_path / file_name).
--
-- Uploaded contract files live in the SAME "sub-vendor-files" storage bucket
-- created by supabase-subs-vendors-price-list-files.sql. Run that script first
-- (or at least its bucket + policy section) if you haven't already.
-- ============================================================================

create table if not exists sub_vendor_contracts (
  id            uuid primary key default gen_random_uuid(),
  sub_vendor_id uuid references subs_vendors(id) on delete cascade,
  party_type    text,                       -- 'sub' | 'vendor' (snapshot)
  party_name    text,                       -- company name (snapshot)
  kind          text not null default 'built',  -- 'built' | 'uploaded'
  line_items    jsonb not null default '[]'::jsonb, -- [{item,qty,unit,unit_price,total}]
  total         numeric not null default 0,
  scope_of_work text,
  exclusions    text,
  agreement_text text,
  signature_data text,                       -- PNG data URL of the drawn signature
  signer_name   text,
  signed_date   date,
  file_path     text,                        -- uploaded contracts: path in sub-vendor-files
  file_name     text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists sub_vendor_contracts_party_idx
  on sub_vendor_contracts (sub_vendor_id);

-- RLS: authenticated users have full access (matches the rest of the app).
alter table sub_vendor_contracts enable row level security;

drop policy if exists "sub_vendor_contracts_all" on sub_vendor_contracts;
create policy "sub_vendor_contracts_all"
  on sub_vendor_contracts for all
  to authenticated
  using (true)
  with check (true);
