-- Change-order release workflow: the client portal must only show change
-- orders that have been RELEASED (status <> 'unreleased'). Unreleased COs are
-- drafts the contractor hasn't sent yet.
--
-- Run in Supabase SQL editor (after supabase-update-93.sql). This re-creates
-- portal_change_orders with the same shape as 93, adding the unreleased filter.

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
    RETURN;
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
    AND COALESCE(b.status, '') <> 'unreleased' -- hide drafts not yet released
  ORDER BY b.date_submitted DESC NULLS LAST, b.custom_co_id DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION portal_change_orders(uuid) TO authenticated;
