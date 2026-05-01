-- supabase-update-62.sql
-- Stat notes: attach a note to any data point on a statistics graph

CREATE TABLE IF NOT EXISTS stat_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statistic_id  uuid NOT NULL REFERENCES statistics(id) ON DELETE CASCADE,
  period_date   date NOT NULL,
  note          text NOT NULL DEFAULT '',
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (statistic_id, period_date)
);

ALTER TABLE stat_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stat_notes' AND policyname = 'auth_all_stat_notes'
  ) THEN
    CREATE POLICY "auth_all_stat_notes"
      ON stat_notes FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
