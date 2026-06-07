-- ── Stat Reminders ───────────────────────────────────────────────────────────
-- One config row per statistic; tracks reminder preferences for each stat.

CREATE TABLE IF NOT EXISTS stat_reminders (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  statistic_id   bigint      NOT NULL REFERENCES statistics(id) ON DELETE CASCADE,
  enabled        boolean     NOT NULL DEFAULT false,
  delay_days     int         NOT NULL DEFAULT 3 CHECK (delay_days BETWEEN 1 AND 60),
  notify_email   boolean     NOT NULL DEFAULT true,
  notify_sms     boolean     NOT NULL DEFAULT false,
  repeat_enabled boolean     NOT NULL DEFAULT false,
  repeat_value   int         NOT NULL DEFAULT 1 CHECK (repeat_value >= 1),
  repeat_unit    text        NOT NULL DEFAULT 'weeks' CHECK (repeat_unit IN ('days','weeks')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (statistic_id)
);

-- ── Stat Reminder Log ─────────────────────────────────────────────────────────
-- One row per (statistic, period). Tracks sent reminders and resolution status.

CREATE TABLE IF NOT EXISTS stat_reminder_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  statistic_id   bigint      NOT NULL REFERENCES statistics(id) ON DELETE CASCADE,
  period_date    date        NOT NULL,
  sent_count     int         NOT NULL DEFAULT 0,
  last_sent_at   timestamptz,
  next_send_at   timestamptz,
  resolved       boolean     NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (statistic_id, period_date)
);

-- RLS
ALTER TABLE stat_reminders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stat_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can manage stat_reminders"
  ON stat_reminders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated can manage stat_reminder_log"
  ON stat_reminder_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── pg_cron schedule (run once daily at 8:00 AM UTC) ─────────────────────────
-- Requires pg_cron + pg_net extensions enabled in Supabase dashboard.
-- Replace <SUPABASE_URL> and <SERVICE_ROLE_KEY> with your actual values,
-- then run this block separately after enabling the extensions.

/*
SELECT cron.schedule(
  'process-stat-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := '<SUPABASE_URL>/functions/v1/process-stat-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
*/


-- ─────────────────────────────────────────────────────────────────────────
-- Data API grants (Supabase change effective 2026-10-30 — new tables in
-- public are not exposed via PostgREST / supabase-js by default; this
-- block makes them reachable. RLS policies (above) still control rows.
-- ─────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.stat_reminders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stat_reminders TO authenticated;
GRANT ALL ON public.stat_reminder_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stat_reminder_log TO authenticated;
