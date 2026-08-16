import { PostgresMetricsStore } from "./postgres-metrics-store";

export * from "./metrics-store";

/**
 * The active metrics READ store. Postgres/TimescaleDB today (cloud + self-hosted).
 * This singleton line is the backend-selection seam: when a `ClickHouseStore`
 * lands, it becomes `config.METRICS_STORE_BACKEND === "clickhouse" ? … : …` (the
 * env var added to `@/config` first, never read via `process.env` directly).
 */
export const metricsStore = new PostgresMetricsStore();
