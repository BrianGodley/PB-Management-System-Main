-- ─────────────────────────────────────────────────────────────────────
-- Patch v_acct_account_register so transactions show up.
-- Two fixes:
--   1. Backfill *_lines.account_id from the existing qb_account_name
--      strings — the qbwc parser stored the QB account name on each
--      line but never resolved it to acct_accounts.id, so the line-item
--      joins returned nothing.
--   2. Rebuild the view with case-insensitive name matching on the
--      bank/CC funding side. We title-cased acct_accounts.name and
--      qb_full_name earlier; bank_account_name and credit_card_account_name
--      on checks/CC are still in QB's original casing, so the old
--      exact-= join never matched.
-- ─────────────────────────────────────────────────────────────────────

BEGIN;

UPDATE acct_bill_lines bl
   SET account_id = a.id
  FROM acct_accounts a
 WHERE bl.account_id IS NULL
   AND bl.qb_account_name IS NOT NULL
   AND lower(a.qb_full_name) = lower(bl.qb_account_name);

UPDATE acct_check_lines cl
   SET account_id = a.id
  FROM acct_accounts a
 WHERE cl.account_id IS NULL
   AND cl.qb_account_name IS NOT NULL
   AND lower(a.qb_full_name) = lower(cl.qb_account_name);

UPDATE acct_credit_card_charge_lines ccl
   SET account_id = a.id
  FROM acct_accounts a
 WHERE ccl.account_id IS NULL
   AND ccl.qb_account_name IS NOT NULL
   AND lower(a.qb_full_name) = lower(ccl.qb_account_name);

UPDATE acct_item_receipt_lines irl
   SET account_id = a.id
  FROM acct_accounts a
 WHERE irl.account_id IS NULL
   AND irl.qb_account_name IS NOT NULL
   AND lower(a.qb_full_name) = lower(irl.qb_account_name);

DROP VIEW IF EXISTS v_acct_account_register;
CREATE VIEW v_acct_account_register AS
SELECT a.id AS account_id, c.date AS txn_date, c.ref_number AS ref, c.payee_name AS payee,
       'CHK' AS txn_type, c.payee_name AS offset_party, c.memo, c.total AS amount,
       'check' AS source_type, c.id AS source_id
FROM acct_checks c
JOIN acct_accounts a
  ON  lower(a.name)         = lower(c.bank_account_name)
   OR lower(a.qb_full_name) = lower(c.bank_account_name)
WHERE c.bank_account_name IS NOT NULL
UNION ALL
SELECT a.id, cc.date, cc.ref_number, cc.payee_name,
       'CC', cc.payee_name, cc.memo, cc.total, 'credit_card_charge', cc.id
FROM acct_credit_card_charges cc
JOIN acct_accounts a
  ON  lower(a.name)         = lower(cc.credit_card_account_name)
   OR lower(a.qb_full_name) = lower(cc.credit_card_account_name)
WHERE cc.credit_card_account_name IS NOT NULL
UNION ALL
SELECT bl.account_id, b.date, b.number, b.vendor_name,
       'BILL', b.vendor_name, bl.description, bl.amount, 'bill_line', b.id
FROM acct_bill_lines bl
JOIN acct_bills b ON b.id = bl.bill_id
WHERE bl.account_id IS NOT NULL
UNION ALL
SELECT cl.account_id, c.date, c.ref_number, c.payee_name,
       'CHK', c.payee_name, cl.description, cl.amount, 'check_line', c.id
FROM acct_check_lines cl
JOIN acct_checks c ON c.id = cl.check_id
WHERE cl.account_id IS NOT NULL
UNION ALL
SELECT ccl.account_id, cc.date, cc.ref_number, cc.payee_name,
       'CC', cc.payee_name, ccl.description, ccl.amount, 'cc_line', cc.id
FROM acct_credit_card_charge_lines ccl
JOIN acct_credit_card_charges cc ON cc.id = ccl.charge_id
WHERE ccl.account_id IS NOT NULL
UNION ALL
SELECT irl.account_id, ir.date, ir.ref_number, ir.vendor_name,
       'IR', ir.vendor_name, irl.description, irl.amount, 'ir_line', ir.id
FROM acct_item_receipt_lines irl
JOIN acct_item_receipts ir ON ir.id = irl.receipt_id
WHERE irl.account_id IS NOT NULL
UNION ALL
SELECT il.account_id, i.date, i.number, i.client_name,
       'INV', i.client_name, il.description, il.amount, 'invoice_line', i.id
FROM acct_invoice_lines il
JOIN acct_invoices i ON i.id = il.invoice_id
WHERE il.account_id IS NOT NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
