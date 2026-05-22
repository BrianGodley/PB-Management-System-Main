# BuilderTrend CSV Import Guide

## One-time setup

### 1. Run the SQL migration
In **Supabase SQL Editor**, run `supabase-update-91.sql` to add BuilderTrend columns to the jobs table.

### 2. Run the BT tables SQL (for non-jobs CSVs)
Still in SQL Editor, run the output of:
```
python scripts/bt-import.py any.csv --setup-sql
```
This creates: `bt_schedule_items`, `bt_financials`, `bt_qb_costs`, `bt_estimate_lines`, `bt_leads`

### 3. Add service role key to .env
Get it from: **Supabase Dashboard → Project Settings → API → service_role key**

Add to your `.env` file:
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```
> ⚠️ Never commit this key to git. It's already in .gitignore.

### 4. Install Python dependencies
```bash
pip install requests pandas python-dotenv
```

---

## Importing a CSV

```bash
# Dry run first (no data written — safe to preview)
python scripts/bt-import.py path/to/Jobsites_Rollup.csv --dry-run

# Real import
python scripts/bt-import.py path/to/Jobsites_Rollup.csv
```

Imports are **idempotent** — running the same file twice is safe. Existing rows update in place.

---

## Supported CSV types (auto-detected from columns)

| BuilderTrend Export Name | Imports Into |
|--------------------------|-------------|
| Jobsites Rollup          | `jobs` table |
| Sales Rollup             | `bt_leads` table |
| Schedule                 | `bt_schedule_items` table |
| Invoices, Bills & POs    | `bt_financials` table |
| QB Costs                 | `bt_qb_costs` table |
| Estimate Revised         | `bt_estimate_lines` table |
| Daily Logs               | `daily_logs` table (the live app table) |

Additional types (Change Orders, Time Clock, etc.) can be added — just ask!

> **Daily Logs** writes into the real `daily_logs` app table, not a `bt_*` store.
> Before importing it, run its one-time setup SQL in the Supabase SQL Editor —
> it adds the `bt_daily_log_id` and `bt_author_name` columns plus a unique index
> (which makes the import idempotent). The CSV carries only an attachment *count*,
> not the photo files, so imported logs have no images — the count is noted in
> each log's text instead.

---

## Recommended import order

1. **Jobsites Rollup** — imports jobs first (other tables reference bt_job_id)
2. **Sales Rollup** — lead/proposal history
3. **Estimate Revised** — cost line items per job
4. **Invoices, Bills & POs** — financial transactions
5. **QB Costs** — QuickBooks sync data
6. **Schedule** — project schedule items
