-- ============================================================================
-- Subs & Vendors: Quotes
-- ----------------------------------------------------------------------------
-- One row per quote — either a request we send to a vendor (direction
-- 'request') or a quote we received (direction 'received'). Line items live in
-- jsonb; received quotes may also carry an attached file in the sub-vendor-files
-- bucket (file_path / file_name).
--
-- Reuses the "sub-vendor-files" storage bucket created by
-- supabase-subs-vendors-price-list-files.sql — run that first if you haven't.
-- ============================================================================

create table if not exists sub_vendor_quotes (
  id            uuid primary key default gen_random_uuid(),
  sub_vendor_id uuid references subs_vendors(id) on delete set null,
  vendor_name   text,
  job_id        uuid references jobs(id) on delete set null,
  job_name      text,
  direction     text not null default 'request',  -- 'request' | 'received'
  line_items    jsonb not null default '[]'::jsonb,
  -- [{name, part, qty, unit, unit_price, total}]
  total         numeric not null default 0,
  status        text not null default 'draft',     -- 'draft' | 'sent' | 'received'
  sent_method   text,                              -- 'text' | 'email' | 'both'
  sent_at       timestamptz,
  file_path     text,                              -- received-quote attachment
  file_name     text,
  notes         text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists sub_vendor_quotes_vendor_idx on sub_vendor_quotes (sub_vendor_id);
create index if not exists sub_vendor_quotes_job_idx on sub_vendor_quotes (job_id);

alter table sub_vendor_quotes enable row level security;

drop policy if exists "sub_vendor_quotes_all" on sub_vendor_quotes;
create policy "sub_vendor_quotes_all"
  on sub_vendor_quotes for all
  to authenticated
  using (true)
  with check (true);
