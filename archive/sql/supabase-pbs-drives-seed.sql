-- supabase-pbs-drives-seed.sql
-- Seed the PBS Drives with the division drive names (run after
-- supabase-pbs-drives.sql). New drives have no members until you add them in
-- Documents → PBS Drive → Settings → Members.
insert into pbs_drives (name) values
  ('Div 1 Administration'),
  ('Div 2 Finance'),
  ('Div 3 Marketing'),
  ('Div 4 Sales'),
  ('Div 5 Production'),
  ('Div 6 Quality Control'),
  ('Div 7 Business Development'),
  ('Div 8 Executive and Legal');
