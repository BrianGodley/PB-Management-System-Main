-- Per-user UI preferences that travel with the login.
-- One jsonb bag on the existing per-user row, so every future preference is a
-- new key instead of a new column. Run on staging AND production.

alter table public.dashboard_preferences
  add column if not exists prefs jsonb not null default '{}'::jsonb;

comment on column public.dashboard_preferences.prefs is
  'Miscellaneous per-user UI preferences, keyed by feature (e.g. trackingStageFilter).';
