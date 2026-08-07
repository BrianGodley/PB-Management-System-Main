-- ─────────────────────────────────────────────────────────────────────
-- v_acct_account_txn_counts — references-per-account across the whole
-- accounting set. Used by the Chart of Accounts UI to show each
-- account's "Txns" count alongside name + status.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_acct_account_txn_counts AS
SELECT account_id, COUNT(*) AS txn_count
FROM (
  SELECT account_id FROM acct_bill_lines                  WHERE account_id IS NOT NULL
  UNION ALL
  SELECT account_id FROM acct_check_lines                 WHERE account_id IS NOT NULL
  UNION ALL
  SELECT account_id FROM acct_credit_card_charge_lines    WHERE account_id IS NOT NULL
  UNION ALL
  SELECT account_id FROM acct_item_receipt_lines          WHERE account_id IS NOT NULL
  UNION ALL
  SELECT account_id FROM acct_invoice_lines               WHERE account_id IS NOT NULL
  UNION ALL
  SELECT category_id AS account_id FROM acct_bank_transactions WHERE category_id IS NOT NULL
) all_refs
GROUP BY account_id;

NOTIFY pgrst, 'reload schema';
