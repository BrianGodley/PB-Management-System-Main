-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-36.sql
-- Full Accounting module schema — chart of accounts, invoices, bills,
-- payments, banking, and journal entries. Run once in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Chart of Accounts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_accounts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  number      TEXT,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('asset','liability','equity','income','cogs','expense')),
  subtype     TEXT,
  description TEXT,
  is_active   BOOLEAN     DEFAULT TRUE,
  sort_order  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE acct_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_accounts_all" ON acct_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Journal Entries (double-entry) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_journal_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE        NOT NULL,
  reference   TEXT,
  description TEXT,
  type        TEXT        DEFAULT 'journal', -- journal | invoice | bill | payment | transfer
  source_id   UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE acct_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_journal_entries_all" ON acct_journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS acct_journal_lines (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    UUID        NOT NULL REFERENCES acct_journal_entries(id) ON DELETE CASCADE,
  account_id  UUID        NOT NULL REFERENCES acct_accounts(id),
  debit       NUMERIC(12,2) DEFAULT 0,
  credit      NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE acct_journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_journal_lines_all" ON acct_journal_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Invoices (Accounts Receivable) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_invoices (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  number       TEXT,
  client_id    UUID        REFERENCES clients(id) ON DELETE SET NULL,
  job_id       UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  client_name  TEXT,
  date         DATE        NOT NULL,
  due_date     DATE,
  status       TEXT        DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','void')),
  subtotal     NUMERIC(12,2) DEFAULT 0,
  tax_rate     NUMERIC(6,4)  DEFAULT 0,
  tax_amount   NUMERIC(12,2) DEFAULT 0,
  total        NUMERIC(12,2) DEFAULT 0,
  amount_paid  NUMERIC(12,2) DEFAULT 0,
  balance_due  NUMERIC(12,2) DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE acct_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_invoices_all" ON acct_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS acct_invoice_lines (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID        NOT NULL REFERENCES acct_invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity    NUMERIC(10,2) DEFAULT 1,
  unit_price  NUMERIC(12,2) DEFAULT 0,
  amount      NUMERIC(12,2) DEFAULT 0,
  account_id  UUID        REFERENCES acct_accounts(id),
  sort_order  INTEGER     DEFAULT 0
);

ALTER TABLE acct_invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_invoice_lines_all" ON acct_invoice_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Bills (Accounts Payable) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_bills (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  number       TEXT,
  vendor_id    UUID        REFERENCES subs_vendors(id) ON DELETE SET NULL,
  vendor_name  TEXT,
  date         DATE        NOT NULL,
  due_date     DATE,
  status       TEXT        DEFAULT 'open' CHECK (status IN ('draft','open','paid','overdue','void')),
  subtotal     NUMERIC(12,2) DEFAULT 0,
  tax_amount   NUMERIC(12,2) DEFAULT 0,
  total        NUMERIC(12,2) DEFAULT 0,
  amount_paid  NUMERIC(12,2) DEFAULT 0,
  balance_due  NUMERIC(12,2) DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE acct_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_bills_all" ON acct_bills FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS acct_bill_lines (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID        NOT NULL REFERENCES acct_bills(id) ON DELETE CASCADE,
  description TEXT,
  quantity    NUMERIC(10,2) DEFAULT 1,
  unit_price  NUMERIC(12,2) DEFAULT 0,
  amount      NUMERIC(12,2) DEFAULT 0,
  account_id  UUID        REFERENCES acct_accounts(id),
  sort_order  INTEGER     DEFAULT 0
);

ALTER TABLE acct_bill_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_bill_lines_all" ON acct_bill_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT        NOT NULL CHECK (type IN ('customer','vendor')),
  date            DATE        NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  payment_method  TEXT        DEFAULT 'check',
  reference       TEXT,
  bank_account_id UUID,
  invoice_id      UUID        REFERENCES acct_invoices(id) ON DELETE SET NULL,
  bill_id         UUID        REFERENCES acct_bills(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE acct_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_payments_all" ON acct_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Bank Accounts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_bank_accounts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  type                  TEXT        NOT NULL CHECK (type IN ('checking','savings','credit_card','loan','other')),
  institution           TEXT,
  account_number_last4  TEXT,
  current_balance       NUMERIC(12,2) DEFAULT 0,
  is_active             BOOLEAN     DEFAULT TRUE,
  gl_account_id         UUID        REFERENCES acct_accounts(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE acct_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_bank_accounts_all" ON acct_bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS acct_bank_transactions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID        NOT NULL REFERENCES acct_bank_accounts(id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  description     TEXT,
  amount          NUMERIC(12,2) NOT NULL,
  type            TEXT        DEFAULT 'other' CHECK (type IN ('deposit','withdrawal','transfer','other')),
  category_id     UUID        REFERENCES acct_accounts(id),
  is_reconciled   BOOLEAN     DEFAULT FALSE,
  payment_id      UUID        REFERENCES acct_payments(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE acct_bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_bank_txn_all" ON acct_bank_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Seed: Standard Chart of Accounts (landscape company) ─────────────────────
INSERT INTO acct_accounts (number, name, type, subtype, sort_order) VALUES
  -- Assets
  ('1010', 'Checking Account',              'asset',     'bank',               10),
  ('1020', 'Savings Account',               'asset',     'bank',               20),
  ('1030', 'Petty Cash',                    'asset',     'cash',               30),
  ('1100', 'Accounts Receivable',           'asset',     'receivable',         40),
  ('1200', 'Materials Inventory',           'asset',     'inventory',          50),
  ('1500', 'Vehicles',                      'asset',     'fixed',             100),
  ('1510', 'Equipment & Machinery',         'asset',     'fixed',             110),
  ('1520', 'Accum. Depreciation - Equip',   'asset',     'contra',            120),
  -- Liabilities
  ('2000', 'Accounts Payable',              'liability', 'payable',           200),
  ('2100', 'Credit Card Payable',           'liability', 'credit_card',       210),
  ('2200', 'Sales Tax Payable',             'liability', 'tax',               220),
  ('2300', 'Payroll Liabilities',           'liability', 'payroll',           230),
  ('2400', 'Line of Credit',               'liability', 'loan',              240),
  -- Equity
  ('3000', 'Owner''s Equity',              'equity',    'equity',            300),
  ('3100', 'Retained Earnings',             'equity',    'retained',          310),
  ('3200', 'Owner''s Draw',               'equity',    'draw',              320),
  -- Income
  ('4000', 'Landscaping Revenue',           'income',    'revenue',           400),
  ('4010', 'Design Services',               'income',    'revenue',           410),
  ('4020', 'Installation Revenue',          'income',    'revenue',           420),
  ('4030', 'Maintenance Revenue',           'income',    'revenue',           430),
  ('4040', 'Material Sales',                'income',    'revenue',           440),
  -- Cost of Goods Sold
  ('5000', 'Cost of Goods Sold',            'cogs',      'cogs',              500),
  ('5010', 'Materials & Supplies',          'cogs',      'direct',            510),
  ('5020', 'Subcontractor Costs',           'cogs',      'direct',            520),
  ('5030', 'Direct Labor',                  'cogs',      'direct',            530),
  -- Expenses
  ('6010', 'Advertising & Marketing',       'expense',   'operating',         600),
  ('6020', 'Bank Charges & Fees',           'expense',   'operating',         610),
  ('6030', 'Equipment Rental',              'expense',   'operating',         620),
  ('6040', 'Fuel & Vehicle Expenses',       'expense',   'operating',         630),
  ('6050', 'Insurance',                     'expense',   'operating',         640),
  ('6060', 'Office Supplies',               'expense',   'operating',         650),
  ('6070', 'Professional Fees',             'expense',   'operating',         660),
  ('6080', 'Repairs & Maintenance',         'expense',   'operating',         670),
  ('6090', 'Telephone & Internet',          'expense',   'operating',         680),
  ('6100', 'Utilities',                     'expense',   'operating',         690),
  ('6110', 'Wages & Salaries',              'expense',   'payroll',           700)
ON CONFLICT DO NOTHING;
