import { createHash } from "node:crypto";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { demoConfig } from "@/config";
import { isDemoMode } from "@/config/deployment";

import { AlertSeverity, LlmProvider, Prisma } from "@/generated/prisma/client";

/**
 * Bootstrap demo environment on first boot.
 *
 * When DEMO_MODE=true, seeds a RabbitMQ server connection pointing to the
 * demo RabbitMQ container so the dashboard has live monitoring data.
 *
 * Runs after bootstrapAdmin() has created the admin user and workspace.
 */
export async function bootstrapDemo(): Promise<void> {
  if (!isDemoMode()) return;

  try {
    await seedDemo();
  } catch (error) {
    logger.error(
      { error },
      "Demo bootstrap failed — demo RabbitMQ may not be available"
    );
  }
}

async function seedDemo(): Promise<void> {
  const {
    rabbitmqHost: host,
    rabbitmqPort: port,
    rabbitmqAmqpPort: amqpPort,
    rabbitmqUser: username,
    rabbitmqPass: password,
    rabbitmqVhost: vhost,
  } = demoConfig;

  if (!host || !username || !password) {
    // Operator misconfiguration (not a transient): DEMO_MODE is on but the
    // broker connection is unset, so the demo would boot with an empty
    // showcase. Log at error level so it's caught before the demo goes live.
    logger.error(
      "DEMO_MODE=true but DEMO_RABBITMQ_HOST/USER/PASS are not set — skipping demo seed; the demo will have no server or findings"
    );
    return;
  }

  // Find the first workspace (created by bootstrapAdmin)
  const workspace = await prisma.workspace.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!workspace) {
    logger.warn(
      "No workspace found — demo seed requires bootstrapAdmin to run first"
    );
    return;
  }

  // Check if a demo server already exists
  const existing = await prisma.rabbitMQServer.findFirst({
    where: { workspaceId: workspace.id, name: "Demo RabbitMQ" },
    select: { id: true },
  });

  if (existing) {
    // Server exists — still check if alerts / diagnostics need seeding
    const alertCount = await prisma.alert.count({
      where: { workspaceId: workspace.id },
    });
    if (alertCount === 0) {
      await seedDemoAlerts(workspace.id, existing.id, vhost || "/");
    }
    await seedDemoSnapshots(workspace.id, existing.id, vhost || "/");
    await seedDemoDiagnostics(workspace.id, existing.id, vhost || "/");
    await seedDemoConfigFindings(workspace.id, existing.id, vhost || "/");
    return;
  }

  const server = await prisma.rabbitMQServer.create({
    data: {
      name: "Demo RabbitMQ",
      host,
      port,
      amqpPort,
      username,
      password,
      vhost: vhost || "/",
      workspaceId: workspace.id,
    },
  });

  logger.info(
    { host, workspaceId: workspace.id },
    "Demo RabbitMQ server connection seeded"
  );

  // Seed demo alerts so the Alerts page has content
  await seedDemoAlerts(workspace.id, server.id, vhost || "/");

  // Seed diagnosis findings + cached AI explanations so the wedge
  // (Incident Diagnosis + AI Explain) is populated for visitors. Snapshots
  // are the engine's input; the records carry the explanation cache.
  await seedDemoSnapshots(workspace.id, server.id, vhost || "/");
  await seedDemoDiagnostics(workspace.id, server.id, vhost || "/");
  await seedDemoConfigFindings(workspace.id, server.id, vhost || "/");
}

async function seedDemoAlerts(
  workspaceId: string,
  serverId: string,
  vhost: string
): Promise<void> {
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  // Fingerprint format must match alert.fingerprint.ts:
  //   queue alerts: {serverId}-{category}-queue-{vhost}-{sourceName}
  //   node alerts:  {serverId}-{category}-node-{sourceName}
  const fp = (category: string, sourceType: string, sourceName: string) =>
    sourceType === "queue"
      ? `${serverId}-${category}-${sourceType}-${vhost}-${sourceName}`
      : `${serverId}-${category}-${sourceType}-${sourceName}`;

  const alerts = [
    {
      title: "High queue depth on orders.processing",
      description:
        "Queue orders.processing has 1,543 messages ready, exceeding the threshold of 1,000.",
      severity: "CRITICAL" as const,
      status: "ACTIVE" as const,
      category: "queue_depth",
      sourceType: "queue",
      sourceName: "orders.processing",
      serverName: "Demo RabbitMQ",
      // In the range the simulator actually reaches (plateaus near 1,700).
      threshold: 1000,
      value: 1543,
      firstSeenAt: minutesAgo(45),
      lastSeenAt: minutesAgo(2),
      fingerprint: fp("queue_depth", "queue", "orders.processing"),
    },
    {
      title: "Consumer count dropped on notifications.email",
      description:
        "Queue notifications.email has 0 consumers, down from 3. Messages are accumulating.",
      severity: "HIGH" as const,
      status: "ACTIVE" as const,
      category: "consumer_count",
      sourceType: "queue",
      sourceName: "notifications.email",
      serverName: "Demo RabbitMQ",
      threshold: 1,
      value: 0,
      firstSeenAt: minutesAgo(20),
      lastSeenAt: minutesAgo(1),
      fingerprint: fp("consumer_count", "queue", "notifications.email"),
    },
    // A message-rate and an unacked alert were removed here: both were false
    // by ~250x against the live broker, and nothing at this traffic level
    // crosses either threshold, so retuning them would just invent smaller
    // numbers. What remains is verifiable or node-scoped.
    {
      title: "Memory alarm cleared on node rabbit@demo",
      description:
        "Memory usage dropped below the high watermark. Node is operating normally.",
      severity: "MEDIUM" as const,
      status: "RESOLVED" as const,
      category: "memory_alarm",
      sourceType: "node",
      sourceName: "rabbit@demo",
      serverName: "Demo RabbitMQ",
      threshold: 80,
      value: 65,
      firstSeenAt: minutesAgo(180),
      lastSeenAt: minutesAgo(150),
      resolvedAt: minutesAgo(140),
      fingerprint: null,
    },
    {
      title: "Disk space warning on node rabbit@demo",
      description:
        "Disk free space is at 2.1 GB, approaching the low watermark of 1 GB.",
      severity: "LOW" as const,
      status: "RESOLVED" as const,
      category: "disk_alarm",
      sourceType: "node",
      sourceName: "rabbit@demo",
      serverName: "Demo RabbitMQ",
      threshold: 5,
      value: 2.1,
      firstSeenAt: minutesAgo(360),
      lastSeenAt: minutesAgo(300),
      resolvedAt: minutesAgo(240),
      fingerprint: null,
    },
  ];

  await prisma.alert.createMany({
    data: alerts.map((alert) => ({
      ...alert,
      workspaceId,
      serverId,
      // Same split the analyser applies at runtime.
      vhost: alert.sourceType === "queue" ? vhost : null,
      createdAt: alert.firstSeenAt,
      updatedAt: alert.lastSeenAt,
    })),
  });

  logger.info({ count: alerts.length }, "Demo alerts seeded");
}

// Provider/model the demo's cached explanations are keyed on. The explain
// route resolves these from WorkspaceLlmConfig, so the seeded LlmExplanation
// rows must match exactly for the read-through cache to serve a hit (and never
// make a live LLM call). See llm.router.ts read-through cache.
const DEMO_LLM_PROVIDER = LlmProvider.ANTHROPIC;
const DEMO_LLM_MODEL = "claude-haiku-4-5";
// Mirrors FINDING_PROMPT_VERSION in
// ee/services/llm/context-builders/finding.context.ts — inlined to keep this
// CE-safe core file free of EE imports. A sync test pins it to the canonical
// value (a mismatch would silently break the demo's explanation cache hits).
export const DEMO_FINDING_PROMPT_VERSION = "1.1";
// Mirrors CONFIG_FINDING_PROMPT_VERSION in the same context-builders dir.
export const DEMO_CONFIG_PROMPT_VERSION = "1.0";

/**
 * Mirrors computeFingerprint() in ee/services/incident/dedup.ts. Inlined so
 * this core file (shared with the CE mirror, which strips apps/api/src/ee/)
 * carries no EE import. Must stay in sync with the canonical implementation.
 */
export function demoFingerprint(
  ruleId: string,
  scope: "queue" | "broker",
  queueName: string,
  vhost: string
): string {
  return createHash("sha256")
    .update(`${scope}\0${ruleId}\0${queueName}\0${vhost}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Seed the diagnosis showcase: a WorkspaceLlmConfig (so the explain cache
 * resolves a provider/model), a set of realistic IncidentDiagnosisRecord
 * findings, and a matching pre-written LlmExplanation for each so "Explain
 * with AI" serves a cache hit at zero runtime cost. The demo deployment
 * sets DIAGNOSIS_RESOLVE_TTL_MS very high, so the engine's resolve pass
 * never marks these seeded findings stale.
 */
async function seedDemoDiagnostics(
  workspaceId: string,
  serverId: string,
  vhost: string
): Promise<void> {
  // LLM config keys the explanation cache. enabled:true so the capability
  // reads as configured; no API key is needed because every seeded finding
  // resolves to a cached explanation (no live call path is exercised).
  await prisma.workspaceLlmConfig.upsert({
    where: { workspaceId },
    update: {},
    create: {
      workspaceId,
      provider: DEMO_LLM_PROVIDER,
      model: DEMO_LLM_MODEL,
      enabled: true,
    },
  });

  const existingFindings = await prisma.incidentDiagnosisRecord.count({
    where: { serverId },
  });
  if (existingFindings > 0) return;

  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60_000);

  // Each finding is seeded as an IncidentDiagnosisRecord whose fingerprint
  // matches what the rules engine computes from the seeded snapshots (see
  // seedDemoSnapshots). On the first /diagnosis run the engine upserts by
  // (serverId, fingerprint) — preserving this row's id — so the pre-written
  // LlmExplanation (linked by id) keeps serving as a cache hit. The engine
  // overwrites description/recommendation/severity with its computed text;
  // only firstSeenAt and the explanation content are ours.
  const findings = [
    {
      ruleId: "QUEUE_BACKLOG",
      scope: "queue" as const,
      queueName: "orders.processing",
      severity: AlertSeverity.HIGH,
      description:
        "orders.processing is holding over a thousand ready messages and climbing — publishers have outpaced consumer throughput by roughly 4:1 for the last half hour.",
      recommendation:
        "Scale the orders consumer group: the single active consumer is saturated. Add capacity or raise prefetch, then confirm the ready count trends down.",
      ageMin: 38,
      explanation:
        "**Root cause: a sustained producer/consumer imbalance, not a spike.**\n\nThe backlog on `orders.processing` has grown steadily because publishers are arriving roughly four times faster than the single consumer drains them. A gap that ratio doesn't recover on its own — every minute it persists adds to the depth, which is why the ready count keeps setting new highs rather than oscillating.\n\nThis is a throughput ceiling on the consumer side, not a transient burst: the publish rate is flat, so a retry storm or fan-out misconfiguration is unlikely. The most probable cause is a consumer blocked on a downstream dependency (DB writes, a slow API), or a prefetch set too low to keep it busy between acks.\n\n**What to do:** add consumer capacity (or raise `prefetch_count` if the worker sits idle waiting on acks) and watch the ready count. If it doesn't fall within a few minutes of scaling, the bottleneck is downstream of the consumer — profile the message handler, not RabbitMQ.",
    },
    {
      ruleId: "CONSUMER_CRASH",
      scope: "queue" as const,
      queueName: "notifications.email",
      severity: AlertSeverity.CRITICAL,
      description:
        "notifications.email has no consumers attached. Messages are accumulating with nothing draining them.",
      recommendation:
        "Restart the email worker and inspect its logs for an unhandled exception or OOM. Messages are durable and will drain once a consumer reconnects.",
      ageMin: 19,
      explanation:
        "**Root cause: the consumer fleet died, not RabbitMQ.**\n\n`notifications.email` has zero consumers attached while its siblings on the same fanout — `notifications.push` and `notifications.sms` — are still draining normally. That asymmetry is the tell: a broker-wide problem would have taken all three down, so the failure is specific to the email worker.\n\nThe queue itself is healthy: messages are durable and simply queuing up safely. The risk is purely latency (emails are delayed), and it grows until a consumer returns.\n\n**What to do:** check the email worker's logs for the exit reason. If it's crash-looping on a poison message, the redelivery will keep killing new consumers — move the offending message to a dead-letter queue before bringing workers back.",
    },
    {
      ruleId: "SLOW_CONSUMER",
      scope: "queue" as const,
      queueName: "payments.capture",
      severity: AlertSeverity.HIGH,
      description:
        "payments.capture has consumers attached but is draining slower than it fills — consume rate has trailed publish rate for several consecutive samples.",
      recommendation:
        "Profile the capture handler — a sustained consume<publish gap usually means a downstream call (payment gateway, DB lock) regressed, or prefetch is too low. Check gateway response times first.",
      ageMin: 52,
      explanation:
        "**Root cause: the consumer is alive but slow — a downstream regression.**\n\n`payments.capture` consumers are still acking, so this isn't a crash. But the consume rate has trailed the publish rate for several consecutive samples — RabbitMQ is delivering fine; the time is being spent inside the handler.\n\nA gap this sustained almost always traces to a single downstream dependency: a payment-gateway call that started timing out and retrying, a database row-lock under contention, or a connection pool exhausted by the slower calls backing up.\n\n**What to do:** correlate the slowdown with downstream metrics. Start with the payment gateway's p95 — if it regressed at the same time, that's your cause and RabbitMQ is just the messenger. If the handler is healthy, raise `prefetch_count` so idle consumers pull more work.",
    },
  ];

  for (const f of findings) {
    const seenAt = minutesAgo(f.ageMin);
    const record = await prisma.incidentDiagnosisRecord.create({
      data: {
        serverId,
        workspaceId,
        fingerprint: demoFingerprint(f.ruleId, f.scope, f.queueName, vhost),
        scope: f.scope,
        ruleId: f.ruleId,
        queueName: f.queueName,
        vhost,
        severity: f.severity,
        description: f.description,
        recommendation: f.recommendation,
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
      },
    });

    await prisma.llmExplanation.create({
      data: {
        workspaceId,
        incidentFindingId: record.id,
        promptVersion: DEMO_FINDING_PROMPT_VERSION,
        provider: DEMO_LLM_PROVIDER,
        model: DEMO_LLM_MODEL,
        content: f.explanation,
        inputTokens: 0,
        outputTokens: 0,
      },
    });
  }

  logger.info({ count: findings.length }, "Demo diagnosis findings seeded");
}

/**
 * Seed the metric-snapshot history the diagnosis engine reads (the /diagnosis
 * page recomputes findings live from QueueMetricSnapshot — it does not display
 * persisted records). Each queue's 2-hour series is shaped to trip exactly one
 * visible rule, matching the seeded findings above so their explanations
 * cache-hit:
 *   - orders.processing  → QUEUE_BACKLOG  (depth climbs; publishRate=0 on the
 *     final sample so SLOW_CONSUMER's idle-end guard suppresses it)
 *   - notifications.email → CONSUMER_CRASH (consumers drop to 0 within the last
 *     30 min while messages pile up; this supersedes its own backlog)
 *   - payments.capture   → SLOW_CONSUMER  (consume<publish every sample, depth
 *     creeps up only ~10% so QUEUE_BACKLOG's 20% threshold stays quiet)
 */
async function seedDemoSnapshots(
  workspaceId: string,
  serverId: string,
  vhost: string
): Promise<void> {
  const existing = await prisma.queueMetricSnapshot.count({
    where: { serverId },
  });
  if (existing > 0) return;

  // 200 × 60 s = 200 min of history. Crosses the 180-min DIAGNOSIS_WARMUP_MINUTES
  // threshold (capability-axis.ts) so the demo doesn't render the "warming up —
  // findings may be sparse" advisory while showing populated findings.
  //
  // Points are 60 s apart (prod cadence). Philosophy B (ADR-004 §1): the rate is
  // derived at read time from cumulative counters via counter_agg, which needs
  // >= 2 samples per bucket — 5-min spacing would leave 2-min buckets
  // single-sampled and derive a rate of 0. So we seed a monotonic counter per
  // queue whose per-step increment is `rate * stepSeconds`.
  const POINTS = 200;
  const STEP_MS = 60 * 1000;
  const STEP_SECONDS = STEP_MS / 1000;
  const now = Date.now();
  const ts = (i: number) => new Date(now - (POINTS - 1 - i) * STEP_MS);
  const lerp = (a: number, b: number, i: number) =>
    Math.round(a + ((b - a) * i) / (POINTS - 1));

  const counters: Record<string, { publish: bigint; deliver: bigint }> = {};
  const accrue = (
    queueName: string,
    publishRate: number,
    consumeRate: number
  ) => {
    const c = (counters[queueName] ??= { publish: 0n, deliver: 0n });
    c.publish += BigInt(Math.round(publishRate * STEP_SECONDS));
    c.deliver += BigInt(Math.round(consumeRate * STEP_SECONDS));
    return { publishCount: c.publish, deliverCount: c.deliver };
  };

  const data: {
    serverId: string;
    workspaceId: string;
    queueName: string;
    vhost: string;
    messages: bigint;
    messagesReady: bigint;
    messagesUnack: bigint;
    publishCount: bigint;
    deliverCount: bigint;
    consumerCount: number;
    timestamp: Date;
  }[] = [];

  for (let i = 0; i < POINTS; i++) {
    const minsFromEnd = POINTS - 1 - i;
    // Publish stops over the last few minutes (visible under 2-min rate buckets).
    const publishStopped = minsFromEnd < 3;
    const base = { serverId, workspaceId, vhost, timestamp: ts(i) };

    // Magnitudes track what the demo simulator actually sustains, so the
    // engine's description agrees with a live `list_queues` read. The matching
    // per-queue regimes live in the demo role's simulator template.
    const ordersMsgs = lerp(120, 1700, i);
    data.push({
      ...base,
      queueName: "orders.processing",
      messages: BigInt(ordersMsgs),
      messagesReady: BigInt(ordersMsgs - 1),
      messagesUnack: BigInt(1),
      // ~4:1 in/out gap, uncapped: the one queue meant to back up.
      ...accrue("orders.processing", publishStopped ? 0 : 0.15, 0.033),
      consumerCount: 1,
    });

    // Depth held flat so this queue trips ONLY CONSUMER_CRASH. A rising depth
    // would also trip QUEUE_BACKLOG (which CONSUMER_CRASH supersedes) — that
    // shows a dimmed 4th "caused-by" card and mismatches the sidebar's
    // primary-finding count.
    // Consumers drop over the last 20 min so the 30-min CONSUMER_CRASH window
    // still sees both "had consumers" and "now 0".
    const crashed = minsFromEnd < 20;
    // 800 = the x-max-length the simulator sets on this queue, which is what
    // holds the depth flat on the live broker too.
    const notifMsgs = 800;
    data.push({
      ...base,
      queueName: "notifications.email",
      messages: BigInt(notifMsgs),
      messagesReady: BigInt(notifMsgs),
      messagesUnack: BigInt(0),
      // The fanout hits all three notification queues on every batch.
      ...accrue(
        "notifications.email",
        publishStopped ? 0 : 0.6,
        crashed ? 0 : 0.6
      ),
      consumerCount: crashed ? 0 : 1,
    });

    // Near-flat by design: SLOW_CONSUMER keys on the consume/publish gap, not
    // depth, and x-max-length keeps it below QUEUE_BACKLOG's threshold.
    const payMsgs = lerp(880, 900, i);
    data.push({
      ...base,
      queueName: "payments.capture",
      messages: BigInt(payMsgs),
      messagesReady: BigInt(payMsgs - 1),
      messagesUnack: BigInt(1),
      ...accrue("payments.capture", 0.15, 0.033),
      consumerCount: 1,
    });
  }

  await prisma.queueMetricSnapshot.createMany({ data });
  logger.info(
    { count: data.length, queues: 3 },
    "Demo metric snapshots seeded"
  );
}

/**
 * Seed Config Scan findings. Unlike diagnosis, the Config Scan page lists
 * persisted ConfigFinding rows directly (no live recompute), so seeding the
 * rows is enough for them to show. Each gets a pre-written LlmExplanation so
 * "Explain with AI" cache-hits, matching the diagnosis experience.
 */
async function seedDemoConfigFindings(
  workspaceId: string,
  serverId: string,
  vhost: string
): Promise<void> {
  const existing = await prisma.configFinding.count({ where: { serverId } });
  if (existing > 0) return;

  const findings: {
    ruleKey: string;
    severity: AlertSeverity;
    resourceType: string;
    resourceName: string;
    vhost: string | null;
    details: Prisma.InputJsonValue;
    explanation: string;
  }[] = [
    {
      ruleKey: "config.user.guest_enabled",
      severity: AlertSeverity.CRITICAL,
      resourceType: "user",
      resourceName: "guest",
      vhost: null,
      details: { user: "guest" },
      explanation:
        "**The built-in `guest` account is still enabled.**\n\nRabbitMQ ships with a `guest`/`guest` superuser that, by default, can only connect over loopback. The moment the broker is reachable from another host (a container network, a load balancer, a misconfigured firewall) that well-known credential becomes a full-cluster backdoor.\n\n**What to do:** delete the `guest` user (or at minimum strip its permissions and set `loopback_users` correctly), and create per-service accounts scoped to the vhosts they actually use.",
    },
    {
      ruleKey: "config.queue.quorum_queue_minority_replicas",
      severity: AlertSeverity.HIGH,
      resourceType: "queue",
      resourceName: "payments.capture",
      vhost,
      details: { queueName: "payments.capture", replicas: 2, clusterNodes: 5 },
      explanation:
        "**`payments.capture` is a quorum queue with too few replicas.**\n\nIt has 2 members on a 5-node cluster. Quorum queues need a majority of members online to accept writes — with only 2 replicas, losing a single node drops you to 1/2 and the queue goes read-only (publishers blocked). On a 5-node cluster the intended replication factor is 3 or 5.\n\n**What to do:** grow the member set (`rabbitmq-queues grow` or an odd-replica policy) so the queue tolerates at least one node failure.",
    },
    {
      ruleKey: "config.queue.missing_dlx",
      severity: AlertSeverity.MEDIUM,
      resourceType: "queue",
      resourceName: "orders.processing",
      vhost,
      details: { queueName: "orders.processing", vhost },
      explanation:
        "**`orders.processing` has no dead-letter exchange.**\n\nWhen a message is rejected, expires, or exceeds the queue length limit, it is silently dropped — there is nowhere for poison messages to go. For an orders pipeline that means lost orders with no audit trail.\n\n**What to do:** set `x-dead-letter-exchange` (via queue argument or a policy) pointing at a DLX, and bind an `orders.dlq` queue to capture and inspect failures.",
    },
    {
      ruleKey: "config.queue.exclusive_in_production",
      severity: AlertSeverity.INFO,
      resourceType: "queue",
      resourceName: "session.cache.tmp",
      vhost,
      details: { queueName: "session.cache.tmp", vhost },
      explanation:
        "**`session.cache.tmp` is an exclusive queue.**\n\nExclusive queues are tied to the connection that declared them and vanish when it closes — fine for short-lived RPC replies, risky as durable infrastructure: a reconnect wipes the queue and any buffered messages. Seeing one with steady traffic usually means a client is using it as a real work queue.\n\n**What to do:** if this is genuinely per-connection scratch space it's fine; if other services depend on it, redeclare it as a normal durable queue.",
    },
    {
      ruleKey: "config.vhost.default_unscoped",
      severity: AlertSeverity.INFO,
      resourceType: "vhost",
      resourceName: "/",
      vhost: "/",
      details: { vhost: "/" },
      explanation:
        "**Production workloads are running on the default `/` vhost.**\n\nThe default vhost has no isolation boundary — every service shares the same namespace, permissions surface, and blast radius. A bad policy or an accidental purge hits everything at once.\n\n**What to do:** create per-environment / per-team vhosts (e.g. `prod`, `payments`) and move workloads off `/` so permissions and policies can be scoped independently.",
    },
  ];

  for (const f of findings) {
    const fingerprint = `${serverId}|${f.ruleKey}|${f.resourceType}|${f.vhost ?? ""}|${f.resourceName}`;
    const record = await prisma.configFinding.create({
      data: {
        workspaceId,
        serverId,
        ruleKey: f.ruleKey,
        severity: f.severity,
        resourceType: f.resourceType,
        resourceName: f.resourceName,
        vhost: f.vhost,
        fingerprint,
        details: f.details,
      },
    });

    await prisma.llmExplanation.create({
      data: {
        workspaceId,
        configFindingId: record.id,
        promptVersion: DEMO_CONFIG_PROMPT_VERSION,
        provider: DEMO_LLM_PROVIDER,
        model: DEMO_LLM_MODEL,
        content: f.explanation,
        inputTokens: 0,
        outputTokens: 0,
      },
    });
  }

  logger.info({ count: findings.length }, "Demo config findings seeded");
}
