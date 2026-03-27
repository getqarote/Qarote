#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------
# sync-prod-db.sh — Pull production PostgreSQL dump and
# restore it into the local Docker Compose database.
# ---------------------------------------------------------

# Production SSH settings
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa_deploy}"
SSH_USER="${SSH_USER:-rabbithq}"
SSH_HOST="${SSH_HOST:-167.235.18.119}"
DOKKU_DB_SERVICE="${DOKKU_DB_SERVICE:-rabbithq-db}"

# Local settings
LOCAL_CONTAINER="${LOCAL_CONTAINER:-rabbit_dashboard_postgres}"
LOCAL_DB="${LOCAL_DB:-qarote}"
LOCAL_USER="${LOCAL_USER:-postgres}"

DUMP_DIR="/tmp"
DUMP_FILE="$DUMP_DIR/qarote_prod_$(date +%Y%m%d_%H%M%S).dump"
LATEST_LINK="$DUMP_DIR/qarote_prod_latest.dump"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

# ── 1. Dump production database via SSH ──────────────────
log "Dumping production database via dokku postgres:export..."
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
  "dokku postgres:export $DOKKU_DB_SERVICE" \
  > "$DUMP_FILE"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
log "Dump saved: $DUMP_FILE ($DUMP_SIZE)"

# Keep a latest symlink for convenience
ln -sf "$DUMP_FILE" "$LATEST_LINK"

# ── 2. Ensure local Postgres is running ──────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${LOCAL_CONTAINER}$"; then
  log "Starting local Postgres..."
  docker compose -f "$(dirname "$0")/../docker-compose.yml" up -d postgres
  sleep 3
fi

# ── 3. Drop & recreate local database ────────────────────
log "Recreating local database..."
docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$LOCAL_DB' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true
docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -c "DROP DATABASE IF EXISTS $LOCAL_DB;" >/dev/null
docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -c "CREATE DATABASE $LOCAL_DB;" >/dev/null

# ── 4. Restore dump into local database ──────────────────
log "Restoring dump into local database..."
docker exec -i "$LOCAL_CONTAINER" pg_restore -U "$LOCAL_USER" -d "$LOCAL_DB" --no-owner --no-acl < "$DUMP_FILE"

log "Done! Local '$LOCAL_DB' is now a copy of production."

# ── 5. Cleanup old dumps (keep last 3) ───────────────────
ls -t "$DUMP_DIR"/qarote_prod_*.dump 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
