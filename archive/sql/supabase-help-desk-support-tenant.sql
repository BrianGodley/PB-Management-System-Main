-- ============================================================================
-- HELP DESK → SUPPORT TENANT ONLY  (RUN ON STAGING FIRST, then PRODUCTION)
-- ----------------------------------------------------------------------------
-- The Help Desk (ticket triage) belongs to ONE support tenant — Picture Build
-- today; a dedicated SoftCake support workspace later. Every tenant's users can
-- still file tickets and see their own, but only the support tenant's admins can
-- see/triage ALL tickets (so other tenants' requests "flow through" to it).
--
-- Fixes a leak: the old feature_requests_admin_all policy let ANY tenant's admin
-- (and every new trial owner is super_admin) read EVERY tenant's tickets.
-- ============================================================================

-- 1) Flag the support tenant -------------------------------------------------
alter table public.tenants add column if not exists is_support_tenant boolean not null default false;
update public.tenants set is_support_tenant = true  where name = 'Picture Build';
-- make sure nobody else is flagged
update public.tenants set is_support_tenant = false where name <> 'Picture Build';

-- 2) Rework feature_requests row security ------------------------------------
-- Keep: users insert + read their OWN tickets. Replace the blanket admin policy
-- with one scoped to the support tenant's admins.
drop policy if exists "feature_requests_admin_all" on public.feature_requests;
drop policy if exists feature_requests_support_all   on public.feature_requests;

create policy feature_requests_support_all
  on public.feature_requests for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
        join public.tenants t on t.id = p.tenant_id
       where p.id = auth.uid()
         and p.role in ('admin','super_admin')
         and t.is_support_tenant
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
        join public.tenants t on t.id = p.tenant_id
       where p.id = auth.uid()
         and p.role in ('admin','super_admin')
         and t.is_support_tenant
    )
  );

-- (feature_requests_insert_own and feature_requests_select_own stay as-is so
--  every user can still file a ticket and see their own.)

-- 3) Same treatment for attachments, if that table uses an admin-all policy ---
do $$
begin
  if exists (select 1 from information_schema.tables
              where table_schema='public' and table_name='feature_request_attachments') then
    execute 'drop policy if exists "feature_request_attachments_admin_all" on public.feature_request_attachments';
    execute 'drop policy if exists feature_request_attachments_support_all   on public.feature_request_attachments';
    execute $p$
      create policy feature_request_attachments_support_all
        on public.feature_request_attachments for all to authenticated
        using (exists (select 1 from public.profiles p join public.tenants t on t.id=p.tenant_id
                        where p.id=auth.uid() and p.role in ('admin','super_admin') and t.is_support_tenant))
        with check (exists (select 1 from public.profiles p join public.tenants t on t.id=p.tenant_id
                        where p.id=auth.uid() and p.role in ('admin','super_admin') and t.is_support_tenant))
    $p$;
  end if;
end $$;
