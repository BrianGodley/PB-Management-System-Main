#!/usr/bin/env bash
# Quick auth check against PRODUCTION. Read-only: runs `select 1`, nothing else.
# Prompts for the password; never stores or echoes it.
set -uo pipefail

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

# Password source: a file (PGPASSWORD_FILE) if given, else a hidden prompt.
# The file route exists because pasting into a hidden prompt is awkward in some
# terminals — paste into an editor tab instead, save, then shred it after.
if [ -n "${PGPASSWORD_FILE:-}" ]; then
  [ -f "$PGPASSWORD_FILE" ] || { echo "no such file: $PGPASSWORD_FILE"; exit 1; }
  PGPASSWORD="$(tr -d '\r\n' < "$PGPASSWORD_FILE")"
  echo "Using password from $PGPASSWORD_FILE (${#PGPASSWORD} chars)"
else
  read -rsp "Production database password: " PGPASSWORD; echo
fi
export PGPASSWORD

out=$("$HOME/.local/pg17/usr/lib/postgresql/17/bin/psql" -tAc "select 'AUTH OK: '||current_user||' @ '||current_database();" 2>&1)
rc=$?
unset PGPASSWORD

if [ $rc -eq 0 ]; then
  echo "$out"
  echo "Password is correct — go ahead and run: bash scripts/dump-prod-schema.sh"
else
  echo "$out" | head -3
  echo
  case "$out" in
    *"password authentication failed"*) echo "=> Wrong password. Nothing was changed; safe to try another." ;;
    *timeout*|*"could not connect"*)    echo "=> Network/host problem, not the password." ;;
    *)                                  echo "=> Failed for the reason above." ;;
  esac
fi
