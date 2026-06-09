-- Junior positions: a contained position (a position inside an Area) can have
-- one or more junior positions reporting to it. A junior is itself a contained
-- position (parent_container_id = the same Area) plus this link to its senior.
-- Deleting the senior removes its juniors (ON DELETE CASCADE).

alter table public.org_nodes
  add column if not exists senior_node_id uuid
    references public.org_nodes(id) on delete cascade;

create index if not exists org_nodes_senior_idx
  on public.org_nodes (senior_node_id)
  where senior_node_id is not null;
