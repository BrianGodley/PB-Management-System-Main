-- ============================================================================
-- Subs & Vendors Contracts: link to a Job and (optionally) a Work Order
-- ----------------------------------------------------------------------------
-- Adds the job + work-order assignment to each contract. Names are snapshotted
-- alongside the ids so the contracts list reads correctly even if a job or
-- work order is later renamed or removed.
-- ============================================================================

alter table sub_vendor_contracts
  add column if not exists job_id uuid references jobs(id) on delete set null,
  add column if not exists job_name text,
  add column if not exists work_order_id uuid references work_orders(id) on delete set null,
  add column if not exists work_order_label text;
