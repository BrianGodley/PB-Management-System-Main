#!/usr/bin/env python3
"""
BuilderTrend CSV Importer for Picture Build System (PBS)
=========================================================
Usage:
    python bt-import.py <csv_file> [--dry-run]

The script auto-detects the CSV type from its columns and runs the
appropriate import logic.

Requirements:
    pip install requests pandas python-dotenv

Environment (set in .env or export before running):
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=eyJ...
"""

import sys
import os
import csv
import json
import math
import argparse
import re
from datetime import datetime, timezone
from pathlib import Path

try:
    import pandas as pd
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("Missing dependencies. Run: pip install requests pandas python-dotenv")
    sys.exit(1)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.")
    sys.exit(1)

HEADERS = {
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates",
}

# ── helpers ──────────────────────────────────────────────────────────────────

def clean(val):
    """Return None for blank / NaN / pd.NA values, otherwise a stripped string."""
    if val is None:
        return None
    # pd.isna covers numpy NaN, pandas NA and NaT. Needed because pandas 3.x
    # may surface missing string cells as pd.NA rather than a float nan —
    # without this, blank fields would import as the literal text "<NA>".
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    s = str(val).strip()
    return s if s else None

def to_date(val):
    """Parse a date string to ISO date (YYYY-MM-DD) or None."""
    s = clean(val)
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%Y %H:%M:%S"):
        try:
            return datetime.strptime(s.split(".")[0], fmt).date().isoformat()
        except ValueError:
            pass
    return None

def to_float(val):
    """Parse numeric value or None."""
    s = clean(val)
    if s is None:
        return None
    s = re.sub(r"[,$%]", "", s)
    try:
        return float(s)
    except ValueError:
        return None

def to_ts(val):
    """Parse a datetime string to an ISO timestamp (no tz) or None."""
    s = clean(val)
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d",
                "%m/%d/%Y %H:%M:%S", "%m/%d/%Y"):
        try:
            return datetime.strptime(s.split(".")[0], fmt).isoformat()
        except ValueError:
            pass
    return None

def supabase_upsert(table, rows, conflict_col, dry_run=False, on_conflict=None):
    """Upsert rows into a Supabase table. Returns (inserted, errors).

    on_conflict: when set, PostgREST resolves conflicts on that column (the
    table needs a unique constraint/index on it). When None, conflict
    resolution falls back to the primary key — kept for the existing
    bt_* importers, which were written that way.
    """
    if not rows:
        print(f"  No rows to upsert into {table}.")
        return 0, 0

    if dry_run:
        print(f"  [DRY RUN] Would upsert {len(rows)} rows into {table}")
        if rows:
            print(f"  Sample row: {json.dumps(rows[0], default=str, indent=2)}")
        return len(rows), 0

    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if on_conflict:
        url += f"?on_conflict={on_conflict}"
    headers = {**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"}

    BATCH = 200
    total_ok = 0
    total_err = 0

    for i in range(0, len(rows), BATCH):
        batch = rows[i:i+BATCH]
        resp = requests.post(url, headers=headers, json=batch)
        if resp.status_code in (200, 201):
            total_ok += len(batch)
        else:
            print(f"  ERROR batch {i//BATCH + 1}: {resp.status_code} — {resp.text[:300]}")
            total_err += len(batch)

    return total_ok, total_err


def supabase_select_all(table, select):
    """GET every row from a table, paginating past the PostgREST 1k-row cap."""
    all_rows = []
    offset = 0
    PAGE = 1000
    while True:
        url = (f"{SUPABASE_URL}/rest/v1/{table}"
               f"?select={select}&limit={PAGE}&offset={offset}")
        resp = requests.get(url, headers=HEADERS)
        if resp.status_code != 200:
            print(f"  ERROR fetching {table}: {resp.status_code} — {resp.text[:200]}")
            break
        chunk = resp.json()
        all_rows.extend(chunk)
        if len(chunk) < PAGE:
            break
        offset += PAGE
    return all_rows


def detect_type(df):
    """Detect the BuilderTrend CSV type from column names."""
    cols = set(df.columns.str.lower().str.strip())

    if "job_id" in cols and "contract_price" in cols and "lot" in cols:
        return "jobsites_rollup"
    if "job_id" in cols and "schedule_id" in cols and "schedule_title" in cols:
        return "schedule"
    if "job_id" in cols and "entity_type" in cols and "payment_id" in cols:
        return "invoices_bills_pos"
    if "job_id" in cols and "transaction_id" in cols and "vendor_name" in cols:
        return "qb_costs"
    if "job_id" in cols and "estimates_revised_costs_id" in cols:
        return "estimate_revised"
    if "lead_id" in cols and "lead_title" in cols:
        return "sales_rollup"
    if "job_id" in cols and "shift_id" in cols:
        return "schedule_shifts"
    # The Daily Logs export also carries todo_* columns, so check
    # daily_log_id first or it gets misdetected as a todos CSV.
    if "job_id" in cols and "daily_log_id" in cols:
        return "daily_logs"
    if "job_id" in cols and "todo_id" in cols:
        return "todos"
    if "job_id" in cols and "change_order_id" in cols:
        return "change_orders"
    if "job_id" in cols and "purchase_order_id" in cols:
        return "purchase_orders"
    if "job_id" in cols and "shift_id" in cols and "clock_in" in cols:
        return "time_clock"
    if "job_id" in cols and "warranty_id" in cols:
        return "warranty"

    return "unknown"


# ── Importers ─────────────────────────────────────────────────────────────────

def import_jobsites_rollup(df, dry_run):
    """Jobsites Rollup → jobs table"""
    print(f"\n→ Importing Jobsites Rollup ({len(df)} rows) into jobs table…")

    rows = []
    for _, r in df.iterrows():
        bt_id = to_float(r.get("job_id"))
        if bt_id is None:
            continue
        bt_id = int(bt_id)

        name = clean(r.get("job_name")) or clean(r.get("home_owner")) or f"Job #{bt_id}"
        client_name = clean(r.get("home_owner")) or name

        bt_status = (clean(r.get("job_status")) or "").lower()
        status = "completed" if "closed" in bt_status else "active"

        row = {
            "bt_job_id":           bt_id,
            "name":                name,
            "client_name":         client_name,
            "job_address":         clean(r.get("street")) or "",
            "job_city":            clean(r.get("city")) or "",
            "job_state":           clean(r.get("state")) or "",
            "job_zip":             clean(r.get("zip")) or "",
            "project_manager":     clean(r.get("project_manager")),
            "notes":               clean(r.get("notes")),
            "status":              status,
            "projected_start":     to_date(r.get("projected_start")),
            "projected_completion":to_date(r.get("projected_completion")),
            "actual_start":        to_date(r.get("actual_start")),
            "actual_completion":   to_date(r.get("actual_completion")),
            "bt_contract_price":   to_float(r.get("contract_price")),
            "bt_revised_cost":     to_float(r.get("revised_builder_cost")),
            "bt_total_costs":      to_float(r.get("total_costs")),
            "bt_total_costs_paid": to_float(r.get("total_costs_paid")),
            "bt_owner_invoices_paid": to_float(r.get("owner_invoices_price_paid")),
            "total_price":         to_float(r.get("contract_price")) or 0,
            "source":              "buildertrend",
            "bt_imported_at":      datetime.now(timezone.utc).isoformat(),
        }
        # Use contract_price as sold_date fallback
        sd = to_date(r.get("job_created_date"))
        if sd:
            row["sold_date"] = sd

        rows.append({k: v for k, v in row.items() if v is not None})

    ok, err = supabase_upsert("jobs", rows, "bt_job_id", dry_run)
    print(f"  ✓ {ok} upserted, {err} errors")
    return ok, err


def import_schedule(df, dry_run):
    """Schedule → bt_schedule_items table (raw store)"""
    print(f"\n→ Importing Schedule ({len(df)} rows) into bt_schedule_items…")
    # We store BT schedule items in a dedicated table for reference
    rows = []
    for _, r in df.iterrows():
        bt_job_id   = to_float(r.get("job_id"))
        schedule_id = to_float(r.get("schedule_id"))
        if bt_job_id is None or schedule_id is None:
            continue
        row = {
            "bt_job_id":         int(bt_job_id),
            "bt_schedule_id":    int(schedule_id),
            "job_name":          clean(r.get("job_name")),
            "phase_title":       clean(r.get("phase_title")),
            "schedule_title":    clean(r.get("schedule_title")),
            "start_date":        to_date(r.get("start_date_time")),
            "end_date":          to_date(r.get("end_date_time")),
            "base_start_date":   to_date(r.get("base_start_date")),
            "base_end_date":     to_date(r.get("base_end_date")),
            "is_marked_complete":str(r.get("is_marked_complete", "")).lower() in ("true","1","yes"),
            "percent_complete":  to_float(r.get("percent_complete")),
            "assignee_name":     clean(r.get("schedule_assignee_name")),
            "description":       clean(r.get("schedule_description")),
            "base_work_days":    to_float(r.get("base_work_days")),
            "actual_work_days":  to_float(r.get("actual_work_days")),
            "total_shifts":      to_float(r.get("total_schedule_shifts")),
            "source":            "buildertrend",
            "bt_imported_at":    datetime.now(timezone.utc).isoformat(),
        }
        rows.append({k: v for k, v in row.items() if v is not None})

    ok, err = supabase_upsert("bt_schedule_items", rows, "bt_schedule_id", dry_run)
    print(f"  ✓ {ok} upserted, {err} errors")
    return ok, err


def import_invoices_bills_pos(df, dry_run):
    """Invoices, Bills & POs → bt_financials table"""
    print(f"\n→ Importing Invoices/Bills/POs ({len(df)} rows) into bt_financials…")
    rows = []
    for _, r in df.iterrows():
        bt_job_id = to_float(r.get("job_id"))
        li_id     = to_float(r.get("line_item_id"))
        if bt_job_id is None:
            continue
        row = {
            "bt_job_id":           int(bt_job_id),
            "bt_line_item_id":     int(li_id) if li_id else None,
            "entity_type":         clean(r.get("entity_type")),
            "parent_entity_title": clean(r.get("parent_entity_title")),
            "line_item_title":     clean(r.get("line_item_title")),
            "cost_code_title":     clean(r.get("cost_code_title")),
            "cost_category_title": clean(r.get("cost_category_title")),
            "cost_type":           clean(r.get("cost_type")),
            "amount":              to_float(r.get("amount")),
            "amount_paid":         to_float(r.get("amount_paid")),
            "paid_status":         clean(r.get("paid_status")),
            "paid_date":           to_date(r.get("paid_date")),
            "due_date":            to_date(r.get("due_date")),
            "date_added":          to_date(r.get("date_added")),
            "vendor_name":         clean(r.get("paid_to_name")),
            "is_variance":         str(r.get("is_variance_cost_code", "")).lower() in ("true","1"),
            "source":              "buildertrend",
            "bt_imported_at":      datetime.now(timezone.utc).isoformat(),
        }
        rows.append({k: v for k, v in row.items() if v is not None})

    ok, err = supabase_upsert("bt_financials", rows, "bt_line_item_id", dry_run)
    print(f"  ✓ {ok} upserted, {err} errors")
    return ok, err


def import_qb_costs(df, dry_run):
    """QB Costs → bt_qb_costs table"""
    print(f"\n→ Importing QB Costs ({len(df)} rows) into bt_qb_costs…")
    rows = []
    for _, r in df.iterrows():
        bt_job_id = to_float(r.get("job_id"))
        if bt_job_id is None:
            continue
        row = {
            "bt_job_id":           int(bt_job_id),
            "transaction_id":      clean(r.get("transaction_id")),
            "accounting_li_id":    clean(r.get("accounting_line_item_id")),
            "account_name":        clean(r.get("account_name")),
            "vendor_name":         clean(r.get("vendor_name")),
            "cost_code_title":     clean(r.get("cost_code_title")),
            "cost_category_title": clean(r.get("cost_category_title")),
            "cost_type":           clean(r.get("cost_type")),
            "payment_method":      clean(r.get("payment_method")),
            "amount":              to_float(r.get("amount")),
            "amount_paid":         to_float(r.get("amount_paid")),
            "date_created":        to_date(r.get("date_created")),
            "due_date":            to_date(r.get("due_date")),
            "source":              "buildertrend",
            "bt_imported_at":      datetime.now(timezone.utc).isoformat(),
        }
        rows.append({k: v for k, v in row.items() if v is not None})

    ok, err = supabase_upsert("bt_qb_costs", rows, "accounting_li_id", dry_run)
    print(f"  ✓ {ok} upserted, {err} errors")
    return ok, err


def import_estimate_revised(df, dry_run):
    """Estimate Revised → bt_estimate_lines table"""
    print(f"\n→ Importing Estimate Revised ({len(df)} rows) into bt_estimate_lines…")
    rows = []
    for _, r in df.iterrows():
        bt_job_id = to_float(r.get("job_id"))
        er_id     = clean(r.get("estimates_revised_costs_id"))
        if bt_job_id is None:
            continue
        row = {
            "bt_job_id":               int(bt_job_id),
            "bt_estimate_line_id":     er_id,
            "feature_type":            clean(r.get("feature_type")),
            "estimate_title":          clean(r.get("estimate_title")),
            "feature_title":           clean(r.get("feature_title")),
            "cost_code_title":         clean(r.get("cost_code_title")),
            "cost_category_title":     clean(r.get("cost_category_title")),
            "cost_type":               clean(r.get("cost_type")),
            "unit_cost":               to_float(r.get("unit_cost")),
            "quantity":                to_float(r.get("quantity")),
            "unit_type":               clean(r.get("unit_type")),
            "orig_builder_cost":       to_float(r.get("original_estimated_builder_cost")),
            "orig_owner_price":        to_float(r.get("original_estimated_owner_price")),
            "revised_builder_cost":    to_float(r.get("revised_builder_cost")),
            "estimate_status":         clean(r.get("estimate_status")),
            "latest_approval_status":  clean(r.get("latest_estimate_approval_status")),
            "estimate_approval_date":  to_date(r.get("estimate_approval_date")),
            "source":                  "buildertrend",
            "bt_imported_at":          datetime.now(timezone.utc).isoformat(),
        }
        rows.append({k: v for k, v in row.items() if v is not None})

    ok, err = supabase_upsert("bt_estimate_lines", rows, "bt_estimate_line_id", dry_run)
    print(f"  ✓ {ok} upserted, {err} errors")
    return ok, err


def import_sales_rollup(df, dry_run):
    """Sales Rollup → bt_leads table"""
    print(f"\n→ Importing Sales Rollup ({len(df)} rows) into bt_leads…")
    rows = []
    for _, r in df.iterrows():
        lead_id = to_float(r.get("lead_id"))
        if lead_id is None:
            continue
        row = {
            "bt_lead_id":           int(lead_id),
            "lead_title":           clean(r.get("lead_title")),
            "lead_status":          clean(r.get("lead_status")),
            "contact_first_name":   clean(r.get("lead_contact_first_name")),
            "contact_last_name":    clean(r.get("lead_contact_last_name")),
            "contact_email":        clean(r.get("lead_contract_email_address")),
            "contact_phone":        clean(r.get("lead_contract_primary_phone_number")),
            "contact_cell":         clean(r.get("lead_contact_cell_phone_number")),
            "street":               clean(r.get("street")),
            "city":                 clean(r.get("city")),
            "state":                clean(r.get("state")),
            "zip":                  clean(r.get("zip")),
            "lead_source":          clean(r.get("lead_source")),
            "project_type":         clean(r.get("lead_project_type")),
            "sales_people":         clean(r.get("sales_people")),
            "lead_tags":            clean(r.get("lead_tags")),
            "general_notes":        clean(r.get("general_notes")),
            "projected_sale_date":  to_date(r.get("projected_sale_date")),
            "sold_date":            to_date(r.get("sold_date")),
            "lead_created_date":    to_date(r.get("lead_created_date")),
            "approved_owner_price": to_float(r.get("total_approved_owner_price")),
            "approved_builder_cost":to_float(r.get("total_approved_builder_cost")),
            "source":               "buildertrend",
            "bt_imported_at":       datetime.now(timezone.utc).isoformat(),
        }
        rows.append({k: v for k, v in row.items() if v is not None})

    ok, err = supabase_upsert("bt_leads", rows, "bt_lead_id", dry_run)
    print(f"  ✓ {ok} upserted, {err} errors")
    return ok, err


def import_daily_logs(df, dry_run):
    """Daily Logs → daily_logs table (the real app table, not a bt_* store).

    Mapping:
      • job_id            — resolved jobs.bt_job_id → jobs.id (real FK)
      • date              — log_referenced_date, falling back to created date
      • notes             — log_notes, with a "[N photos in BuilderTrend]"
                            marker appended (the photo files are NOT in this
                            CSV — only an attachment count)
      • created_by        — matched from the log author name → profiles.id
                            when a profile name matches; NULL otherwise
      • bt_author_name    — original BT author name, always kept as a fallback
      • permissions       — is_log_private → {private}; otherwise {internal}
                            plus client / subs from the show-to flags
      • created_at / updated_at — preserved from BuilderTrend

    Idempotent: upserts on bt_daily_log_id, so re-running is safe.
    Requires the daily_logs setup SQL (bt_daily_log_id + bt_author_name
    columns and the unique index) to have been run first.
    """
    print(f"\n→ Importing Daily Logs ({len(df)} rows) into daily_logs table…")

    # 1. jobs.bt_job_id → jobs.id  (paginated — the jobs table is 1k+ rows)
    job_map = {}
    for j in supabase_select_all("jobs", "id,bt_job_id"):
        bt = j.get("bt_job_id")
        if bt is not None:
            job_map[int(bt)] = j["id"]
    print(f"  Loaded {len(job_map)} jobs for ID mapping.")

    # 2. profile display name → profiles.id, for author matching.
    # The profiles table only carries id / full_name / email.
    name_to_user = {}
    for p in supabase_select_all("profiles", "id,full_name"):
        full = (p.get("full_name") or "").strip()
        if full:
            name_to_user[full.lower()] = p["id"]
    print(f"  Loaded {len(name_to_user)} profile names for author matching.")

    def truthy(v):
        return str(v).strip().lower() in ("true", "1", "yes")

    rows = []
    skipped_no_job = 0
    skipped_no_date = 0
    unmatched_jobs = set()
    matched_authors = 0
    for _, r in df.iterrows():
        bt_log_id = to_float(r.get("daily_log_id"))
        if bt_log_id is None:
            continue
        bt_log_id = int(bt_log_id)

        # Resolve the job FK. A log with no job is invisible in every Jobs
        # view, so skip (and report) logs whose BT job didn't import.
        bt_job_id = to_float(r.get("job_id"))
        job_uuid = job_map.get(int(bt_job_id)) if bt_job_id is not None else None
        if job_uuid is None:
            skipped_no_job += 1
            if bt_job_id is not None:
                unmatched_jobs.add(int(bt_job_id))
            continue

        # date is NOT NULL — referenced date preferred, then created date
        log_date = (to_date(r.get("log_referenced_date"))
                    or to_date(r.get("log_created_date")))
        if not log_date:
            skipped_no_date += 1
            continue

        # Permissions from the BuilderTrend visibility flags
        if truthy(r.get("is_log_private")):
            permissions = ["private"]
        else:
            permissions = ["internal"]
            if truthy(r.get("show_log_to_owner")):
                permissions.append("client")
            if truthy(r.get("show_log_to_subs")):
                permissions.append("subs")

        # Notes + photo-count marker (the photo files aren't in the CSV)
        notes = clean(r.get("log_notes")) or ""
        n_att = to_float(r.get("total_attachments"))
        n_att = int(n_att) if n_att else 0
        if n_att > 0:
            marker = f"[{n_att} photo{'' if n_att == 1 else 's'} in BuilderTrend]"
            notes = f"{notes}\n\n{marker}".strip() if notes else marker

        weather_notes = clean(r.get("log_weather_notes"))

        # Author: match name → account; always keep the BT name as a fallback
        bt_author = clean(r.get("log_created_by_name"))
        created_by = name_to_user.get(bt_author.lower()) if bt_author else None
        if created_by:
            matched_authors += 1

        # Timestamps — guaranteed non-null (fall back to the log date at
        # midnight) so the column never goes NULL on a rare missing value.
        created_at = to_ts(r.get("log_created_date")) or f"{log_date}T00:00:00"
        updated_at = to_ts(r.get("log_last_updated_date")) or created_at

        # Every row MUST carry an identical set of keys — PostgREST rejects a
        # bulk insert whose objects differ ("All object keys must match"), so
        # optional fields are sent as explicit None (→ null), never omitted.
        rows.append({
            "bt_daily_log_id":    bt_log_id,
            "job_id":             job_uuid,
            "date":               log_date,
            "title":              clean(r.get("log_title")),
            "notes":              notes or None,
            "created_by":         created_by,
            "bt_author_name":     bt_author,
            "permissions":        permissions,
            "weather_conditions": bool(weather_notes),
            "weather_notes":      weather_notes,
            "source":             "buildertrend",
            "created_at":         created_at,
            "updated_at":         updated_at,
        })

    # De-dupe on bt_daily_log_id — a PostgREST upsert can't touch the same
    # conflict key twice in one batch (keep the last occurrence).
    dedup = {}
    for row in rows:
        dedup[row["bt_daily_log_id"]] = row
    deduped = list(dedup.values())
    if len(deduped) != len(rows):
        print(f"  De-duped {len(rows) - len(deduped)} repeated log IDs.")
    rows = deduped

    print(f"  Prepared {len(rows)} log rows "
          f"({matched_authors} authors matched to accounts).")
    if skipped_no_date:
        print(f"  Skipped {skipped_no_date} logs with no usable date.")
    if skipped_no_job:
        sample = ", ".join(str(x) for x in list(unmatched_jobs)[:10])
        print(f"  ⚠ Skipped {skipped_no_job} logs whose BuilderTrend job is "
              f"not in the jobs table (bt_job_id e.g.: {sample}).")

    ok, err = supabase_upsert("daily_logs", rows, "bt_daily_log_id",
                              dry_run, on_conflict="bt_daily_log_id")
    print(f"  ✓ {ok} upserted, {err} errors")
    return ok, err


# ── SQL for new tables (printed if they don't exist) ──────────────────────────

SETUP_SQL = """
-- Run this in Supabase SQL Editor ONCE before importing non-jobs CSVs:

CREATE TABLE IF NOT EXISTS bt_schedule_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bt_job_id       INTEGER NOT NULL,
  bt_schedule_id  INTEGER UNIQUE,
  job_name        TEXT,
  phase_title     TEXT,
  schedule_title  TEXT,
  start_date      DATE,
  end_date        DATE,
  base_start_date DATE,
  base_end_date   DATE,
  is_marked_complete BOOLEAN DEFAULT false,
  percent_complete   NUMERIC(5,2),
  assignee_name   TEXT,
  description     TEXT,
  base_work_days  NUMERIC(8,2),
  actual_work_days NUMERIC(8,2),
  total_shifts    NUMERIC(8,0),
  source          TEXT DEFAULT 'buildertrend',
  bt_imported_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bt_schedule_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt_schedule_select" ON bt_schedule_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "bt_schedule_insert" ON bt_schedule_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bt_schedule_update" ON bt_schedule_items FOR UPDATE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS bt_financials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bt_job_id         INTEGER NOT NULL,
  bt_line_item_id   INTEGER UNIQUE,
  entity_type       TEXT,
  parent_entity_title TEXT,
  line_item_title   TEXT,
  cost_code_title   TEXT,
  cost_category_title TEXT,
  cost_type         TEXT,
  amount            NUMERIC(14,2),
  amount_paid       NUMERIC(14,2),
  paid_status       TEXT,
  paid_date         DATE,
  due_date          DATE,
  date_added        DATE,
  vendor_name       TEXT,
  is_variance       BOOLEAN DEFAULT false,
  source            TEXT DEFAULT 'buildertrend',
  bt_imported_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bt_financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt_financials_select" ON bt_financials FOR SELECT TO authenticated USING (true);
CREATE POLICY "bt_financials_insert" ON bt_financials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bt_financials_update" ON bt_financials FOR UPDATE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS bt_qb_costs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bt_job_id         INTEGER NOT NULL,
  transaction_id    TEXT,
  accounting_li_id  TEXT UNIQUE,
  account_name      TEXT,
  vendor_name       TEXT,
  cost_code_title   TEXT,
  cost_category_title TEXT,
  cost_type         TEXT,
  payment_method    TEXT,
  amount            NUMERIC(14,2),
  amount_paid       NUMERIC(14,2),
  date_created      DATE,
  due_date          DATE,
  source            TEXT DEFAULT 'buildertrend',
  bt_imported_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bt_qb_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt_qb_costs_select" ON bt_qb_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "bt_qb_costs_insert" ON bt_qb_costs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bt_qb_costs_update" ON bt_qb_costs FOR UPDATE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS bt_estimate_lines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bt_job_id             INTEGER NOT NULL,
  bt_estimate_line_id   TEXT UNIQUE,
  feature_type          TEXT,
  estimate_title        TEXT,
  feature_title         TEXT,
  cost_code_title       TEXT,
  cost_category_title   TEXT,
  cost_type             TEXT,
  unit_cost             NUMERIC(14,4),
  quantity              NUMERIC(14,4),
  unit_type             TEXT,
  orig_builder_cost     NUMERIC(14,2),
  orig_owner_price      NUMERIC(14,2),
  revised_builder_cost  NUMERIC(14,2),
  estimate_status       TEXT,
  latest_approval_status TEXT,
  estimate_approval_date DATE,
  source                TEXT DEFAULT 'buildertrend',
  bt_imported_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bt_estimate_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt_estimate_lines_select" ON bt_estimate_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "bt_estimate_lines_insert" ON bt_estimate_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bt_estimate_lines_update" ON bt_estimate_lines FOR UPDATE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS bt_leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bt_lead_id          INTEGER UNIQUE,
  lead_title          TEXT,
  lead_status         TEXT,
  contact_first_name  TEXT,
  contact_last_name   TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  contact_cell        TEXT,
  street              TEXT,
  city                TEXT,
  state               TEXT,
  zip                 TEXT,
  lead_source         TEXT,
  project_type        TEXT,
  sales_people        TEXT,
  lead_tags           TEXT,
  general_notes       TEXT,
  projected_sale_date DATE,
  sold_date           DATE,
  lead_created_date   DATE,
  approved_owner_price  NUMERIC(14,2),
  approved_builder_cost NUMERIC(14,2),
  source              TEXT DEFAULT 'buildertrend',
  bt_imported_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bt_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt_leads_select" ON bt_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "bt_leads_insert" ON bt_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bt_leads_update" ON bt_leads FOR UPDATE TO authenticated USING (true);
"""


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="BuilderTrend CSV → PBS importer")
    parser.add_argument("csv_file", help="Path to the BuilderTrend CSV file")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to DB")
    parser.add_argument("--setup-sql", action="store_true", help="Print setup SQL for BT tables and exit")
    args = parser.parse_args()

    if args.setup_sql:
        print(SETUP_SQL)
        return

    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        print(f"ERROR: File not found: {csv_path}")
        sys.exit(1)

    print(f"\nReading {csv_path.name}…")
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False, na_values=["", "NULL", "null", "N/A"])

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    csv_type = detect_type(df)
    print(f"Detected CSV type: {csv_type}")

    if args.dry_run:
        print("⚠️  DRY RUN — no data will be written\n")

    dispatch = {
        "jobsites_rollup":    import_jobsites_rollup,
        "schedule":           import_schedule,
        "invoices_bills_pos": import_invoices_bills_pos,
        "qb_costs":           import_qb_costs,
        "estimate_revised":   import_estimate_revised,
        "sales_rollup":       import_sales_rollup,
        "daily_logs":         import_daily_logs,
    }

    if csv_type not in dispatch:
        print(f"\nUnrecognized CSV type '{csv_type}'.")
        print("Columns found:", list(df.columns[:15]))
        print("\nSupported types: Jobsites Rollup, Schedule, Invoices/Bills/POs,")
        print("QB Costs, Estimate Revised, Sales Rollup, Daily Logs")
        print("\nMore CSV types (Change Orders, Time Clock, etc.) can be added — just ask!")
        sys.exit(1)

    ok, err = dispatch[csv_type](df, args.dry_run)

    print(f"\n{'='*50}")
    print(f"Done. {ok} rows imported, {err} errors.")
    if csv_type == "daily_logs":
        print("\nNote: Daily Logs needs its own one-time setup SQL (the")
        print("bt_daily_log_id + bt_author_name columns and the unique index)")
        print("run in the Supabase SQL Editor before importing.")
    elif csv_type != "jobsites_rollup":
        print("\nNote: For non-jobs CSVs, run --setup-sql first if you haven't already:")
        print("  python bt-import.py any.csv --setup-sql | (copy output to Supabase SQL Editor)")


if __name__ == "__main__":
    main()
