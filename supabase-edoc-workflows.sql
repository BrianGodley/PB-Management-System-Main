-- supabase-edoc-workflows.sql
-- Document Workflows: multi-step approval/routing flows for documents
-- (e.g. create → secondary approval → send to client; or policy → review →
-- approve → distribute to employees → acknowledge-read).
--
--   steps               : ordered nodes the wizard builds (person/document/
--                          organization/decision), used to render the diagram.
--   graph               : optional saved positions/edges once the visual editor
--                          supports manual manipulation (phase 2).
--   module_integrations : array of app modules the workflow touches.
-- Run once in the Supabase SQL editor.

create table if not exists edoc_workflows (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null default 'Untitled Workflow',
  notes               text,
  module_integrations jsonb not null default '[]'::jsonb,
  steps               jsonb not null default '[]'::jsonb,
  graph               jsonb,
  created_by          uuid references auth.users(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists edoc_workflows_created_idx on edoc_workflows(created_at desc);

alter table edoc_workflows enable row level security;

-- Any signed-in user can view; create/edit/delete allowed for authenticated
-- (tighten to admins later if desired).
drop policy if exists edoc_workflows_select on edoc_workflows;
create policy edoc_workflows_select on edoc_workflows for select to authenticated using (true);

drop policy if exists edoc_workflows_write on edoc_workflows;
create policy edoc_workflows_write on edoc_workflows for all to authenticated using (true) with check (true);
