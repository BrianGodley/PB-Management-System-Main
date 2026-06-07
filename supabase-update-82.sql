-- supabase-update-82.sql
-- Creates the companies table for company-type contacts.
--
-- NOTE: This replaces the earlier version of this file that added
--       entity_type / company_contacts to the contacts table.
--       If you already ran the old version, run these two lines first:
--         ALTER TABLE public.contacts DROP COLUMN IF EXISTS entity_type;
--         ALTER TABLE public.contacts DROP COLUMN IF EXISTS company_contacts;
--
-- Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS public.companies (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name        text NOT NULL,
  company_street      text,
  company_city        text,
  company_state       text,
  company_zip         text,
  phone               text,
  email               text,
  website             text,
  stage               text DEFAULT 'new_lead',
  contact_type        text CHECK (contact_type IN ('Residential','Commercial','Public Works')),
  source              text,
  campaign            text,
  how_did_you_hear    text,
  ghl_assigned_to     text,
  notes               text,
  project_description text,
  call_center_notes   text,
  tags                text[],
  dnd                 boolean DEFAULT false,
  company_contacts    jsonb DEFAULT '[]'::jsonb,
  ghl_contact_id      text,
  ghl_synced_at       timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Row-level security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'companies' AND policyname = 'Authenticated users can manage companies'
  ) THEN
    CREATE POLICY "Authenticated users can manage companies"
      ON public.companies FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_companies_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS companies_updated_at ON public.companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_companies_updated_at();


-- ─────────────────────────────────────────────────────────────────────────
-- Data API grants (Supabase change effective 2026-10-30 — new tables in
-- public are not exposed via PostgREST / supabase-js by default; this
-- block makes them reachable. RLS policies (above) still control rows.
-- ─────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.companies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
