#!/usr/bin/env tsx

/**
 * Measure messageId coverage rate across all servers with firehose data.
 *
 * Phase 2 prerequisite (see docs/internal/llm-firehose-evidence-phase-2.md):
 * pattern #4 (unrouted publishes) computes its ratio against the subset of
 * publishes that have a non-null messageId. Publishers that omit messageId
 * are invisible to that measurement. We need to know the coverage rate
 * before shipping #4 — if the median coverage is below 30%, the pattern
 * silently lies for too many users and we defer.
 *
 * Usage:
 *   pnpm -C apps/api tsx scripts/measure-firehose-messageid-coverage.ts
 *
 * Output: per-server coverage at 1h / 6h / 24h windows, plus aggregate
 * median and threshold breakdown. The trailing JSON line is machine-
 * parseable so design partners can paste it back without redacting names.
 *
 * Privacy: only counts (BigInt) and ratios leave the operator's database.
 * No payloads, no routing keys, no server names beyond the opaque id.
 */

import { prisma } from "@/core/prisma";

const WINDOWS = ["1h", "6h", "24h"] as const;
type WindowKey = (typeof WINDOWS)[number];

const DECISION_THRESHOLD = 0.3; // 30% — gate for shipping pattern #4
const HIGH_CONFIDENCE_THRESHOLD = 0.5; // 50% — pattern #4 is unambiguous

/**
 * Generous timeouts vs the Phase 1 service: this is an interactive probe,
 * not a hot path. We tolerate a 20s query so operators with ~100M events
 * in 24h still get a number rather than a timeout.
 */
const TRANSACTION_OPTIONS = { maxWait: 1_000, timeout: 30_000 };

interface RawCoverageRow {
  total_1h: bigint;
  with_id_1h: bigint;
  total_6h: bigint;
  with_id_6h: bigint;
  total_24h: bigint;
  with_id_24h: bigint;
}

interface WindowCoverage {
  total: number;
  withId: number;
  coverage: number | null; // null when total === 0
}

interface ServerCoverage {
  serverId: string;
  windows: Record<WindowKey, WindowCoverage>;
}

/**
 * Convert a count(*) bigint to a JS number, returning null if the value
 * exceeds Number.MAX_SAFE_INTEGER. Counts can plausibly hit hundreds of
 * millions per server over 24h, so the check is real, not theatrical.
 */
function safeCountToNumber(value: bigint): number | null {
  if (value < 0n) return null;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(value);
}

/**
 * Compute coverage % from two bigints. Returns null when the denominator
 * is zero (no signal in the window) or when either side overflows.
 */
export function safeCoverageRatio(
  withId: bigint,
  total: bigint
): number | null {
  const totalNum = safeCountToNumber(total);
  const withIdNum = safeCountToNumber(withId);
  if (totalNum === null || withIdNum === null) return null;
  if (totalNum === 0) return null;
  if (withIdNum > totalNum) return null; // FILTER subset must not exceed total
  return withIdNum / totalNum;
}

function formatPct(ratio: number | null): string {
  if (ratio === null) return "  n/a";
  return `${(ratio * 100).toFixed(1).padStart(5)}%`;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US").padStart(10);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

async function measureServer(serverId: string): Promise<ServerCoverage> {
  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL statement_timeout = '20s'`;
    // NOTE: Postgres folds unquoted identifiers to lowercase. The Prisma
    // schema uses PascalCase ("MessageTraceEvent") and camelCase columns
    // ("serverId", "messageId", ...). All identifiers MUST be double-quoted
    // here or the query will fail with "relation does not exist".
    return tx.$queryRaw<RawCoverageRow[]>`
      SELECT
        count(*) FILTER (WHERE "timestamp" >= NOW() - INTERVAL '1 hour') AS total_1h,
        count(*) FILTER (WHERE "timestamp" >= NOW() - INTERVAL '1 hour' AND "messageId" IS NOT NULL) AS with_id_1h,
        count(*) FILTER (WHERE "timestamp" >= NOW() - INTERVAL '6 hours') AS total_6h,
        count(*) FILTER (WHERE "timestamp" >= NOW() - INTERVAL '6 hours' AND "messageId" IS NOT NULL) AS with_id_6h,
        count(*) FILTER (WHERE "timestamp" >= NOW() - INTERVAL '24 hours') AS total_24h,
        count(*) FILTER (WHERE "timestamp" >= NOW() - INTERVAL '24 hours' AND "messageId" IS NOT NULL) AS with_id_24h
      FROM "MessageTraceEvent"
      WHERE "serverId" = ${serverId}
        AND "direction" = 'publish'::"TraceDirection"
        AND "timestamp" >= NOW() - INTERVAL '24 hours'
    `;
  }, TRANSACTION_OPTIONS);

  const row = rows[0]!;

  return {
    serverId,
    windows: {
      "1h": buildWindow(row.with_id_1h, row.total_1h),
      "6h": buildWindow(row.with_id_6h, row.total_6h),
      "24h": buildWindow(row.with_id_24h, row.total_24h),
    },
  };
}

function buildWindow(withIdRaw: bigint, totalRaw: bigint): WindowCoverage {
  return {
    total: safeCountToNumber(totalRaw) ?? 0,
    withId: safeCountToNumber(withIdRaw) ?? 0,
    coverage: safeCoverageRatio(withIdRaw, totalRaw),
  };
}

/**
 * Enumerate all known RabbitMQServer ids. We iterate this list rather than
 * scanning DISTINCT serverIds on message_trace_events directly: on large
 * deployments the latter is an expensive page scan even with the index,
 * and rabbitmq_server is typically < 100 rows. Servers without firehose
 * data simply return zeros and get filtered from the report.
 */
async function findKnownServers(): Promise<string[]> {
  const rows = await prisma.rabbitMQServer.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => r.id);
}

function printPerServerTable(servers: ServerCoverage[]): void {
  console.log("\n=== Per-server coverage ===");
  console.log(
    "server_id                              | window | publishes  | with messageId | coverage"
  );
  console.log(
    "---------------------------------------|--------|------------|----------------|---------"
  );
  for (const s of servers) {
    for (const w of WINDOWS) {
      const c = s.windows[w];
      console.log(
        `${s.serverId.padEnd(38)} | ${w.padEnd(6)} | ${formatCount(c.total)} | ${formatCount(c.withId)} | ${formatPct(c.coverage)}`
      );
    }
  }
}

function printAggregate(servers: ServerCoverage[]): void {
  console.log("\n=== Aggregate (median across servers with signal) ===");

  for (const w of WINDOWS) {
    const withSignal = servers
      .map((s) => s.windows[w].coverage)
      .filter((v): v is number => v !== null);
    const med = median(withSignal);
    const aboveDecision = withSignal.filter(
      (v) => v >= DECISION_THRESHOLD
    ).length;
    const aboveHigh = withSignal.filter(
      (v) => v >= HIGH_CONFIDENCE_THRESHOLD
    ).length;

    console.log(
      `${w.padEnd(4)} | n=${withSignal.length} servers with signal | median=${formatPct(med)} | ≥30%: ${aboveDecision}/${withSignal.length} | ≥50%: ${aboveHigh}/${withSignal.length}`
    );
  }
}

function printDecisionHint(servers: ServerCoverage[]): void {
  const withSignal24h = servers
    .map((s) => s.windows["24h"].coverage)
    .filter((v): v is number => v !== null);
  const med = median(withSignal24h);

  console.log("\n=== Decision hint for Phase 2 #4 (unrouted publishes) ===");
  if (med === null) {
    console.log(
      "❓ No publish data in the last 24h — cannot decide. Run the firehose worker and retry."
    );
    return;
  }
  if (med >= HIGH_CONFIDENCE_THRESHOLD) {
    console.log(
      `✅ Median coverage = ${formatPct(med).trim()} (≥ 50%). Ship pattern #4 with no caveats — coverage is high enough that ratios are meaningful.`
    );
  } else if (med >= DECISION_THRESHOLD) {
    console.log(
      `⚠️  Median coverage = ${formatPct(med).trim()} (30-50%). Ship pattern #4 with the per-server coverage rendered inline in the section (so the LLM can self-qualify the ratio).`
    );
  } else {
    console.log(
      `🛑 Median coverage = ${formatPct(med).trim()} (< 30%). DEFER pattern #4 — sample bias makes the ratio misleading for most users. Topology-aware fallback is more truthful.`
    );
  }
}

function printJsonReport(servers: ServerCoverage[]): void {
  const payload = {
    measured_at: new Date().toISOString(),
    decision_threshold: DECISION_THRESHOLD,
    high_confidence_threshold: HIGH_CONFIDENCE_THRESHOLD,
    servers: servers.map((s) => ({
      server_id: s.serverId,
      windows: WINDOWS.reduce(
        (acc, w) => {
          acc[w] = s.windows[w];
          return acc;
        },
        {} as Record<WindowKey, WindowCoverage>
      ),
    })),
  };
  console.log("\n=== JSON report (paste this back to share) ===");
  console.log(JSON.stringify(payload, null, 2));
}

async function main(): Promise<void> {
  console.log("🔎 Measuring messageId coverage across active servers...");

  const serverIds = await findKnownServers();
  if (serverIds.length === 0) {
    console.log("⚠️  No RabbitMQ servers configured.");
    return;
  }
  console.log(`Found ${serverIds.length} known server(s); measuring each.\n`);

  const allResults: ServerCoverage[] = [];
  let failureCount = 0;
  for (const serverId of serverIds) {
    try {
      allResults.push(await measureServer(serverId));
    } catch (err) {
      failureCount++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${serverId}: failed to measure — ${msg}`);
    }
  }

  // Drop servers with zero signal in every window — they only add noise.
  const results = allResults.filter((s) =>
    WINDOWS.some((w) => s.windows[w].total > 0)
  );
  if (results.length === 0) {
    console.log(
      "⚠️  No servers have firehose publish data in the last 24h. Ensure the firehose worker is running and try again."
    );
    // Non-zero exit if every server errored (vs simply having no data) so
    // this script can be wired into a CI check later without false positives.
    if (failureCount === serverIds.length) process.exitCode = 1;
    return;
  }

  printPerServerTable(results);
  printAggregate(results);
  printDecisionHint(results);
  printJsonReport(results);
}

main()
  .catch((err) => {
    console.error("💥 Unhandled error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
