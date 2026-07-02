#!/bin/sh
# Restore a PostgreSQL backup produced by backup.sh (RC-03 P0-1).
# Usage (from the host):
#   docker compose run --rm -v "$PWD/infrastructure/scripts:/scripts:ro" \
#     db-backup sh /scripts/restore.sh /backups/db-YYYYmmdd-HHMMSS.dump
#
# DESTRUCTIVE: pg_restore --clean drops and recreates objects in the target DB.
# Test on a scratch database first (set POSTGRES_DB to a throwaway name).
set -eu

DUMP="${1:?usage: restore.sh /backups/db-<timestamp>.dump}"
DB_HOST="${BACKUP_DB_HOST:-db}"

[ -f "$DUMP" ] || { echo "[restore] file not found: $DUMP" >&2; exit 1; }

echo "[restore] restoring $DUMP into $POSTGRES_DB @ $DB_HOST"
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  -h "$DB_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner "$DUMP"
echo "[restore] done — verify row counts before pointing the app at it."
