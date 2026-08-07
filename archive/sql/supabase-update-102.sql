-- supabase-update-102.sql
-- E-Documents phase 3: optional deposit collection with signing.
--
-- Staff can flag a document to collect a deposit (write-in amount). After the
-- buyer signs, they're prompted to pay it through HelcimPay; on success the
-- document flips to 'paid'. The deposit amount is ALWAYS read server-side from
-- this table (never trusted from the browser) — the helcim-checkout edge
-- function derives it from the access_token.
-- ─────────────────────────────────────────────────────────────────────────────

alter table edoc_documents
  add column if not exists deposit_required    boolean default false,
  add column if not exists deposit_amount      numeric,
  add column if not exists deposit_paid_amount numeric,
  add column if not exists deposit_paid_at     timestamptz,
  add column if not exists deposit_txn_id      text;

-- Extend the tokenized read so the signer page knows whether/how much to collect.
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
    'completed_at', completed_at,
    'deposit_required', deposit_required,
    'deposit_amount', deposit_amount,
    'deposit_paid_at', deposit_paid_at
  )
  from edoc_documents
  where access_token = p_token
    and status in ('sent', 'viewed', 'completed', 'paid')
  limit 1;
$$;

-- Record a successful deposit payment (called after HelcimPay SUCCESS). The
-- amount is taken from this table, not the client; p_amount is only stored for
-- reconciliation reference. Marks the document 'paid'.
create or replace function edoc_record_deposit(
  p_token  text,
  p_amount numeric,
  p_txn    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid;
begin
  select id into v_id
    from edoc_documents
   where access_token = p_token
     and deposit_required = true
     and deposit_paid_at is null;
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'No outstanding deposit for this document.');
  end if;

  update edoc_documents
     set deposit_paid_amount = coalesce(p_amount, deposit_amount),
         deposit_paid_at = now(),
         deposit_txn_id = p_txn,
         status = 'paid',
         updated_at = now()
   where id = v_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function edoc_record_deposit(text, numeric, text) to anon, authenticated;
