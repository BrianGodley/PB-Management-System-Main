-- ─────────────────────────────────────────────────────────────────────────────
-- Subs & Vendors directory
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subs_vendors (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name          text        NOT NULL,
  divisions             text[]      DEFAULT '{}',
  status                text        DEFAULT 'no_email',  -- 'no_email' | 'ready' | 'active' | 'inactive'
  primary_contact       text,
  email                 text,
  cell                  text,
  phone                 text,
  trade_agreement_status text,
  liability_exp         date,
  workers_comp_exp      date,
  notes                 text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS subs_vendors_company_name_idx ON subs_vendors(company_name);
CREATE INDEX IF NOT EXISTS subs_vendors_status_idx       ON subs_vendors(status);

-- RLS
ALTER TABLE subs_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access"
  ON subs_vendors FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
