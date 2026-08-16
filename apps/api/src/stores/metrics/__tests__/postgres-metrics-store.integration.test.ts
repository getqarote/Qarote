import { execSync } from "node:child_process";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PostgresMetricsStore } from "../postgres-metrics-store";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Integration test for the read-time rate derivation SQL against a REAL
 * TimescaleDB + Toolkit database (the app's unit suite mocks the DB, so the
 * actual counter_agg / rate() / last() / time_bucket SQL is otherwise never
 * executed). Spins up `timescale/timescaledb-ha:pg17` via testcontainers.
 *
 * Skips gracefully when Docker is unavailable (local dev without Docker); runs
 * anywhere a Docker daemon is present, including CI.
 */
const dockerAvailable = (() => {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

// This pulls the ~6 GB timescaledb-ha image, so only run in CI or when explicitly
// opted in (RUN_DB_TESTS=1) — never on a plain local `pnpm test`. Match exact
// enabled values so "0"/"false"/CI=false don't accidentally start the container.
const ciEnabled = process.env.CI === "true" || process.env.CI === "1";
const runIntegration =
  dockerAvailable && (ciEnabled || process.env.RUN_DB_TESTS === "1");

describe.skipIf(!runIntegration)(
  "PostgresMetricsStore.getQueueRateSeries (integration, real Timescale Toolkit)",
  () => {
    let container: StartedPostgreSqlContainer;
    let pool: Pool;
    let db: PrismaClient;
    let store: PostgresMetricsStore;

    beforeAll(async () => {
      container = await new PostgreSqlContainer("timescale/timescaledb-ha:pg17")
        .withDatabase("test")
        .withUsername("postgres")
        .withPassword("test")
        .start();

      pool = new Pool({ connectionString: container.getConnectionUri() });
      db = new PrismaClient({ adapter: new PrismaPg(pool) });
      store = new PostgresMetricsStore(db);

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
          chunk_time_interval => INTERVAL '1 hour')`);

      // q1: steady — publish +1000/s, deliver +500/s, 21 points 1 min apart.
      await pool.query(`
        INSERT INTO queue_metric_snapshots
        SELECT 'srv1','ws1','q1','/', 100,90,10,
          (n*60000)::bigint, (n*30000)::bigint, 3,
          now() - (20 - n) * interval '1 minute'
        FROM generate_series(0,20) n`);
      // q2: publish +800/s but the counter RESETS at point 10 (broker restart);
      // counter_agg must handle it without a huge negative rate.
      await pool.query(`
        INSERT INTO queue_metric_snapshots
        SELECT 'srv1','ws1','q2','/', 50,40,10,
          (CASE WHEN n < 10 THEN n*48000 ELSE (n-10)*48000 END)::bigint,
          (n*24000)::bigint, 2,
          now() - (20 - n) * interval '1 minute'
        FROM generate_series(0,20) n`);
      // q3: a single sample — no basis for a rate.
      await pool.query(`
        INSERT INTO queue_metric_snapshots VALUES
          ('srv1','ws1','q3','/', 7,7,0, 123456, 65432, 1, now() - interval '1 minute')`);
    }, 180_000);

    afterAll(async () => {
      await db?.$disconnect().catch(() => {});
      await pool?.end().catch(() => {});
      await container?.stop().catch(() => {});
    });

    it("derives publish/consume rate from the counter delta", async () => {
      const rows = await store.getQueueRateSeries({
        workspaceId: "ws1",
        serverId: "srv1",
        queueName: "q1",
        vhost: "/",
        since: new Date(Date.now() - 60 * 60 * 1000),
        resolution: "raw",
      });

      // Steady-state buckets (2 samples spanning 60 s) → exact 1000 / 500.
      const steady = rows.filter((r) => r.publishRate > 0);
      expect(steady.length).toBeGreaterThan(3);
      for (const r of steady) {
        expect(r.publishRate).toBeCloseTo(1000, 0);
        expect(r.consumeRate).toBeCloseTo(500, 0);
      }
    });

    it("carries the point-in-time gauges via last()", async () => {
      const rows = await store.getQueueRateSeries({
        workspaceId: "ws1",
        serverId: "srv1",
        queueName: "q1",
        vhost: "/",
        since: new Date(Date.now() - 60 * 60 * 1000),
        resolution: "raw",
      });
      const last = rows.at(-1)!;
      expect(last.messages).toBe(100n);
      expect(last.messagesReady).toBe(90n);
      expect(last.consumerCount).toBe(3);
    });

    it("handles a counter reset without a negative rate", async () => {
      const rows = await store.getQueueRateSeries({
        workspaceId: "ws1",
        serverId: "srv1",
        queueName: "q2",
        vhost: "/",
        since: new Date(Date.now() - 60 * 60 * 1000),
        resolution: "raw",
      });
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.publishRate).toBeGreaterThanOrEqual(0);
      }
      // Away from the reset boundary the rate is ~800/s.
      expect(rows.some((r) => Math.abs(r.publishRate - 800) < 50)).toBe(true);
    });

    it("returns rate 0 for a single-sample bucket (no basis)", async () => {
      const rows = await store.getQueueRateSeries({
        workspaceId: "ws1",
        serverId: "srv1",
        queueName: "q3",
        vhost: "/",
        since: new Date(Date.now() - 60 * 60 * 1000),
        resolution: "raw",
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].publishRate).toBe(0);
      expect(rows[0].consumeRate).toBe(0);
    });

    it("filters to a single queue when queueName/vhost are given", async () => {
      const rows = await store.getQueueRateSeries({
        workspaceId: "ws1",
        serverId: "srv1",
        queueName: "q1",
        vhost: "/",
        since: new Date(Date.now() - 60 * 60 * 1000),
        resolution: "raw",
      });
      expect(rows.every((r) => r.queueName === "q1")).toBe(true);
    });

    it("percentiles the derived rate (mirrors seasonal-baseline rate branch)", async () => {
      // Mirrors fetchBaseline's rate branch: percentile over per-bucket rate.
      const rows = await db.$queryRaw<
        { median: number; p95: number; sample_count: bigint }[]
      >`
        WITH bucketed AS (
          SELECT rate(counter_agg("timestamp" AT TIME ZONE 'UTC', "publishCount"::double precision)) AS r
          FROM queue_metric_snapshots
          WHERE "workspaceId" = 'ws1' AND "serverId" = 'srv1'
            AND "queueName" = 'q1' AND "vhost" = '/'
            AND "timestamp" >= now() - INTERVAL '7 days'
          GROUP BY time_bucket(INTERVAL '5 minutes', "timestamp")
        )
        SELECT
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r)::float AS median,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r)::float AS p95,
          COUNT(r)::bigint AS sample_count
        FROM bucketed`;
      expect(rows[0].median).toBeCloseTo(1000, 0);
      expect(Number(rows[0].sample_count)).toBeGreaterThan(0);
    });
  }
);
