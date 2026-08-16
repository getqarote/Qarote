import { execSync } from "node:child_process";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runTimescaleBootstrap } from "../ts-bootstrap";

/**
 * Integration test for the TimescaleDB bootstrap + the queue_metric_hourly CAGG
 * against a REAL TimescaleDB + Toolkit database (the unit suite mocks the DB, so
 * the actual continuous-aggregate DDL and the counter_agg/percentile_agg read SQL
 * are otherwise never executed). Spins up `timescale/timescaledb-ha:pg17`.
 *
 * Skips gracefully without Docker; gated to CI / RUN_DB_TESTS=1 so a plain local
 * `pnpm test` never pulls the ~6 GB image.
 */
const dockerAvailable = (() => {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const ciEnabled = process.env.CI === "true" || process.env.CI === "1";
const runIntegration =
  dockerAvailable && (ciEnabled || process.env.RUN_DB_TESTS === "1");

describe.skipIf(!runIntegration)(
  "ts-bootstrap (integration, real Timescale Toolkit CAGG)",
  () => {
    let container: StartedPostgreSqlContainer;
    let pool: Pool;
    let connectionUri: string;

    beforeAll(async () => {
      container = await new PostgreSqlContainer("timescale/timescaledb-ha:pg17")
        .withDatabase("test")
        .withUsername("postgres")
        .withPassword("test")
        .start();
      connectionUri = container.getConnectionUri();
      pool = new Pool({ connectionString: connectionUri });

      await pool.query(`CREATE EXTENSION IF NOT EXISTS timescaledb`);
      await pool.query(`CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit`);
      await pool.query(`
        CREATE TABLE queue_metric_snapshots (
          "serverId" text, "workspaceId" text, "queueName" text, vhost text,
          messages bigint, "messagesReady" bigint, "messagesUnack" bigint,
          "publishCount" bigint, "deliverCount" bigint,
          "consumerCount" int, "timestamp" timestamp)`);
      await pool.query(`
        SELECT create_hypertable('queue_metric_snapshots','timestamp',
          chunk_time_interval => INTERVAL '1 day')`);

      // Steady traffic at hour 14 across 7 days: publish +1000/s, deliver +500/s,
      // messagesReady 90. Cumulative counters derived from epoch so rate() is exact.
      await pool.query(`
        INSERT INTO queue_metric_snapshots
        SELECT 'srv1','ws1','q1','/',
          100, 90, 10,
          (extract(epoch from ts)::bigint * 1000),
          (extract(epoch from ts)::bigint * 500),
          3, ts
        FROM generate_series(
          date_trunc('day', now()) - INTERVAL '6 days' + INTERVAL '14 hours',
          date_trunc('day', now()) + INTERVAL '14 hours',
          INTERVAL '1 minute') AS ts
        WHERE extract(hour from ts) = 14`);

      // Create the CAGG via the real bootstrap, then materialise it (the boot path
      // relies on the refresh policy; a test refreshes inline, which is legal here
      // because the pool runs autocommit — not inside the bootstrap's own query).
      await runTimescaleBootstrap(connectionUri);
      await pool.query(
        `CALL refresh_continuous_aggregate('queue_metric_hourly', NULL, NULL)`
      );
    }, 180_000);

    afterAll(async () => {
      await pool?.end().catch(() => {});
      await container?.stop().catch(() => {});
    });

    it("creates the queue_metric_hourly continuous aggregate + records the unit", async () => {
      const { rows: cagg } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM timescaledb_information.continuous_aggregates
         WHERE view_name = 'queue_metric_hourly'`
      );
      expect(cagg[0].n).toBe(1);

      const { rows: tracked } = await pool.query<{ name: string }>(
        `SELECT "name" FROM "_qarote_ts_bootstrap"`
      );
      expect(tracked.map((r) => r.name)).toContain("20_queue_metric_hourly");
    });

    it("rate baseline from the CAGG matches the raw PERCENTILE_CONT within tolerance", async () => {
      // CAGG read (service rate branch): EXACT percentile over per-hour rate, plus
      // bucket_count = # of hourly buckets that produced a rate.
      const { rows: cagg } = await pool.query<{
        median: number;
        p95: number;
        sample_count: string;
        bucket_count: string;
      }>(`
        WITH hourly AS (
          SELECT rate(publish_ctr) AS r, n
          FROM queue_metric_hourly
          WHERE "workspaceId" = 'ws1' AND "serverId" = 'srv1'
            AND "queueName" = 'q1' AND "vhost" = '/'
            AND bucket >= now() - INTERVAL '7 days'
            AND EXTRACT(HOUR FROM bucket) = 14
        )
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r)::float AS median,
               PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r)::float AS p95,
               COALESCE(sum(n), 0)::bigint AS sample_count,
               count(r)::bigint AS bucket_count
        FROM hourly`);

      // Raw reference (the pre-#253 query): percentile over per-5min rate.
      const { rows: raw } = await pool.query<{ median: number }>(`
        WITH bucketed AS (
          SELECT rate(counter_agg("timestamp" AT TIME ZONE 'UTC', "publishCount"::double precision)) AS r
          FROM queue_metric_snapshots
          WHERE "workspaceId" = 'ws1' AND "serverId" = 'srv1'
            AND "queueName" = 'q1' AND "vhost" = '/'
            AND "timestamp" >= now() - INTERVAL '7 days'
            AND EXTRACT(HOUR FROM "timestamp") = 14
          GROUP BY time_bucket(INTERVAL '5 minutes', "timestamp")
        )
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r)::float AS median
        FROM bucketed`);

      // Steady 1000/s → both ~1000; assert the CAGG is within 1% of the raw.
      expect(cagg[0].median).toBeCloseTo(1000, -1);
      expect(Math.abs(cagg[0].median - raw[0].median)).toBeLessThan(
        raw[0].median * 0.01
      );

      // sum(n) (the min-sample gate) must equal the real raw sample count behind
      // the matching hour-of-day buckets — compare to the raw table, not a magic
      // number (the exact count depends on now()'s position within the day).
      const { rows: rawCount } = await pool.query<{ n: string }>(`
        SELECT count(*)::bigint AS n FROM queue_metric_snapshots
        WHERE "workspaceId" = 'ws1' AND "serverId" = 'srv1'
          AND "queueName" = 'q1' AND "vhost" = '/'
          AND "timestamp" >= now() - INTERVAL '7 days'
          AND EXTRACT(HOUR FROM "timestamp") = 14`);
      expect(Number(cagg[0].sample_count)).toBe(Number(rawCount[0].n));
      expect(Number(cagg[0].sample_count)).toBeGreaterThan(300);

      // bucket_count = full-hour buckets with ≥2 samples (rate() needs ≥2 points):
      // 6 full days here (the last partial day's single-sample bucket → rate NULL).
      // This — not sample_count — is what the rate branch's min-sample gate checks.
      expect(Number(cagg[0].bucket_count)).toBeGreaterThanOrEqual(5);
    });

    it("gauge baseline rolls up the messagesReady percentile sketch", async () => {
      const { rows } = await pool.query<{ median: number }>(`
        SELECT approx_percentile(0.5, rollup(ready_pct))::float AS median
        FROM queue_metric_hourly
        WHERE "workspaceId" = 'ws1' AND "serverId" = 'srv1'
          AND "queueName" = 'q1' AND "vhost" = '/'
          AND bucket >= now() - INTERVAL '7 days'
          AND EXTRACT(HOUR FROM bucket) = 14`);
      expect(rows[0].median).toBeCloseTo(90, 0);
    });

    it("is idempotent — a second run applies nothing and does not error", async () => {
      await expect(
        runTimescaleBootstrap(connectionUri)
      ).resolves.toBeUndefined();
      const { rows } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM "_qarote_ts_bootstrap"
         WHERE "name" = '20_queue_metric_hourly'`
      );
      expect(rows[0].n).toBe(1);
    });

    it("refuses to proceed if a shipped unit's checksum changed (never auto-drops)", async () => {
      await pool.query(
        `UPDATE "_qarote_ts_bootstrap" SET "checksum" = 'tampered'
         WHERE "name" = '20_queue_metric_hourly'`
      );
      await expect(runTimescaleBootstrap(connectionUri)).rejects.toThrow(
        /different checksum/i
      );
      // The CAGG is untouched — the guard errors instead of dropping it.
      const { rows } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM timescaledb_information.continuous_aggregates
         WHERE view_name = 'queue_metric_hourly'`
      );
      expect(rows[0].n).toBe(1);

      // Restore so afterAll teardown is clean (defensive).
      const { createHash } = await import("node:crypto");
      const { TIMESCALE_BOOTSTRAP_UNITS } = await import("../ts-bootstrap.sql");
      const unit = TIMESCALE_BOOTSTRAP_UNITS[0];
      const checksum = createHash("sha256")
        .update(unit.statements.join("\n"))
        .digest("hex");
      await pool.query(
        `UPDATE "_qarote_ts_bootstrap" SET "checksum" = $1 WHERE "name" = $2`,
        [checksum, unit.name]
      );
    });

    it("resumes a partially-applied unit (status=applying, same checksum)", async () => {
      // Simulate a partial failure: the object was dropped and the row is left in
      // `applying` with the correct checksum. A re-run must RESUME (idempotent),
      // recreate the CAGG, and mark it applied — not error.
      const { createHash } = await import("node:crypto");
      const { TIMESCALE_BOOTSTRAP_UNITS } = await import("../ts-bootstrap.sql");
      const unit = TIMESCALE_BOOTSTRAP_UNITS[0];
      const checksum = createHash("sha256")
        .update(unit.statements.join("\n"))
        .digest("hex");
      await pool.query(
        `DROP MATERIALIZED VIEW IF EXISTS queue_metric_hourly CASCADE`
      );
      await pool.query(
        `UPDATE "_qarote_ts_bootstrap" SET "status" = 'applying', "checksum" = $1
         WHERE "name" = $2`,
        [checksum, unit.name]
      );

      await expect(
        runTimescaleBootstrap(connectionUri)
      ).resolves.toBeUndefined();

      const { rows: cagg } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM timescaledb_information.continuous_aggregates
         WHERE view_name = 'queue_metric_hourly'`
      );
      expect(cagg[0].n).toBe(1);
      const { rows: st } = await pool.query<{ status: string }>(
        `SELECT "status" FROM "_qarote_ts_bootstrap" WHERE "name" = $1`,
        [unit.name]
      );
      expect(st[0].status).toBe("applied");
    });

    it("rejects an edited unit left in 'applying' by a partial failure (immutability holds mid-recovery)", async () => {
      // The hole this closes: a partial failure records `applying` with the OLD
      // checksum; a later deploy edits the unit (new checksum). Without persisting
      // the checksum before running, IF NOT EXISTS would keep the stale object and
      // the new checksum would be recorded — bypassing immutability. The guard must
      // fire on the checksum mismatch even while status = applying.
      const { createHash } = await import("node:crypto");
      const { TIMESCALE_BOOTSTRAP_UNITS } = await import("../ts-bootstrap.sql");
      const unit = TIMESCALE_BOOTSTRAP_UNITS[0];
      await pool.query(
        `UPDATE "_qarote_ts_bootstrap"
           SET "status" = 'applying', "checksum" = 'old-partial-checksum'
         WHERE "name" = $1`,
        [unit.name]
      );
      await expect(runTimescaleBootstrap(connectionUri)).rejects.toThrow(
        /different checksum/i
      );
      // CAGG untouched — guard errors instead of keeping a stale object.
      const { rows: cagg } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM timescaledb_information.continuous_aggregates
         WHERE view_name = 'queue_metric_hourly'`
      );
      expect(cagg[0].n).toBe(1);

      // Restore for teardown.
      const checksum = createHash("sha256")
        .update(unit.statements.join("\n"))
        .digest("hex");
      await pool.query(
        `UPDATE "_qarote_ts_bootstrap" SET "status" = 'applied', "checksum" = $1
         WHERE "name" = $2`,
        [checksum, unit.name]
      );
    });
  }
);
