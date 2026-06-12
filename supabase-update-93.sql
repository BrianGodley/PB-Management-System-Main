-- Client-portal change orders: view details + approve / decline + sign.
-- Run in Supabase SQL editor (after supabase-update-92.sql).
--
-- Security model (matches the rest of the portal):
--   client_portals(auth_user_id -> client_id) maps an authenticated portal
--   user to their client. jobs.client_id scopes a client's jobs; change orders
--   live in bids (record_type='change_order', linked_job_id -> jobs.id).

-- 1. Reason a client gives when declining a change order.
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS co_decline_reason text;

-- 2. Read RPC — full detail set the portal modal needs, scoped to the caller's
--    client. Preview-safe: a real client always has a client_portals row, so
--    their own row wins and they can never use p_client_id to peek at another
--    client. Only users WITHOUT a portal row (staff preview) fall back to it.
--
-- Drop any prior version first — CREATE OR REPLACE cannot change an existing
-- function's return type/signature, and the original may differ.
DROP FUNCTION IF EXISTS portal_change_orders();
DROP FUNCTION IF EXISTS portal_change_orders(uuid);
CREATE OR REPLACE FUNCTION portal_change_orders(p_client_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  linked_job_id uuid,
  custom_co_id integer,
  co_name text,
  co_method text,
  scope_of_work_html text,
  bid_amount numeric,
  status text,
  co_line_items jsonb,
  co_decline_reason text,
  signed_at timestamptz,
  signed_by_name text,
  signature_data_url text,
  date_submitted date,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT cp.client_id INTO v_client_id
  FROM client_portals cp
  WHERE cp.auth_user_id = auth.uid() AND cp.status = 'active'
  LIMIT 1;

  IF v_client_id IS NULL THEN
    v_client_id := p_client_id; -- staff preview (no portal row of their own)
  END IF;

  IF v_client_id IS NULL THEN
    RETURN; -- nothing to show
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.linked_job_id,
    b.custom_co_id,
    b.co_name,
    b.co_method,
    b.scope_of_work_html,
    b.bid_amount,
    b.status,
    COALESCE(b.co_line_items, '[]'::jsonb),
    b.co_decline_reason,
    b.signed_at,
    b.signed_by_name,
    b.signature_data_url,
    b.date_submitted,
    b.created_at
  FROM bids b
  JOIN jobs j ON j.id = b.linked_job_id
  WHERE b.record_type = 'change_order'
    AND j.client_id = v_client_id
  ORDER BY b.date_submitted DESC NULLS LAST, b.custom_co_id DESC NULLS LAST;
END;
$$;

-- 3. Approve RPC — flips status to 'sold', records the signature, and creates a
--    single work order for the job (idempotent). Writes resolve the client
--    strictly from the authenticated session, never from a passed id.
CREATE OR REPLACE FUNCTION portal_approve_change_order(
  p_co_id uuid,
  p_signed_by text,
  p_signature text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_job_id uuid;
BEGIN
  SELECT cp.client_id INTO v_client_id
  FROM client_portals cp
  WHERE cp.auth_user_id = auth.uid() AND cp.status = 'active'
  LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not an active portal user';
  END IF;

  SELECT b.linked_job_id INTO v_job_id
  FROM bids b
  JOIN jobs j ON j.id = b.linked_job_id
  WHERE b.id = p_co_id
    AND b.record_type = 'change_order'
    AND j.client_id = v_client_id;
  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Change order not found for this client';
  END IF;

  UPDATE bids
  SET status = 'sold',
      signed_at = now(),
      signed_by_name = p_signed_by,
      signature_data_url = p_signature,
      co_decline_reason = NULL
  WHERE id = p_co_id;

  -- One work order per approved CO.
  IF NOT EXISTS (SELECT 1 FROM work_orders w WHERE w.source_change_order_id = p_co_id) THEN
    INSERT INTO work_orders (
      job_id, project_name, module_type, is_manual,
      labor_hours, material_cost, total_price, status, notes, source_change_order_id
    )
    SELECT
      v_job_id,
      COALESCE(b.co_name, 'Change Order'),
      'Change Order',
      true,
      COALESCE((SELECT SUM((it->>'labor_hours')::numeric)
                FROM jsonb_array_elements(COALESCE(b.co_line_items, '[]'::jsonb)) it), 0),
      COALESCE((SELECT SUM((it->>'material_cost')::numeric)
                FROM jsonb_array_elements(COALESCE(b.co_line_items, '[]'::jsonb)) it), 0),
      COALESCE(b.bid_amount, 0),
      'pending',
      'From Change Order #' || COALESCE(b.custom_co_id::text, ''),
      p_co_id
    FROM bids b
    WHERE b.id = p_co_id;
  END IF;

  RETURN 'approved';
END;
$$;

-- 4. Decline RPC — flips status to 'lost' and records the client's reason.
CREATE OR REPLACE FUNCTION portal_decline_change_order(
  p_co_id uuid,
  p_reason text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_job_id uuid;
BEGIN
  SELECT cp.client_id INTO v_client_id
  FROM client_portals cp
  WHERE cp.auth_user_id = auth.uid() AND cp.status = 'active'
  LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not an active portal user';
  END IF;

  SELECT b.linked_job_id INTO v_job_id
  FROM bids b
  JOIN jobs j ON j.id = b.linked_job_id
  WHERE b.id = p_co_id
    AND b.record_type = 'change_order'
    AND j.client_id = v_client_id;
  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Change order not found for this client';
  END IF;

  UPDATE bids
  SET status = 'lost',
      co_decline_reason = p_reason
  WHERE id = p_co_id;

  RETURN 'declined';
END;
$$;

GRANT EXECUTE ON FUNCTION portal_change_orders(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION portal_approve_change_order(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION portal_decline_change_order(uuid, text) TO authenticated;
