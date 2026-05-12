-- supabase-update-83.sql
-- Creates the company_communications table for the CompanyDetail comm log.
-- Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS public.company_communications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type         text,
  direction    text,
  content      text,
  created_by   uuid,
  created_at   timestamptz DEFAULT now()
);

-- Index for fast lookups by company
CREATE INDEX IF NOT EXISTS company_communications_company_id_idx
  ON public.company_communications (company_id);

-- Row-level security
ALTER TABLE public.company_communications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'company_communications'
      AND policyname = 'Authenticated users can manage company_communications'
  ) THEN
    CREATE POLICY "Authenticated users can manage company_communications"
      ON public.company_communications FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END$$;
