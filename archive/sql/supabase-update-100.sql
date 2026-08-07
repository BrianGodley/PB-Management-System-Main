-- supabase-update-100.sql
-- E-Documents: a PandaDoc/DocuSign-style template + e-signature system.
--
-- Two tables:
--   edoc_templates  — reusable documents (a source PDF + placed fillable fields)
--   edoc_documents  — an instance created from a template (or blank), sent to a
--                     client for tokenized (no-login) signing, with a status
--                     lifecycle Draft → Sent → Viewed → Completed → Paid.
--
-- Plus a public storage bucket 'edocuments' that holds both template source
-- PDFs and finished/flattened signed PDFs. It's public (like job-files /
-- hr-files) so the in-app viewer AND the tokenized public signer page can
-- fetch by URL without an authenticated session. URLs are unguessable.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Templates ────────────────────────────────────────────────────────────────
create table if not exists edoc_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  pdf_path     text,            -- storage path of the source PDF in 'edocuments'
  page_count   int  default 1,
  -- fields: array of placed field definitions, e.g.
  --   [{ id, page, xPct, yPct, wPct, hPct, type:'text'|'date'|'signature'|'checkbox',
  --      role:'contractor'|'buyer', label, key, required }]
  fields       jsonb default '[]'::jsonb,
  is_active    boolean default true,
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2) Documents (instances) ─────────────────────────────────────────────────────
create table if not exists edoc_documents (
  id                 uuid primary key default gen_random_uuid(),
  template_id        uuid references edoc_templates(id) on delete set null,
  client_id          uuid references clients(id) on delete set null,
  estimate_id        uuid references estimates(id) on delete set null,
  name               text not null,
  -- Lifecycle. 'declined' and 'voided' are terminal off-ramps.
  status             text not null default 'draft'
                       check (status in ('draft','sent','viewed','completed','paid','declined','voided')),
  pdf_path           text,             -- working/source PDF (copied from template)
  page_count         int default 1,
  -- fields carries both the placed definitions AND their captured values:
  --   [{ ...fieldDef, value }]
  fields             jsonb default '[]'::jsonb,
  signer_name        text,
  signer_email       text,
  -- Tokenized public signing link: /sign/<access_token>
  access_token       text unique default replace(gen_random_uuid()::text, '-', ''),
  sent_at            timestamptz,
  viewed_at          timestamptz,
  completed_at       timestamptz,
  signed_pdf_path    text,             -- flattened final PDF after signing
  signature_data_url text,             -- buyer signature PNG (also flattened in)
  decline_reason     text,
  amount             numeric,          -- contract price (drives 'paid' later)
  created_by         uuid references auth.users(id),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists edoc_documents_client_idx   on edoc_documents(client_id);
create index if not exists edoc_documents_status_idx   on edoc_documents(status);
create index if not exists edoc_documents_creator_idx  on edoc_documents(created_by);
create index if not exists edoc_documents_token_idx    on edoc_documents(access_token);

-- 3) RLS — authenticated staff can do everything; the tokenized public signer
--    flow will be served via a SECURITY DEFINER RPC added in a later phase
--    (so we don't open the tables to anon here).
alter table edoc_templates  enable row level security;
alter table edoc_documents  enable row level security;

do $$ begin
  create policy "edoc_templates_all" on edoc_templates
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "edoc_documents_all" on edoc_documents
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- 4) Storage bucket for template + signed PDFs (public, like job-files/hr-files)
insert into storage.buckets (id, name, public)
values ('edocuments', 'edocuments', true)
on conflict (id) do nothing;

do $$ begin
  create policy "edocuments_read"   on storage.objects for select to authenticated using (bucket_id = 'edocuments');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "edocuments_write"  on storage.objects for insert to authenticated with check (bucket_id = 'edocuments');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "edocuments_delete" on storage.objects for delete to authenticated using (bucket_id = 'edocuments');
exception when duplicate_object then null; end $$;
-- Public read (anon) so the tokenized signer page can load the PDF by URL.
do $$ begin
  create policy "edocuments_public_read" on storage.objects for select to anon using (bucket_id = 'edocuments');
exception when duplicate_object then null; end $$;
