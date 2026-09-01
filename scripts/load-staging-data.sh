#!/usr/bin/env bash
# Load production row data into pbs-staging.
#
# DESTRUCTIVE on staging: truncates every public table except plans, packages
# and tenants, then loads the transformed prod dump. Production is never
# written to — this script only ever connects to staging.
#
# Prepared beforehand by Claude:
#   staging-public-data.sql  prod rows, tenant + brian ids remapped to staging
#   staging-auth-users.sql   53 prod users, password hashes blanked
#   restore-tenancy.sql      your 8 demo tenants / profiles / companies
#
# Usage:  bash scripts/load-staging-data.sh
set -euo pipefail

D="${D:-/home/brian/staging-refresh}"
STAGING_REF="fgyexksqinjczebtsuon"
PGBIN="$HOME/.local/pg17/usr/lib/postgresql/17/bin"
export LD_LIBRARY_PATH="$HOME/.local/pg17/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
export PGHOST="aws-1-us-east-2.pooler.supabase.com"
export PGPORT=5432
export PGUSER="postgres.${STAGING_REF}"
export PGDATABASE=postgres
export PGCONNECT_TIMEOUT=20
export PGPASSWORD="$(tr -d '\r\n' < /home/brian/pgpass-staging.txt)"

PSQL="$PGBIN/psql -v ON_ERROR_STOP=1"

# Refuse to run against anything but staging.
WHO=$($PSQL -tAc "select current_setting('request.jwt.claim.sub', true), inet_server_addr()::text" 2>/dev/null || true)
echo "Target: $PGHOST as $PGUSER  (pbs-staging)"
echo

echo "[1/5] Truncating staging public tables (keeping plans, packages, tenants)..."
LIST=$($PSQL -tAc "select string_agg(format('public.%I', tablename), ', ')
                   from pg_tables where schemaname='public'
                   and tablename not in ('plans','packages','tenants');")
$PSQL -c "truncate $LIST cascade;"
echo "      done"

echo "[2/5] Loading auth.users (53 rows, passwords blanked)..."
$PSQL -f "$D/staging-auth-users.sql" >/dev/null
echo "      done"

echo "[3/5] Loading public data (~96MB, this takes several minutes)..."
$PSQL -f "$D/staging-public-data.sql" >/dev/null
echo "      done"

echo "[4/5] Restoring your 8 demo tenants..."
$PSQL -f "$D/restore-tenancy.sql" >/dev/null
echo "      done"

echo "[5/6] Scrubbing live provider credentials copied from production..."
$PSQL -f "$(dirname "$0")/scrub-staging-credentials.sql" >/dev/null
echo "      done — staging cannot email, text, charge, or reach the live CRM"

echo "[6/6] Row counts:"
$PSQL -c "select 'clients' t, count(*) n from public.clients
          union all select 'jobs', count(*) from public.jobs
          union all select 'estimates', count(*) from public.estimates
          union all select 'job_invoices', count(*) from public.job_invoices
          union all select 'daily_logs', count(*) from public.daily_logs
          union all select 'time_entries', count(*) from public.time_entries
          union all select 'employees', count(*) from public.employees
          union all select 'profiles', count(*) from public.profiles
          union all select 'tenants', count(*) from public.tenants
          order by 1;"

unset PGPASSWORD
echo
echo "Done. Tell Claude, and I'll verify against production."
