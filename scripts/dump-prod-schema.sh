#!/usr/bin/env bash
# Dump the PRODUCTION schema (no data) to supabase/migrations/.
#
# Does exactly what `supabase db dump --linked` does — same pg_dump flags, same
# sed pipeline, captured from `supabase db dump --dry-run` — but calls pg_dump
# directly, because that command runs pg_dump inside Docker and this server has
# no Docker. pg_dump 17 lives in ~/.local/pg17 (extracted from the PGDG .deb).
#
# READ-ONLY against production. --schema-only means no rows are ever read.
# The password is prompted for: never passed as an argument, never stored.
#
# Usage:  bash scripts/dump-prod-schema.sh
set -euo pipefail

PROD_REF="${PROD_REF:-jjlnpywpmoukgwmwczbz}"
CONN="${CONN:-pooler}"          # pooler | direct
POOL_HOST="${POOL_HOST:-aws-1-us-east-1.pooler.supabase.com}"

export LD_LIBRARY_PATH="$HOME/.local/pg17/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
if [ "$CONN" = "direct" ]; then
  export PGHOST="db.${PROD_REF}.supabase.co"
  export PGUSER="postgres"
else
  export PGHOST="$POOL_HOST"
  export PGUSER="postgres.${PROD_REF}"
fi
export PGPORT="5432" PGDATABASE="postgres" PGCONNECT_TIMEOUT=15
PGBIN="${PGBIN:-$HOME/.local/pg17/usr/lib/postgresql/17/bin}"
OUT="${OUT:-supabase/migrations/20260830000000_prod_baseline.sql}"

echo "Dumping SCHEMA ONLY from ${PGHOST} (production, read-only)"
# Password source: a file (PGPASSWORD_FILE) if given, else a hidden prompt.
if [ -n "${PGPASSWORD_FILE:-}" ]; then
  [ -f "$PGPASSWORD_FILE" ] || { echo "no such file: $PGPASSWORD_FILE"; exit 1; }
  PGPASSWORD="$(tr -d '\r\n' < "$PGPASSWORD_FILE")"
  echo "Using password from $PGPASSWORD_FILE (${#PGPASSWORD} chars)"
else
  read -rsp "Production database password: " PGPASSWORD
  echo
fi
export PGPASSWORD

mkdir -p "$(dirname "$OUT")"

"$PGBIN/pg_dump" \
    --schema-only \
    --quote-all-identifier \
    --role "postgres" \
    --exclude-schema "information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault" \
| sed -E 's/^\\(un)?restrict .*$/-- &/' \
| sed -E 's/^CREATE SCHEMA "/CREATE SCHEMA IF NOT EXISTS "/' \
| sed -E 's/^CREATE TABLE "/CREATE TABLE IF NOT EXISTS "/' \
| sed -E 's/^CREATE SEQUENCE "/CREATE SEQUENCE IF NOT EXISTS "/' \
| sed -E 's/^CREATE VIEW "/CREATE OR REPLACE VIEW "/' \
| sed -E 's/^CREATE FUNCTION "/CREATE OR REPLACE FUNCTION "/' \
| sed -E 's/^CREATE TRIGGER "/CREATE OR REPLACE TRIGGER "/' \
| sed -E 's/^CREATE PUBLICATION "supabase_realtime/-- &/' \
| sed -E 's/^CREATE EVENT TRIGGER /-- &/' \
| sed -E 's/^         WHEN TAG IN /-- &/' \
| sed -E 's/^   EXECUTE FUNCTION /-- &/' \
| sed -E 's/^ALTER EVENT TRIGGER /-- &/' \
| sed -E 's/^ALTER PUBLICATION "supabase_realtime_/-- &/' \
| sed -E 's/^ALTER FOREIGN DATA WRAPPER (.+) OWNER TO /-- &/' \
| sed -E 's/^ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"/-- &/' \
| sed -E 's/^GRANT ALL ON FOREIGN DATA WRAPPER (.+) TO "postgres" WITH GRANT OPTION/-- &/' \
| sed -E "s/^GRANT (.+) ON (.+) \"(information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault)\"/-- &/" \
| sed -E "s/^REVOKE (.+) ON (.+) \"(information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault)\"/-- &/" \
| sed -E 's/^(CREATE EXTENSION IF NOT EXISTS "pg_tle").+/\1;/' \
| sed -E 's/^(CREATE EXTENSION IF NOT EXISTS "pgsodium").+/\1;/' \
| sed -E 's/^(CREATE EXTENSION IF NOT EXISTS "pgmq").+/\1;/' \
| sed -E 's/^COMMENT ON EXTENSION (.+)/-- &/' \
| sed -E 's/^CREATE POLICY "cron_job_/-- &/' \
| sed -E 's/^ALTER TABLE "cron"/-- &/' \
| sed -E 's/^SET transaction_timeout = 0;/-- &/' \
| sed -E "/^--/d" > "$OUT"

unset PGPASSWORD
echo "Wrote $OUT ($(wc -l < "$OUT") lines)"
echo "Next: npm run scan:dump -- $OUT"
