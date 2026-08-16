# Qarote production Postgres image — for dokku-postgres and bare-Docker deploys.
#
# postgres:17-bookworm (Debian) so data lives at the STANDARD
# /var/lib/postgresql/data — the path dokku-postgres mounts its volume at — plus
# TimescaleDB and the TimescaleDB Toolkit via the official apt packages.
#
# Why not timescale/timescaledb-ha? It ships the Toolkit but writes data to
# /home/postgres/pgdata and runs as a fixed `postgres` UID, so pointing it at the
# dokku-postgres volume crashes on `initdb: could not change permissions ...
# Operation not permitted`. This image keeps the vanilla postgres entrypoint,
# user, and data path, so it drops in exactly like the plain images — just with
# the extensions added.
#
# Validated (2026-07-15): fresh initdb AND swap onto an existing plain-postgres
# data directory (the prod postgres:17.5 → this case) both preserve data,
# preload timescaledb, and activate both extensions.
#
# `docker/postgresql/Dockerfile` (FROM -ha) is the LOCAL DEV image; this one is
# for production/self-hosted where the volume path matters.
FROM postgres:17-bookworm

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends gnupg curl ca-certificates lsb-release; \
    echo "deb https://packagecloud.io/timescale/timescaledb/debian/ $(lsb_release -cs) main" \
      > /etc/apt/sources.list.d/timescaledb.list; \
    curl -fsSL https://packagecloud.io/timescale/timescaledb/gpgkey \
      | gpg --dearmor -o /etc/apt/trusted.gpg.d/timescaledb.gpg; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      timescaledb-2-postgresql-17 \
      timescaledb-toolkit-postgresql-17; \
    rm -rf /var/lib/apt/lists/*

# TimescaleDB requires shared_preload_libraries='timescaledb'. The entrypoint
# wrapper MERGES timescaledb into any existing preload list (so a swapped-in
# volume that already relies on e.g. pg_stat_statements keeps it), on both a fresh
# initdb and a pre-existing data directory, then hands off to the stock postgres
# entrypoint. The Toolkit needs no preload.
COPY ensure-timescaledb-preload.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/ensure-timescaledb-preload.sh
ENTRYPOINT ["ensure-timescaledb-preload.sh"]
CMD ["postgres"]

# Readiness probe so orchestration can tell a healthy DB from one that failed
# during preload/initdb. start-period covers first-boot initdb + preload.
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" || exit 1
