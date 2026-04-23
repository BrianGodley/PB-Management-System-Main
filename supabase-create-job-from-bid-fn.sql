-- Drop old version and recreate with correct column names
DROP FUNCTION IF EXISTS create_job_from_bid;

CREATE OR REPLACE FUNCTION create_job_from_bid(
  p_estimate_id   uuid,
  p_client_id     uuid,
  p_client_name   text,
  p_name          text,
  p_sold_date     timestamptz,
  p_total_price   numeric,
  p_gross_profit  numeric,
  p_gpmd          numeric,
  p_status        text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  INSERT INTO jobs (
    estimate_id, client_id, client_name, name,
    sold_date, total_price, gross_profit, gpmd, status
  )
  VALUES (
    p_estimate_id, p_client_id, p_client_name, p_name,
    p_sold_date, p_total_price, p_gross_profit, p_gpmd, p_status
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;
