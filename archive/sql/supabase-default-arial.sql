-- supabase-default-arial.sql
-- One-time reset: set every user's menu font family to Arial.
-- Size / bold / italic are preserved. Run once in the Supabase SQL editor.
-- (Users were notified to re-customize their appearance afterward.)

update dashboard_preferences
set
  module_backgrounds = jsonb_set(
    coalesce(module_backgrounds, '{}'::jsonb),
    '{__sidebarFont}',
    coalesce(module_backgrounds -> '__sidebarFont', '{}'::jsonb)
      || jsonb_build_object('family', 'Arial, Helvetica, sans-serif'),
    true
  ),
  updated_at = now();
