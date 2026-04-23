-- ─────────────────────────────────────────────────────────────────────────────
-- Collections & Finance — weekly tracking schema
-- ─────────────────────────────────────────────────────────────────────────────

-- One record per week (identified by the Friday ending date)
CREATE TABLE IF NOT EXISTS collection_weeks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_ending  date        NOT NULL UNIQUE,   -- always a Friday
  created_at   timestamptz DEFAULT now()
);

-- Client rows for Current / Punchlist / Long-Term collections
CREATE TABLE IF NOT EXISTS collection_rows (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id          uuid        NOT NULL REFERENCES collection_weeks(id) ON DELETE CASCADE,
  section          text        NOT NULL CHECK (section IN ('current','punchlist','long_term')),
  manager          text,                      -- group header: Carter, Jorge, Paul, etc.
  client_name      text        NOT NULL,
  prev_delivered   numeric(12,2) DEFAULT 0,   -- "Prev Delivered" / "$ Delivered"
  starting_balance numeric(12,2) DEFAULT 0,   -- "Starting Balance" / "Open Balance"
  mon_inv          numeric(12,2) DEFAULT 0,
  mon_dep          numeric(12,2) DEFAULT 0,
  tue_inv          numeric(12,2) DEFAULT 0,
  tue_dep          numeric(12,2) DEFAULT 0,
  wed_inv          numeric(12,2) DEFAULT 0,
  wed_dep          numeric(12,2) DEFAULT 0,
  thu_inv          numeric(12,2) DEFAULT 0,
  thu_dep          numeric(12,2) DEFAULT 0,
  fri_inv          numeric(12,2) DEFAULT 0,
  fri_dep          numeric(12,2) DEFAULT 0,
  notes            text,
  sort_order       int         DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Payables: Prelims / Credit Cards / Credit Accounts / Non-Credit Accounts
CREATE TABLE IF NOT EXISTS collection_payables (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id        uuid        NOT NULL REFERENCES collection_weeks(id) ON DELETE CASCADE,
  category       text        NOT NULL CHECK (category IN ('prelim','credit_card','credit_account','non_credit')),
  payee          text,
  amount_current numeric(12,2) DEFAULT 0,
  amount_future  numeric(12,2) DEFAULT 0,
  due_date       text,
  rate           text,
  notes          text,
  sort_order     int         DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

-- Financial planning: Cash on Hand / Auto Allocations / Payroll / Payables / Totals
CREATE TABLE IF NOT EXISTS collection_financial (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id    uuid        NOT NULL REFERENCES collection_weeks(id) ON DELETE CASCADE,
  section    text        NOT NULL,  -- 'cash_on_hand','auto_alloc','payroll','payables_alloc'
  label      text,
  amount     numeric(12,2) DEFAULT 0,
  notes      text,
  sort_order int         DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS coll_rows_week_idx    ON collection_rows(week_id, section);
CREATE INDEX IF NOT EXISTS coll_pay_week_idx     ON collection_payables(week_id, category);
CREATE INDEX IF NOT EXISTS coll_fin_week_idx     ON collection_financial(week_id, section);

-- RLS
ALTER TABLE collection_weeks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_rows      ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_payables  ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_financial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON collection_weeks     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON collection_rows      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON collection_payables  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON collection_financial FOR ALL TO authenticated USING (true) WITH CHECK (true);
