#!/bin/bash
set -euo pipefail

# Copies Prisma migration SQL files into a target directory for binary packaging.
# Usage: ./scripts/copy-migrations.sh <target-dir>
#   e.g. ./scripts/copy-migrations.sh dist-package/qarote/migrations

TARGET_DIR="${1:?Usage: copy-migrations.sh <target-dir>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_SRC="$SCRIPT_DIR/../apps/api/prisma/migrations"

if [ ! -d "$MIGRATIONS_SRC" ]; then
  echo "Error: migrations source not found: $MIGRATIONS_SRC" >&2
  exit 1
fi

migrations_copied=0
mkdir -p "$TARGET_DIR"
for dir in "$MIGRATIONS_SRC"/*/; do
  name="$(basename "$dir")"
  if [ -f "$dir/migration.sql" ]; then
    mkdir -p "$TARGET_DIR/$name"
    cp "$dir/migration.sql" "$TARGET_DIR/$name/"
    migrations_copied=$((migrations_copied + 1))
  fi
done

if [ "$migrations_copied" -eq 0 ]; then
  echo "Error: no migration.sql files found in $MIGRATIONS_SRC" >&2
  exit 1
fi
