#!/bin/sh
# Automated backup — PostgreSQL (pg_dump, custom format) + /uploads (RC-03 P0-1).
# Run on a schedule by the `db-backup` compose service. Writes timestamped
# artifacts to /backups with retention, and (optionally) syncs them off-box.
#
# Required env (from .env / env_file): POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD.
# Optional env:
#   BACKUP_RETENTION_DAYS   keep local artifacts this many days (default 7)
#   BACKUP_REMOTE           rclone remote (e.g. "r2:prepgenius-backups"); off-box
#                           sync runs only if set AND rclone is available.
set -eu

TS=$(date +%Y%m%d-%H%M%S)
DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
DB_HOST="${BACKUP_DB_HOST:-db}"

mkdir -p "$DIR"
echo "[backup] $TS start (db=$POSTGRES_DB host=$DB_HOST retention=${RETENTION_DAYS}d)"

# 1. Database — custom format so we can pg_restore selectively; compressed.
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$DB_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -Fc -f "$DIR/db-$TS.dump"
echo "[backup] db dump -> db-$TS.dump"

# 2. Uploads (media). Skip cleanly if the dir is empty/absent.
if [ -d /uploads ] && [ -n "$(ls -A /uploads 2>/dev/null || true)" ]; then
  tar -czf "$DIR/uploads-$TS.tar.gz" -C /uploads .
  echo "[backup] uploads -> uploads-$TS.tar.gz"
else
  echo "[backup] uploads empty/absent — skipped"
fi

# 3. Local retention.
find "$DIR" -maxdepth 1 -name 'db-*.dump' -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
find "$DIR" -maxdepth 1 -name 'uploads-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

# 4. Off-box sync (mandatory for go-live; operator configures BACKUP_REMOTE).
if [ -n "${BACKUP_REMOTE:-}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    rclone copy "$DIR" "$BACKUP_REMOTE" --max-age "$((RETENTION_DAYS * 24 + 1))h"
    echo "[backup] off-box sync -> $BACKUP_REMOTE ok"
  else
    echo "[backup] WARNING: BACKUP_REMOTE set but rclone unavailable; configure host-level off-box sync of the db_backups volume instead." >&2
  fi
else
  echo "[backup] NOTE: BACKUP_REMOTE not set — artifacts are LOCAL only. Off-box copy is required before go-live (PRD v4 §11)." >&2
fi

echo "[backup] $TS done"
