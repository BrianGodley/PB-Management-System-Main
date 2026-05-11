-- supabase-update-77.sql
-- Expand user_permissions with full module-level access toggles and
-- granular sub-permissions for every module in the app.
-- All existing columns are left untouched (backward-compatible).

ALTER TABLE user_permissions

  -- ── Module access toggles ──────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS access_contacts      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_clients       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_design        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_bids          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_jobs          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_equipment     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_finance       BOOLEAN NOT NULL DEFAULT TRUE,
  -- access_statistics already exists
  ADD COLUMN IF NOT EXISTS access_org_chart     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_subs_vendors  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_training      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_hr            BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS access_accounting    BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Contacts ──────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS contacts_add         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS contacts_edit        BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Clients ───────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS clients_add                   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS clients_edit                  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS clients_add_estimate          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS clients_edit_other_estimates  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS clients_create_bids           BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Design ────────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS design_add_project   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS design_edit_other    BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Bids ──────────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS bids_update_other_status  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bids_delete_any           BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Jobs ──────────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS jobs_add_schedule          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_edit_schedule         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_delete_schedule       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS jobs_edit                  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_view_work_orders      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_view_tracking         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_time_clock            BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_daily_log             BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_edit_other_daily_logs BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS jobs_tasks                 BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_assign_tasks          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS jobs_manage_tasks          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_change_orders         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_manage_co             BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS jobs_co_other_users        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS jobs_files_other_users     BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Equipment ─────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS equipment_add        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS equipment_edit       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS equipment_delete     BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Finance ───────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS finance_add_week          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS finance_edit_collections  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS finance_edit_planning     BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Statistics (access_statistics already exists) ─────────────────────────
  ADD COLUMN IF NOT EXISTS stats_multiple_entry  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS stats_print_multiple  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS stats_comparison      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS stats_import_export   BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Org Chart ─────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS org_chart_manage     BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Subs & Vendors ────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS subs_vendors_manage  BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── HR ────────────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS hr_add_edit_employee  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS hr_delete_employee    BOOLEAN NOT NULL DEFAULT FALSE;

-- Update the auto-insert trigger function so new profiles get all new defaults too.
-- (The trigger inserts a row with DEFAULT values, so new columns are covered automatically
--  as long as they have DEFAULT clauses — no trigger change needed.)
