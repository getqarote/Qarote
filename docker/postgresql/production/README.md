# Qarote production Postgres image (TimescaleDB + Toolkit)

Debian `postgres:17` + `timescaledb` + `timescaledb_toolkit`, keeping the standard
`/var/lib/postgresql/data` path so it drops into `dokku-postgres` (and bare Docker)
in place of the plain images. See the `Dockerfile` header for why not `-ha`.

**Why it's needed:** the read paths derive throughput rates with the Toolkit's
`counter_agg`/`rate()` (Philosophy B, ADR-004 §1), and the boot migration runs
`CREATE EXTENSION timescaledb_toolkit`. A Postgres extension is a server-side
binary that must ship in the image — so this image must be live on an environment
**before** that migration deploys, or the API crash-loops (a boot preflight names
the missing extension).

## Build & publish

Automated by `.github/workflows/release-postgres.yml`: it builds the multi-arch
image and pushes `ghcr.io/getqarote/postgres:17` (+ an immutable `17-<sha>`)
whenever this directory changes on `main`, or on manual `workflow_dispatch`.
Decoupled from the app's `v*` releases — the image only changes on a PG /
TimescaleDB / Toolkit bump.

First publish (before the workflow lands on `main`), or a one-off, manually
(needs `docker login ghcr.io` with the publisher credentials):

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/getqarote/postgres:17 --push docker/postgresql/production
```

## Upgrade a dokku-postgres service (staging / prod)

This image and the plain images all mount `/var/lib/postgresql/data`, so the data
**files** survive the swap. But the migration path depends on **which image the
service runs today**, because of a UID gotcha — read the right case below.

> ⚠️ **UID gotcha (bit us on staging 2026-07-15).** This image runs postgres as
> **UID 999** (Debian standard). A volume initialised by
> `timescale/timescaledb:*` is **Alpine → UID 70**, so the new container gets
> `postgresql.conf: Permission denied` and the entrypoint's fail-fast **refuses to
> start** (by design — it won't drop your preload list). You must `chown` the
> volume. A volume from a plain **Debian** `postgres:*` image is already UID 999 —
> no chown needed.

**Always back up first (non-negotiable):**

```bash
dokku postgres:export <service> > <service>-$(date +%F).dump
```

### Case A — current image is plain Debian `postgres` (UID 999 already)

e.g. prod `rabbithq-db` (`postgres:17.5`). Clean swap, no chown; this also adds
TimescaleDB for the first time (prod never had it):

```bash
POSTGRES_IMAGE=ghcr.io/getqarote/postgres POSTGRES_IMAGE_VERSION=17 \
  dokku postgres:upgrade <service>
```

### Case B — current image is Alpine `timescale/timescaledb` (UID 70)

e.g. staging `rabbit-hq-db` was `timescale/timescaledb:latest-pg17`. Stop first so
the running UID-70 postgres releases its files, then chown, then upgrade. The `&&`
chains them so a later step is skipped if an earlier one fails — but it can NOT
undo a partial run (e.g. chown done, upgrade failed). If it stops midway, use the
rollback below.

```bash
dokku postgres:stop <service> \
  && sudo chown -R 999:999 /var/lib/dokku/services/postgres/<service>/data \
  && POSTGRES_IMAGE=ghcr.io/getqarote/postgres POSTGRES_IMAGE_VERSION=17 \
       dokku postgres:upgrade <service>
```

If the swap fails, roll back (validated) — the old Alpine image owns the volume as
UID 70:

```bash
sudo chown -R 70:70 /var/lib/dokku/services/postgres/<service>/data
POSTGRES_IMAGE=timescale/timescaledb POSTGRES_IMAGE_VERSION=latest-pg17 \
  dokku postgres:upgrade <service>
```

### After either case

```bash
# 1. Bump timescaledb ONLY if it already exists (Case B — the volume's extension is
#    older than this image's). The guard makes it a no-op on Case A, where
#    timescaledb isn't created yet (plain postgres) and a bare ALTER would error;
#    there the app migration runs CREATE EXTENSION on first deploy. Toolkit
#    creation is a separate, unconditional step (it doesn't depend on timescaledb).
dokku postgres:connect <service> <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    ALTER EXTENSION timescaledb UPDATE;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('timescaledb','timescaledb_toolkit') ORDER BY 1;
SQL

# 2. Worker apps hold advisory-lock DB connections and fail-fast (57P01) when the
#    DB container is recreated; dokku leaves them `exited`. Restart them.
dokku ps:restart <worker-app>   # e.g. qarote-worker-staging
```

- **staging** service = `rabbit-hq-db` (host `5.75.164.253`) — **migrated to this
  image 2026-07-15** (Case B: chown 70→999, timescaledb 2.27.2 → 2.28.2, Toolkit
  1.23.0). Worker app to restart: `qarote-worker-staging`.
- **prod** service = `rabbithq-db` (host `167.235.18.119`) — still `postgres:17.5`;
  **Case A** (no chown). This upgrade ALSO adds TimescaleDB, so it's the
  prerequisite for the pending TimescaleDB migration, not only the Toolkit.

## Ordering gate

Do **not** deploy the app version that ships the drop-derived-rate-columns
migration until the target env's Postgres runs this image (or otherwise has
`timescaledb_toolkit` available). Verify with the `pg_available_extensions` query
above. `POSTGRES_IMAGE` must be re-exported for any future `postgres:rebuild` /
`postgres:upgrade` — confirm it persists.
