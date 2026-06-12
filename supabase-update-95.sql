-- Allow the new 'unreleased' change-order status.
--
-- New change orders now save with status = 'unreleased' (draft, not yet sent
-- to the client). If bids.status has a CHECK constraint limited to the old
-- values, those inserts fail — which breaks creating both manual and estimator
-- change orders. This drops any status CHECK constraint on bids and re-adds a
-- permissive one that includes 'unreleased'.

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'bids'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE bids DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- Re-add a permissive status check that includes every value the app uses.
ALTER TABLE bids
  ADD CONSTRAINT bids_status_check
  CHECK (
    status IS NULL
    OR status IN ('unreleased', 'pending', 'presented', 'sold', 'lost')
  );
