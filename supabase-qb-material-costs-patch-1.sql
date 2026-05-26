-- ─────────────────────────────────────────────────────────────────────────
-- qb-material-costs PATCH 1
--
-- Two follow-up fixes to supabase-qb-material-costs.sql discovered on the
-- first live QBWC run:
--
--   1. The partial unique indexes (CREATE UNIQUE INDEX … WHERE … IS NOT NULL)
--      can't be used as ON CONFLICT targets by PostgREST upserts, because
--      Postgres only infers a partial index for ON CONFLICT when the upsert
--      restates the partial WHERE clause — which the Supabase client doesn't.
--      Replaced each with a proper UNIQUE constraint; Postgres allows
--      multiple NULLs in a UNIQUE constraint by default, so manual rows with
--      qb_txn_id/qb_line_id NULL aren't affected.
--
--   2. PostgREST caches the schema and didn't pick up the new tables and
--      columns automatically. The trailing NOTIFY forces a reload so the
--      edge function sees everything immediately.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- Headers — drop the partial indexes, add real unique constraints.
DROP INDEX IF EXISTS acct_bills_qb_txn_id_uq;
ALTER TABLE acct_bills
  ADD CONSTRAINT acct_bills_qb_txn_id_uq UNIQUE (qb_txn_id);

DROP INDEX IF EXISTS acct_checks_qb_txn_id_uq;
ALTER TABLE acct_checks
  ADD CONSTRAINT acct_checks_qb_txn_id_uq UNIQUE (qb_txn_id);

DROP INDEX IF EXISTS acct_credit_card_charges_qb_txn_id_uq;
ALTER TABLE acct_credit_card_charges
  ADD CONSTRAINT acct_credit_card_charges_qb_txn_id_uq UNIQUE (qb_txn_id);

DROP INDEX IF EXISTS acct_item_receipts_qb_txn_id_uq;
ALTER TABLE acct_item_receipts
  ADD CONSTRAINT acct_item_receipts_qb_txn_id_uq UNIQUE (qb_txn_id);

-- Line tables — same fix for qb_line_id.
DROP INDEX IF EXISTS acct_bill_lines_qb_line_id_uq;
ALTER TABLE acct_bill_lines
  ADD CONSTRAINT acct_bill_lines_qb_line_id_uq UNIQUE (qb_line_id);

DROP INDEX IF EXISTS acct_check_lines_qb_line_id_uq;
ALTER TABLE acct_check_lines
  ADD CONSTRAINT acct_check_lines_qb_line_id_uq UNIQUE (qb_line_id);

DROP INDEX IF EXISTS acct_cc_lines_qb_line_id_uq;
ALTER TABLE acct_credit_card_charge_lines
  ADD CONSTRAINT acct_cc_lines_qb_line_id_uq UNIQUE (qb_line_id);

DROP INDEX IF EXISTS acct_ir_lines_qb_line_id_uq;
ALTER TABLE acct_item_receipt_lines
  ADD CONSTRAINT acct_ir_lines_qb_line_id_uq UNIQUE (qb_line_id);

COMMIT;

-- Force PostgREST to reload its schema cache so the new columns and
-- constraints are immediately visible to the edge function.
NOTIFY pgrst, 'reload schema';
