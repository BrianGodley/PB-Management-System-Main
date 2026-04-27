-- supabase-update-47.sql
-- Contacts CRM module: contacts table + communication log

CREATE TABLE IF NOT EXISTS contacts (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name     text NOT NULL DEFAULT '',
  last_name      text NOT NULL DEFAULT '',
  company_name   text,
  phone          text,
  email          text,
  street_address text,
  city           text,
  state          text,
  zip            text,
  stage          text NOT NULL DEFAULT 'new_lead'
                   CHECK (stage IN ('new_lead','warm_lead','consultation','quoted','won','lost','nurture')),
  source         text,
  assigned_to    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  client_id      uuid REFERENCES clients(id)  ON DELETE SET NULL,
  notes          text,
  tags           text[] DEFAULT '{}',
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_communications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'note'
                CHECK (type IN ('note','call','email','text','stage_change','system')),
  content     text NOT NULL DEFAULT '',
  direction   text CHECK (direction IN ('inbound','outbound')),
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Auto-update updated_at on contacts
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_contacts_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS contacts_stage_idx        ON contacts(stage);
CREATE INDEX IF NOT EXISTS contacts_last_name_idx    ON contacts(last_name);
CREATE INDEX IF NOT EXISTS contact_comms_contact_idx ON contact_communications(contact_id);

-- RLS Policies (authenticated users can read/write all contacts)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_all" ON contacts;
CREATE POLICY "contacts_all" ON contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contact_comms_all" ON contact_communications;
CREATE POLICY "contact_comms_all" ON contact_communications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
