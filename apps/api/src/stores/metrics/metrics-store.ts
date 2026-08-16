/**
 * MetricsStore — the vendor-agnostic READ port for queue metrics (ADR-004 §5).
 *
 * Domain intent only: no Prisma model types, no `Prisma.sql`, no Timescale/SQL
 * details cross this boundary — so a future `ClickHouseStore` can implement the
 * same interface. The Postgres implementation lives in `postgres-metrics-store.ts`.
 *
 * This port is in CE (`apps/api/src/`, not `ee/`) because CE call sites read
 * metrics (the chart route, the diagnosis-warmup gate) and the public-mirror build
 * forbids CE code importing `@/ee/`. The metrics WRITE path is a separate EE-only
 * port (`@/ee/stores/metrics/metrics-writer`) — persisting metrics is a premium
 * capability (the collector cron is EE).
 */

/**
 * Rate-series bucket size, as a domain resolution — NOT a Postgres interval
 * literal (the adapter maps it). `rate()` needs >= 2 samples per bucket, so the
 * finest resolution is >= ~2x the poll cadence.
 * - `raw`   → the finest per-sample series (chart, signals, incident snapshot).
 * - `coarse`→ a wider bucket for digests.
 */
export type RateResolution = "raw" | "coarse";

/** One per-bucket derived-rate sample plus point-in-time gauges. */
export interface QueueRateSample {
  queueName: string;
  vhost: string;
  timestamp: Date;
  publishRate: number;
  consumeRate: number;
  messages: bigint;
  messagesReady: bigint;
  messagesUnack: bigint;
  consumerCount: number;
}

export type QueueRateQuery = {
  workspaceId: string;
  serverId: string;
  since: Date;
  /** Defaults to `raw`. */
  resolution?: RateResolution;
} &
  // Filter to a single queue: `queueName` and `vhost` are all-or-nothing — both
  // together (one queue) or neither (whole server). The union rejects one alone,
  // so a caller can't silently reach the adapter with a half-filter that is then
  // ignored (returning the whole server unexpectedly).
  (| { queueName: string; vhost: string }
    | { queueName?: undefined; vhost?: undefined }
  );

/** One per-minute bucket of server-wide queue depth totals. */
export interface ServerQueueTotalsBucket {
  timestamp: Date;
  totalMessages: bigint;
  totalReady: bigint;
  totalUnacked: bigint;
}

export interface ServerQueueTotalsQuery {
  workspaceId: string;
  serverId: string;
  since: Date;
  until: Date;
}

/** The metric a seasonal baseline is computed over. */
export type BaselineMetric = "publishRate" | "consumeRate" | "messagesReady";

export interface SeasonalBaselineQuery {
  workspaceId: string;
  serverId: string;
  queueName: string;
  vhost: string;
  metric: BaselineMetric;
  /** Hour of day (0–23, UTC) to match across the lookback. */
  hourOfDay: number;
  lookbackDays: number;
  /** "Now" — the window's upper bound is aligned to the start of this UTC hour. */
  now: Date;
}

/**
 * Raw seasonal-baseline measurement from the hourly rollup — NO gating applied.
 * The caller owns the min-sample thresholds, null checks, cache and allowlist.
 * `bucketCount` is the number of hourly buckets that produced a rate (the rate
 * branch's true sample size); `null` on the gauge branch (which gates on
 * `sampleCount`, the raw readings behind the rolled-up sketch).
 */
export interface SeasonalBaselineSample {
  median: number | null;
  p95: number | null;
  sampleCount: number;
  bucketCount: number | null;
}

export interface MetricsStore {
  /** Per-bucket derived rate (+ gauges) via counter_agg, grouped/ordered by time. */
  getQueueRateSeries(query: QueueRateQuery): Promise<QueueRateSample[]>;

  /** Per-minute server-wide depth totals (SUM across queues). */
  getServerQueueTotals(
    query: ServerQueueTotalsQuery
  ): Promise<ServerQueueTotalsBucket[]>;

  /** Raw seasonal baseline for a rule's metric at an hour of day (ungated). */
  getSeasonalBaselineSample(
    query: SeasonalBaselineQuery
  ): Promise<SeasonalBaselineSample | null>;

  /** True if any snapshot exists for the server OLDER than `olderThan` (warmup). */
  existsSince(query: { serverId: string; olderThan: Date }): Promise<boolean>;

  /** True if the (server, workspace) has any snapshot at all (diagnosis gate). */
  hasSnapshots(query: {
    serverId: string;
    workspaceId: string;
  }): Promise<boolean>;
}
