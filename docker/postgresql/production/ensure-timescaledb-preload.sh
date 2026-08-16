#!/usr/bin/env bash
# Ensure 'timescaledb' is in shared_preload_libraries WITHOUT dropping any value
# already configured (e.g. pg_stat_statements). A bare `-c shared_preload_libraries=
# timescaledb` would REPLACE the list. This merges instead — reading PostgreSQL's
# EFFECTIVE value (via `postgres -C`, which honours include / include_dir /
# postgresql.auto.conf, not just the main file) — on a fresh initdb AND on a
# pre-existing data directory, then hands off to the stock postgres entrypoint.
set -euo pipefail

if [ "${1:-}" = "postgres" ]; then
  # If the caller already set shared_preload_libraries (via -c), respect that
  # explicit choice — don't override it.
  for arg in "$@"; do
    case "$arg" in
      *shared_preload_libraries*) exec docker-entrypoint.sh "$@" ;;
    esac
  done

  data_dir="${PGDATA:-/var/lib/postgresql/data}"
  effective=""
  # Only an initialised cluster has config to resolve. `postgres -C` prints the
  # EFFECTIVE value authoritatively (includes + auto.conf), unlike grepping files.
  # postgres refuses to run as root, so drop to the postgres user via gosu.
  #
  # Distinguish a FAILED lookup from a legitimately empty value: on an existing
  # cluster a failure (permission / transient error) must NOT be read as "no
  # preload configured" — that would silently drop e.g. pg_stat_statements on that
  # boot. So keep the exit status and fail loudly instead of proceeding empty.
  # stderr is left attached (not sent to /dev/null) so the underlying cause of a
  # failed lookup surfaces in the logs; only stdout is captured into "effective".
  if [ -f "$data_dir/PG_VERSION" ]; then
    if ! effective="$(gosu postgres postgres -C shared_preload_libraries -D "$data_dir")"; then
      echo "ensure-timescaledb-preload.sh: could not read shared_preload_libraries from the existing cluster (postgres -C failed). Refusing to start to avoid dropping a configured preload list — fix the underlying error and retry." >&2
      exit 1
    fi
  fi
  effective="$(printf '%s' "$effective" | tr -d '[:space:]')"

  if [ -z "$effective" ]; then
    merged="timescaledb"
  elif printf ',%s,' "$effective" | grep -q ',timescaledb,'; then
    merged="$effective"
  else
    merged="${effective},timescaledb"
  fi

  set -- "$@" -c "shared_preload_libraries=${merged}"
fi

exec docker-entrypoint.sh "$@"
