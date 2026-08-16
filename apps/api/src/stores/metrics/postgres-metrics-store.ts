import { subDays } from "date-fns";

import { prisma } from "@/core/prisma";

import type {
  BaselineMetric,
  MetricsStore,
  QueueRateQuery,
  QueueRateSample,
  RateResolution,
  SeasonalBaselineQuery,
  SeasonalBaselineSample,
  ServerQueueTotalsBucket,
  ServerQueueTotalsQuery,
} from "./metrics-store";

import { Prisma } from "@/generated/prisma/client";

// Domain resolution → Postgres interval literal. `raw` is the finest interval for
// which counter_agg has >= 2 samples to compute a rate (>= ~2x the 60s cadence).
const RESOLUTION_INTERVAL: Record<RateResolution, string> = {
  raw: "2 minutes",
  coarse: "30 minutes",
};

// A rate metric derives from a stored counter_agg sketch; messagesReady is a gauge
// sketch. Internal CAGG column names never cross the port boundary.
const RATE_COUNTER_COLUMN: Record<
  Exclude<BaselineMetric, "messagesReady">,
  "publish_ctr" | "deliver_ctr"
> = {
  publishRate: "publish_ctr",
  consumeRate: "deliver_ctr",
};

interface BaselineRow {
  median: number | null;
  p95: number | null;
  sample_count: bigint | number;
  bucket_count?: bigint | number;
}

/**
 * TimescaleDB/Prisma implementation of the metrics READ port. Every method wraps
 * the exact SQL the call sites ran before §5 — same queries, same results, same
 * latency. `db` is injectable so integration tests can point at a test client.
 */
export class PostgresMetricsStore implements MetricsStore {
  constructor(
    private readonly db: Pick<typeof prisma, "$queryRaw"> &
      Pick<typeof prisma, "queueMetricSnapshot"> = prisma
  ) {}

  async getQueueRateSeries(query: QueueRateQuery): Promise<QueueRateSample[]> {
    const { workspaceId, serverId, since, queueName, vhost } = query;
    const interval = RESOLUTION_INTERVAL[query.resolution ?? "raw"];

    const queueFilter =
      queueName != null && vhost != null
        ? Prisma.sql`AND "queueName" = ${queueName} AND vhost = ${vhost}`
        : Prisma.empty;

    return this.db.$queryRaw<QueueRateSample[]>`
      SELECT
        "queueName",
        vhost,
        time_bucket(CAST(${interval} AS interval), "timestamp") AS "timestamp",
        COALESCE(rate(counter_agg("timestamp" AT TIME ZONE 'UTC', "publishCount"::double precision)), 0)::double precision AS "publishRate",
        COALESCE(rate(counter_agg("timestamp" AT TIME ZONE 'UTC', "deliverCount"::double precision)), 0)::double precision AS "consumeRate",
        last(messages, "timestamp")        AS messages,
        last("messagesReady", "timestamp") AS "messagesReady",
        last("messagesUnack", "timestamp") AS "messagesUnack",
        last("consumerCount", "timestamp") AS "consumerCount"
      FROM queue_metric_snapshots
      WHERE "workspaceId" = ${workspaceId}
        AND "serverId" = ${serverId}
        ${queueFilter}
        AND "timestamp" >= ${since}
      GROUP BY 1, 2, 3
      ORDER BY 1, 2, 3 ASC
    `;
  }

  async getServerQueueTotals(
    query: ServerQueueTotalsQuery
  ): Promise<ServerQueueTotalsBucket[]> {
    const { workspaceId, serverId, since, until } = query;
    const rows = await this.db.$queryRaw<
      Array<{
        bucket: Date;
        totalMessages: bigint;
        totalReady: bigint;
        totalUnacked: bigint;
      }>
    >`
      SELECT
        DATE_TRUNC('minute', timestamp) AS bucket,
        SUM(messages)        AS "totalMessages",
        SUM("messagesReady") AS "totalReady",
        SUM("messagesUnack") AS "totalUnacked"
      FROM queue_metric_snapshots
      WHERE "serverId"    = ${serverId}
        AND "workspaceId" = ${workspaceId}
        AND timestamp >= ${since}
        AND timestamp <= ${until}
      GROUP BY DATE_TRUNC('minute', timestamp)
      ORDER BY bucket ASC
    `;
    return rows.map((r) => ({
      timestamp: r.bucket,
      totalMessages: r.totalMessages,
      totalReady: r.totalReady,
      totalUnacked: r.totalUnacked,
    }));
  }

  async getSeasonalBaselineSample(
    query: SeasonalBaselineQuery
  ): Promise<SeasonalBaselineSample | null> {
    const { workspaceId, serverId, queueName, vhost, metric, hourOfDay } =
      query;

    // Align to the start of the current UTC hour so the window is exactly
    // lookbackDays complete same-hour buckets (matches EXTRACT(HOUR FROM bucket)
    // on the naive-UTC bucket column regardless of server TZ).
    const hourStart = new Date(query.now);
    hourStart.setUTCMinutes(0, 0, 0);
    const since = subDays(hourStart, query.lookbackDays);

    let rows: BaselineRow[];
    if (metric === "messagesReady") {
      // Gauge: rollup the per-hour percentile_agg sketches, then read.
      rows = await this.db.$queryRaw<BaselineRow[]>`
        SELECT
          approx_percentile(0.5, rollup(ready_pct))::float AS median,
          approx_percentile(0.95, rollup(ready_pct))::float AS p95,
          COALESCE(sum(n), 0)::bigint AS sample_count
        FROM queue_metric_hourly
        WHERE
          "workspaceId" = ${workspaceId}
          AND "serverId" = ${serverId}
          AND "queueName" = ${queueName}
          AND "vhost" = ${vhost}
          AND bucket >= ${since}
          AND bucket < ${hourStart}
          AND EXTRACT(HOUR FROM bucket) = ${hourOfDay}
      `;
    } else {
      // Rate: exact percentile over per-hour rate(counter_agg sketch). bucket_count
      // = hourly buckets that yielded a rate (the true sample size of the gate).
      const ctr = Prisma.raw(RATE_COUNTER_COLUMN[metric]);
      rows = await this.db.$queryRaw<BaselineRow[]>`
        WITH hourly AS (
          SELECT rate(${ctr}) AS r, n
          FROM queue_metric_hourly
          WHERE
            "workspaceId" = ${workspaceId}
            AND "serverId" = ${serverId}
            AND "queueName" = ${queueName}
            AND "vhost" = ${vhost}
            AND bucket >= ${since}
            AND bucket < ${hourStart}
            AND EXTRACT(HOUR FROM bucket) = ${hourOfDay}
        )
        SELECT
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r)::float AS median,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r)::float AS p95,
          COALESCE(sum(n), 0)::bigint AS sample_count,
          count(r)::bigint AS bucket_count
        FROM hourly
      `;
    }

    const row = rows[0];
    if (!row) return null;
    return {
      median: row.median,
      p95: row.p95,
      sampleCount: Number(row.sample_count),
      bucketCount: row.bucket_count != null ? Number(row.bucket_count) : null,
    };
  }

  async existsSince(query: {
    serverId: string;
    olderThan: Date;
  }): Promise<boolean> {
    const oldest = await this.db.queueMetricSnapshot.findFirst({
      where: { serverId: query.serverId, timestamp: { lte: query.olderThan } },
      // Existence probe only — select a column in the [serverId, timestamp] index.
      select: { serverId: true },
    });
    return oldest !== null;
  }

  async hasSnapshots(query: {
    serverId: string;
    workspaceId: string;
  }): Promise<boolean> {
    // Existence probe — findFirst stops at the first matching row (select a column
    // in the [serverId, timestamp] index), cheaper than counting all matches.
    const row = await this.db.queueMetricSnapshot.findFirst({
      where: { serverId: query.serverId, workspaceId: query.workspaceId },
      select: { serverId: true },
    });
    return row !== null;
  }
}
