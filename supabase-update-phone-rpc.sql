-- RPC: get_phone_by_email
-- Returns the cell_phone for a given email from the employees table.
-- Runs as SECURITY DEFINER so it bypasses RLS (needed on the login screen
-- where the user is not yet authenticated).

CREATE OR REPLACE FUNCTION get_phone_by_email(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  SELECT cell_phone INTO v_phone
  FROM employees
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  RETURN v_phone;
END;
$$;

-- Grant execute to anonymous (unauthenticated) callers
GRANT EXECUTE ON FUNCTION get_phone_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION get_phone_by_email(text) TO authenticated;
