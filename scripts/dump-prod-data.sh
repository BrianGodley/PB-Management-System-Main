#!/usr/bin/env bash
# Dump PRODUCTION row data (not schema) for the staging refresh.
#
# Includes: all public tables EXCEPT the 17 acct_* ledgers and daily_log_photos,
#           plus auth.users (needed because 45 public tables have FKs to it).
# Excludes: plans, packages, tenants — staging already holds the correct rows
#           and we must not clobber its tenant list.
#
# READ-ONLY against production. Writes ~300MB to the scratch dir.
#
# Usage:  bash scripts/dump-prod-data.sh
set -euo pipefail

OUTDIR="${OUTDIR:-/home/brian/staging-refresh}"
PROD_REF="${PROD_REF:-jjlnpywpmoukgwmwczbz}"
PGBIN="$HOME/.local/pg17/usr/lib/postgresql/17/bin"
export LD_LIBRARY_PATH="$HOME/.local/pg17/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
export PGHOST="aws-1-us-east-1.pooler.supabase.com"
export PGPORT=5432
export PGUSER="postgres.${PROD_REF}"
export PGDATABASE=postgres
export PGCONNECT_TIMEOUT=20

mkdir -p "$OUTDIR"

if [ -n "${PGPASSWORD_FILE:-}" ] && [ -f "${PGPASSWORD_FILE}" ]; then
  PGPASSWORD="$(tr -d '\r\n' < "$PGPASSWORD_FILE")"
else
  read -rsp "PRODUCTION database password: " PGPASSWORD; echo
fi
export PGPASSWORD

echo "Dumping production row data (read-only)..."

"$PGBIN/pg_dump" \
  --data-only --no-owner --no-privileges --disable-triggers \
  --schema=public \
  --exclude-table='public.acct_*' \
  --exclude-table=public.daily_log_photos \
  --exclude-table=public.plans \
  --exclude-table=public.packages \
  --exclude-table=public.tenants \
  -f "$OUTDIR/prod-public-data.sql"

echo "  public data  -> $(du -h "$OUTDIR/prod-public-data.sql" | cut -f1)"

"$PGBIN/pg_dump" \
  --data-only --no-owner --no-privileges \
  --table=auth.users \
  -f "$OUTDIR/prod-auth-users.sql"

echo "  auth.users   -> $(du -h "$OUTDIR/prod-auth-users.sql" | cut -f1)"

unset PGPASSWORD
echo
echo "Done. Files in $OUTDIR (outside the repo, so nothing can be committed)."
echo "Tell Claude when this finishes."
