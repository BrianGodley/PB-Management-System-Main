-- supabase-update-101.sql
-- E-Documents phase 2: tokenized public signing.
--
-- The signer opens /sign/<access_token> with NO login. These SECURITY DEFINER
-- RPCs are the only way an anonymous visitor touches edoc_documents — they key
-- strictly on the access_token and never expose the full table. RLS stays on.
-- ─────────────────────────────────────────────────────────────────────────────

-- Read a document for signing. Only sent/viewed/completed are visible (a draft
-- or voided doc returns null). Returns just the fields the signer page needs.
create or replace function edoc_get_by_token(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', id,
    'name', name,
    'pdf_path', pdf_path,
    'page_count', page_count,
    'fields', fields,
    'status', status,
    'signer_name', signer_name,
    'completed_at', completed_at
  )
  from edoc_documents
  where access_token = p_token
    and status in ('sent', 'viewed', 'completed')
  limit 1;
$$;

-- Mark the document opened (sent → viewed). Idempotent; no-op once past 'sent'.
create or replace function edoc_mark_viewed(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update edoc_documents
     set status = 'viewed',
         viewed_at = coalesce(viewed_at, now()),
         updated_at = now()
   where access_token = p_token
     and status = 'sent';
$$;

-- Submit the signed document: persist the filled field values + signature and
-- flip to 'completed'. Rejects if the doc isn't currently sent/viewed.
create or replace function edoc_submit(
  p_token     text,
  p_fields    jsonb,
  p_signature text,
  p_signed_by text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update edoc_documents
     set fields = coalesce(p_fields, fields),
         signature_data_url = coalesce(p_signature, signature_data_url),
         signer_name = coalesce(nullif(p_signed_by, ''), signer_name),
         status = 'completed',
         completed_at = now(),
         updated_at = now()
   where access_token = p_token
     and status in ('sent', 'viewed')
   returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'Document not found or already completed.');
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function edoc_get_by_token(text) to anon, authenticated;
grant execute on function edoc_mark_viewed(text) to anon, authenticated;
grant execute on function edoc_submit(text, jsonb, text, text) to anon, authenticated;
