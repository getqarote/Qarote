/**
 * TimescaleDB bootstrap units — inline, versioned, immutable.
 *
 * These statements create objects that CANNOT live in a Prisma migration: a
 * continuous aggregate's DDL (`CREATE MATERIALIZED VIEW ... WITH
 * (timescaledb.continuous)`) and its policies must run OUTSIDE a transaction,
 * whereas Prisma / `core/migrate.ts` wrap each migration in `BEGIN/COMMIT`.
 *
 * Why inline TS instead of `.sql` files: this bootstrap must run in EVERY
 * deployment mode (binary, Docker, Dokku, `tsx` dev) — unlike Prisma migrations,
 * Docker/Dokku have no `prisma migrate deploy` equivalent that would create the
 * CAGG. Shipping the SQL as a compiled constant guarantees it is present in every
 * artifact; a missing `.sql` directory in any one of them would silently skip the
 * CAGG and resurrect the "seasonal baseline is dead" failure mode (§6c/#249).
 *
 * IMMUTABILITY CONTRACT (mirrors migrations): a unit is identified by `name` and
 * checksummed by the runner. **Never edit the statements of a shipped unit** — the
 * runner treats a changed checksum as a hard error, not an auto-drop, so a
 * populated CAGG is never silently `DROP`ped by an edit. To change the CAGG, add a
 * NEW unit (e.g. `21_queue_metric_hourly_v2`) that performs the change explicitly.
 *
 * Each statement runs in its OWN `query()` (no transaction). Every statement is
 * idempotent (`IF NOT EXISTS` / `if_not_exists => true`) so a boot that races or
 * re-runs is safe.
 */

export interface BootstrapUnit {
  /** Immutable, ordered identifier (lexical order = apply order). */
  readonly name: string;
  /** Statements applied in order, each in its own non-transactional query(). */
  readonly statements: readonly string[];
}

/**
 * `queue_metric_hourly` — hourly rollup backing the seasonal baseline (ADR-004
 * §6c). Philosophy B: raw counters are stored, so the CAGG keeps a per-hour
 * `counter_agg` sketch of the counters (read → `rate()` per hour) and a
 * `percentile_agg` sketch of the `messagesReady` gauge. The baseline read then
 * percentiles across the matching hour-of-day buckets — ≤168 tiny rows/series
 * instead of a ~10k-row raw `EXTRACT(HOUR)` scan.
 *
 * Correctness notes (folded from the ADR reviews):
 * - camelCase columns are quoted (`queue_metric_snapshots` has no column @map).
 * - `counter_agg` needs a timestamptz axis → `"timestamp" AT TIME ZONE 'UTC'`
 *   (the column is naive-UTC `timestamp without time zone`).
 * - `materialized_only = true`: the read never scans raw (the whole premise).
 * - `create_group_indexes = false` + an explicit composite index covering the
 *   4-way equality + bucket read (the auto per-GROUP-BY indexes don't).
 * - `WITH NO DATA`: no inline `refresh_continuous_aggregate` (illegal in a txn,
 *   would block boot). The refresh policy's first scheduled run materialises the
 *   last 8 days; tables are empty pre-launch so there is nothing to backfill.
 * - retention 10d (read window is 7d) so the rollup doesn't grow unbounded while
 *   raw drops at 30d.
 */
const QUEUE_METRIC_HOURLY: BootstrapUnit = {
  name: "20_queue_metric_hourly",
  statements: [
    `CREATE MATERIALIZED VIEW IF NOT EXISTS queue_metric_hourly
       WITH (timescaledb.continuous,
             timescaledb.materialized_only = true,
             timescaledb.create_group_indexes = false) AS
     SELECT "workspaceId",
            "serverId",
            "queueName",
            "vhost",
            time_bucket('1 hour', "timestamp") AS bucket,
            counter_agg("timestamp" AT TIME ZONE 'UTC', "publishCount"::double precision) AS publish_ctr,
            counter_agg("timestamp" AT TIME ZONE 'UTC', "deliverCount"::double precision) AS deliver_ctr,
            percentile_agg("messagesReady"::double precision) AS ready_pct,
            count(*) AS n
       FROM queue_metric_snapshots
      GROUP BY 1, 2, 3, 4, 5
      WITH NO DATA`,

    `CREATE INDEX IF NOT EXISTS queue_metric_hourly_lookup_idx
       ON queue_metric_hourly ("serverId", "queueName", "vhost", bucket DESC)`,

    `SELECT add_continuous_aggregate_policy('queue_metric_hourly',
              start_offset => INTERVAL '8 days',
              end_offset => INTERVAL '1 hour',
              schedule_interval => INTERVAL '1 hour',
              if_not_exists => true)`,

    `SELECT add_retention_policy('queue_metric_hourly',
              INTERVAL '10 days',
              if_not_exists => true)`,
  ],
};

/** Applied in array order (which must stay lexical by `name`). */
export const TIMESCALE_BOOTSTRAP_UNITS: readonly BootstrapUnit[] = [
  QUEUE_METRIC_HOURLY,
];
