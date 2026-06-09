# TimescaleDB is REQUIRED — the API runs `CREATE EXTENSION timescaledb` at boot
# (prisma migrate deploy), so local dev must use a Timescale-enabled Postgres.
# Pinned to the pg17 HA line (not :latest). Data lives under /home/postgres/pgdata
# in this image (PGDATA=/home/postgres/pgdata/data), not /var/lib/postgresql/data.
FROM timescale/timescaledb-ha:pg17
