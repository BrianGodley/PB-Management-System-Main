-- ─────────────────────────────────────────────────────────────────────────
-- Seed help_doc_categories + help_video_categories with the existing
-- module names from Layout.jsx so admins start with a structure that
-- matches the rest of the app. Idempotent — only inserts categories
-- that don't already exist by name. sort_order matches nav order so the
-- categories render in the same sequence as the main menu.
-- ─────────────────────────────────────────────────────────────────────────

WITH cats(name, sort_order) AS (VALUES
  ('Dashboard',       10),
  ('Contacts',        20),
  ('Opportunities',   30),
  ('Design',          40),
  ('Bids',            50),
  ('Jobs',            60),
  ('Equipment',       70),
  ('Finance',         80),
  ('Statistics',      90),
  ('Org Chart',      100),
  ('Subs & Vendors', 110),
  ('Training',       120),
  ('HR',             130),
  ('Accounting',     140)
)
INSERT INTO public.help_doc_categories (name, sort_order)
SELECT c.name, c.sort_order
FROM cats c
WHERE NOT EXISTS (
  SELECT 1 FROM public.help_doc_categories x WHERE x.name = c.name
);

WITH cats(name, sort_order) AS (VALUES
  ('Dashboard',       10),
  ('Contacts',        20),
  ('Opportunities',   30),
  ('Design',          40),
  ('Bids',            50),
  ('Jobs',            60),
  ('Equipment',       70),
  ('Finance',         80),
  ('Statistics',      90),
  ('Org Chart',      100),
  ('Subs & Vendors', 110),
  ('Training',       120),
  ('HR',             130),
  ('Accounting',     140)
)
INSERT INTO public.help_video_categories (name, sort_order)
SELECT c.name, c.sort_order
FROM cats c
WHERE NOT EXISTS (
  SELECT 1 FROM public.help_video_categories x WHERE x.name = c.name
);
