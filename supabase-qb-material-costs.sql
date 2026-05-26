-- ═════════════════════════════════════════════════════════════════════════════
-- QuickBooks Material-Costs pull — schema (phase 1)
--
-- Extends the existing AP module (acct_bills / acct_bill_lines) and adds
-- three parallel tables for the other QB transaction types that carry
-- job-tagged material costs (Checks, Credit Card Charges, Item Receipts).
--
-- Every line table gains:
--   * qb_line_id              — idempotent upsert key from QB's TxnLineID
--   * job_id                  — resolved PBS job (filled by trigger via fuzzy match)
--   * qb_customer_full_name   — raw QB "Customer:Job" string for fallback display
--   * item_name               — QB ItemRef.FullName (for item lines)
--   * qb_account_name         — QB AccountRef.FullName (for expense lines)
--   * line_type               — 'item' | 'expense'
--   * billable_status / class_name
--
-- Every header table gains:
--   * qb_txn_id               — idempotent upsert key from QB's TxnID
--   * qb_edit_sequence / qb_time_created / qb_time_modified
--   * qb_synced_at
--   * source                  — 'manual' | 'qb' (so QB-imports don't clobber manual edits)
--
-- Jobs table gains:
--   * qb_customer_full_name   — optional manual override
--   * qb_customer_list_id     — optional manual override (QB ListID)
--
-- Fuzzy match: pg_trgm-based function match_qb_customer_to_job() returns the
-- best PBS job for a given QB "Customer:Job" string (similarity > 0.55). A
-- BEFORE INSERT/UPDATE trigger on each *_lines table auto-fills job_id when
-- it is null, so the qbwc edge function never has to know how matching works.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

-- pg_trgm powers the fuzzy similarity() function used by the matcher.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── jobs: optional QB-customer fields for manual mapping ───────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS qb_customer_full_name TEXT,
  ADD COLUMN IF NOT EXISTS qb_customer_list_id   TEXT;

-- Trigram index on client_name so similarity() lookups are fast even at
-- thousands of jobs.
CREATE INDEX IF NOT EXISTS jobs_client_name_trgm
  ON jobs USING gin (client_name gin_trgm_ops);

-- ── acct_bills: extend with QB sync columns ────────────────────────────────
ALTER TABLE acct_bills
  ADD COLUMN IF NOT EXISTS qb_txn_id         TEXT,
  ADD COLUMN IF NOT EXISTS qb_edit_sequence  TEXT,
  ADD COLUMN IF NOT EXISTS qb_time_created   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qb_time_modified  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qb_synced_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source            TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','qb'));

-- Partial unique index — manual bills (qb_txn_id NULL) aren't affected.
CREATE UNIQUE INDEX IF NOT EXISTS acct_bills_qb_txn_id_uq
  ON acct_bills(qb_txn_id) WHERE qb_txn_id IS NOT NULL;

-- ── acct_bill_lines: extend with job link + QB fields ──────────────────────
ALTER TABLE acct_bill_lines
  ADD COLUMN IF NOT EXISTS qb_line_id            TEXT,
  ADD COLUMN IF NOT EXISTS line_type             TEXT CHECK (line_type IN ('item','expense')),
  ADD COLUMN IF NOT EXISTS job_id                UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qb_customer_full_name TEXT,
  ADD COLUMN IF NOT EXISTS qb_account_name       TEXT,
  ADD COLUMN IF NOT EXISTS item_name             TEXT,
  ADD COLUMN IF NOT EXISTS billable_status       TEXT,
  ADD COLUMN IF NOT EXISTS class_name            TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS acct_bill_lines_qb_line_id_uq
  ON acct_bill_lines(qb_line_id) WHERE qb_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS acct_bill_lines_job_id_idx
  ON acct_bill_lines(job_id) WHERE job_id IS NOT NULL;

-- ── acct_checks ───────────────────────────────────────────────────────────
-- Direct check payments (often a one-off material pickup paid by check).
CREATE TABLE IF NOT EXISTS acct_checks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_txn_id         TEXT,
  ref_number        TEXT,                    -- check number
  payee_type        TEXT,                    -- 'vendor' | 'employee' | 'other_name'
  payee_id          UUID        REFERENCES subs_vendors(id) ON DELETE SET NULL,
  payee_name        TEXT,
  bank_account_id   UUID        REFERENCES acct_bank_accounts(id) ON DELETE SET NULL,
  bank_account_name TEXT,
  date              DATE        NOT NULL,
  total             NUMERIC(12,2) DEFAULT 0,
  memo              TEXT,
  is_to_be_printed  BOOLEAN,
  source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','qb')),
  qb_edit_sequence  TEXT,
  qb_time_created   TIMESTAMPTZ,
  qb_time_modified  TIMESTAMPTZ,
  qb_synced_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS acct_checks_qb_txn_id_uq
  ON acct_checks(qb_txn_id) WHERE qb_txn_id IS NOT NULL;
ALTER TABLE acct_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_checks_all" ON acct_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS acct_check_lines (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id              UUID        NOT NULL REFERENCES acct_checks(id) ON DELETE CASCADE,
  qb_line_id            TEXT,
  line_type             TEXT        CHECK (line_type IN ('item','expense')),
  job_id                UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  qb_customer_full_name TEXT,
  account_id            UUID        REFERENCES acct_accounts(id),
  qb_account_name       TEXT,
  item_name             TEXT,
  description           TEXT,
  quantity              NUMERIC(10,2),
  unit_price            NUMERIC(12,2),
  amount                NUMERIC(12,2) DEFAULT 0,
  billable_status       TEXT,
  class_name            TEXT,
  sort_order            INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS acct_check_lines_qb_line_id_uq
  ON acct_check_lines(qb_line_id) WHERE qb_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS acct_check_lines_check_id_idx ON acct_check_lines(check_id);
CREATE INDEX IF NOT EXISTS acct_check_lines_job_id_idx ON acct_check_lines(job_id) WHERE job_id IS NOT NULL;
ALTER TABLE acct_check_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_check_lines_all" ON acct_check_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── acct_credit_card_charges ──────────────────────────────────────────────
-- Home Depot / Lowes / Amazon runs paid on a company card.
CREATE TABLE IF NOT EXISTS acct_credit_card_charges (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_txn_id            TEXT,
  ref_number           TEXT,
  payee_type           TEXT,
  payee_id             UUID        REFERENCES subs_vendors(id) ON DELETE SET NULL,
  payee_name           TEXT,
  credit_card_account_id   UUID    REFERENCES acct_bank_accounts(id) ON DELETE SET NULL,
  credit_card_account_name TEXT,
  date                 DATE        NOT NULL,
  total                NUMERIC(12,2) DEFAULT 0,
  memo                 TEXT,
  source               TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','qb')),
  qb_edit_sequence     TEXT,
  qb_time_created      TIMESTAMPTZ,
  qb_time_modified     TIMESTAMPTZ,
  qb_synced_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS acct_credit_card_charges_qb_txn_id_uq
  ON acct_credit_card_charges(qb_txn_id) WHERE qb_txn_id IS NOT NULL;
ALTER TABLE acct_credit_card_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_credit_card_charges_all" ON acct_credit_card_charges FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS acct_credit_card_charge_lines (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id             UUID        NOT NULL REFERENCES acct_credit_card_charges(id) ON DELETE CASCADE,
  qb_line_id            TEXT,
  line_type             TEXT        CHECK (line_type IN ('item','expense')),
  job_id                UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  qb_customer_full_name TEXT,
  account_id            UUID        REFERENCES acct_accounts(id),
  qb_account_name       TEXT,
  item_name             TEXT,
  description           TEXT,
  quantity              NUMERIC(10,2),
  unit_price            NUMERIC(12,2),
  amount                NUMERIC(12,2) DEFAULT 0,
  billable_status       TEXT,
  class_name            TEXT,
  sort_order            INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS acct_cc_lines_qb_line_id_uq
  ON acct_credit_card_charge_lines(qb_line_id) WHERE qb_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS acct_cc_lines_charge_id_idx ON acct_credit_card_charge_lines(charge_id);
CREATE INDEX IF NOT EXISTS acct_cc_lines_job_id_idx ON acct_credit_card_charge_lines(job_id) WHERE job_id IS NOT NULL;
ALTER TABLE acct_credit_card_charge_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_cc_lines_all" ON acct_credit_card_charge_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── acct_item_receipts ────────────────────────────────────────────────────
-- Goods received before a bill arrives. Usually superseded by the bill, but
-- some shops stop at the receipt and never convert. Tracking both is safer.
CREATE TABLE IF NOT EXISTS acct_item_receipts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_txn_id         TEXT,
  ref_number        TEXT,
  vendor_id         UUID        REFERENCES subs_vendors(id) ON DELETE SET NULL,
  vendor_name       TEXT,
  date              DATE        NOT NULL,
  total             NUMERIC(12,2) DEFAULT 0,
  memo              TEXT,
  source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','qb')),
  qb_edit_sequence  TEXT,
  qb_time_created   TIMESTAMPTZ,
  qb_time_modified  TIMESTAMPTZ,
  qb_synced_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS acct_item_receipts_qb_txn_id_uq
  ON acct_item_receipts(qb_txn_id) WHERE qb_txn_id IS NOT NULL;
ALTER TABLE acct_item_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_item_receipts_all" ON acct_item_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS acct_item_receipt_lines (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id            UUID        NOT NULL REFERENCES acct_item_receipts(id) ON DELETE CASCADE,
  qb_line_id            TEXT,
  line_type             TEXT        CHECK (line_type IN ('item','expense')),
  job_id                UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  qb_customer_full_name TEXT,
  account_id            UUID        REFERENCES acct_accounts(id),
  qb_account_name       TEXT,
  item_name             TEXT,
  description           TEXT,
  quantity              NUMERIC(10,2),
  unit_price            NUMERIC(12,2),
  amount                NUMERIC(12,2) DEFAULT 0,
  billable_status       TEXT,
  class_name            TEXT,
  sort_order            INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS acct_ir_lines_qb_line_id_uq
  ON acct_item_receipt_lines(qb_line_id) WHERE qb_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS acct_ir_lines_receipt_id_idx ON acct_item_receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS acct_ir_lines_job_id_idx ON acct_item_receipt_lines(job_id) WHERE job_id IS NOT NULL;
ALTER TABLE acct_item_receipt_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_ir_lines_all" ON acct_item_receipt_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═════════════════════════════════════════════════════════════════════════════
-- Fuzzy match — QB "Customer:Job" string → PBS jobs.id
--
-- QB's CustomerRef.FullName is hierarchical: "Smith, John:Backyard Reno".
-- We try the root, the sub, and the job address against PBS jobs.client_name
-- using pg_trgm similarity, taking the best match above threshold 0.55.
-- 0.55 is conservative — empirically matches typos and "John" vs "Jonathon"
-- but won't cross unrelated names. Tune via the SIM_THRESHOLD constant in
-- function body.
--
-- A job can also be linked manually by setting jobs.qb_customer_full_name —
-- that shortcuts the fuzzy match (exact match wins).
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION match_qb_customer_to_job(qb_name TEXT)
RETURNS UUID
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_id          UUID;
  v_root_name   TEXT := split_part(qb_name, ':', 1);
  v_sub_name    TEXT := NULLIF(split_part(qb_name, ':', 2), '');
  SIM_THRESHOLD CONSTANT FLOAT := 0.55;
BEGIN
  IF qb_name IS NULL OR length(trim(qb_name)) = 0 THEN
    RETURN NULL;
  END IF;

  -- 1) Exact override match — jobs.qb_customer_full_name set manually wins.
  SELECT id INTO v_id
  FROM jobs
  WHERE qb_customer_full_name = qb_name
  LIMIT 1;
  IF FOUND THEN RETURN v_id; END IF;

  -- 2) Fuzzy match — try root name AND sub name against client_name and
  --    job_address; take the highest similarity above threshold.
  SELECT id INTO v_id FROM (
    SELECT
      j.id,
      GREATEST(
        similarity(coalesce(j.client_name, ''),  v_root_name),
        similarity(coalesce(j.client_name, ''),  coalesce(v_sub_name, v_root_name)),
        similarity(coalesce(j.job_address, ''),  coalesce(v_sub_name, v_root_name))
      ) AS sim
    FROM jobs j
    ORDER BY sim DESC
    LIMIT 1
  ) best
  WHERE sim > SIM_THRESHOLD;

  RETURN v_id;
END;
$$;

-- ── Auto-link trigger: BEFORE INSERT/UPDATE on each *_lines table ─────────
-- Fires whenever qb_customer_full_name is set and job_id is null. Idempotent
-- — manual job_id assignments aren't overwritten because we only act when
-- NEW.job_id IS NULL.
CREATE OR REPLACE FUNCTION trg_auto_link_qb_line_to_job()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.job_id IS NULL AND NEW.qb_customer_full_name IS NOT NULL THEN
    NEW.job_id := match_qb_customer_to_job(NEW.qb_customer_full_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS acct_bill_lines_auto_link ON acct_bill_lines;
CREATE TRIGGER acct_bill_lines_auto_link
  BEFORE INSERT OR UPDATE OF qb_customer_full_name ON acct_bill_lines
  FOR EACH ROW EXECUTE FUNCTION trg_auto_link_qb_line_to_job();

DROP TRIGGER IF EXISTS acct_check_lines_auto_link ON acct_check_lines;
CREATE TRIGGER acct_check_lines_auto_link
  BEFORE INSERT OR UPDATE OF qb_customer_full_name ON acct_check_lines
  FOR EACH ROW EXECUTE FUNCTION trg_auto_link_qb_line_to_job();

DROP TRIGGER IF EXISTS acct_cc_lines_auto_link ON acct_credit_card_charge_lines;
CREATE TRIGGER acct_cc_lines_auto_link
  BEFORE INSERT OR UPDATE OF qb_customer_full_name ON acct_credit_card_charge_lines
  FOR EACH ROW EXECUTE FUNCTION trg_auto_link_qb_line_to_job();

DROP TRIGGER IF EXISTS acct_ir_lines_auto_link ON acct_item_receipt_lines;
CREATE TRIGGER acct_ir_lines_auto_link
  BEFORE INSERT OR UPDATE OF qb_customer_full_name ON acct_item_receipt_lines
  FOR EACH ROW EXECUTE FUNCTION trg_auto_link_qb_line_to_job();

-- ═════════════════════════════════════════════════════════════════════════════
-- Unified material-costs view — for the upcoming Jobs > Finance > Material
-- Costs tab (phase 2). Reads from all four line tables and joins to its
-- header for vendor/date/total. Filter by job_id in the UI.
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_job_material_costs AS
SELECT
  l.id           AS line_id,
  'bill'         AS source_type,
  b.id           AS txn_id,
  b.qb_txn_id    AS qb_txn_id,
  b.date         AS txn_date,
  b.vendor_name  AS vendor_name,
  b.number       AS ref_number,
  l.job_id,
  l.qb_customer_full_name,
  l.line_type,
  coalesce(l.item_name, l.qb_account_name) AS item_or_account,
  l.description,
  l.quantity,
  l.unit_price,
  l.amount,
  l.billable_status,
  l.class_name
FROM acct_bill_lines l
JOIN acct_bills b ON b.id = l.bill_id

UNION ALL
SELECT
  l.id, 'check', c.id, c.qb_txn_id, c.date, c.payee_name, c.ref_number,
  l.job_id, l.qb_customer_full_name, l.line_type,
  coalesce(l.item_name, l.qb_account_name), l.description,
  l.quantity, l.unit_price, l.amount, l.billable_status, l.class_name
FROM acct_check_lines l
JOIN acct_checks c ON c.id = l.check_id

UNION ALL
SELECT
  l.id, 'credit_card_charge', cc.id, cc.qb_txn_id, cc.date, cc.payee_name, cc.ref_number,
  l.job_id, l.qb_customer_full_name, l.line_type,
  coalesce(l.item_name, l.qb_account_name), l.description,
  l.quantity, l.unit_price, l.amount, l.billable_status, l.class_name
FROM acct_credit_card_charge_lines l
JOIN acct_credit_card_charges cc ON cc.id = l.charge_id

UNION ALL
SELECT
  l.id, 'item_receipt', ir.id, ir.qb_txn_id, ir.date, ir.vendor_name, ir.ref_number,
  l.job_id, l.qb_customer_full_name, l.line_type,
  coalesce(l.item_name, l.qb_account_name), l.description,
  l.quantity, l.unit_price, l.amount, l.billable_status, l.class_name
FROM acct_item_receipt_lines l
JOIN acct_item_receipts ir ON ir.id = l.receipt_id;

COMMIT;
