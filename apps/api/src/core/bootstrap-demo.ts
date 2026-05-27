import { createHash } from "node:crypto";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { demoConfig } from "@/config";
import { isDemoMode } from "@/config/deployment";

import { AlertSeverity, LlmProvider } from "@/generated/prisma/client";

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
    await seedDemoDiagnostics(workspace.id, existing.id, vhost || "/");
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
  // (Incident Diagnosis + AI Explain) is populated for visitors.
  await seedDemoDiagnostics(workspace.id, server.id, vhost || "/");
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
        "Queue orders.processing has 12,847 messages ready, exceeding the threshold of 10,000.",
      severity: "CRITICAL" as const,
      status: "ACTIVE" as const,
      category: "queue_depth",
      sourceType: "queue",
      sourceName: "orders.processing",
      serverName: "Demo RabbitMQ",
      threshold: 10000,
      value: 12847,
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
    {
      title: "High message rate on analytics.direct",
      description:
        "Exchange analytics.direct is publishing 1,523 msg/s, exceeding the threshold of 1,000 msg/s.",
      severity: "MEDIUM" as const,
      status: "ACKNOWLEDGED" as const,
      category: "message_rate",
      sourceType: "cluster",
      sourceName: "analytics.direct",
      serverName: "Demo RabbitMQ",
      threshold: 1000,
      value: 1523,
      firstSeenAt: minutesAgo(120),
      lastSeenAt: minutesAgo(15),
      acknowledgedAt: minutesAgo(90),
      fingerprint: fp("message_rate", "cluster", "analytics.direct"),
    },
    {
      title: "Unacknowledged messages on orders.failed",
      description:
        "Queue orders.failed has 234 unacknowledged messages. Consumers may be stuck.",
      severity: "HIGH" as const,
      status: "ACTIVE" as const,
      category: "unacked_messages",
      sourceType: "queue",
      sourceName: "orders.failed",
      serverName: "Demo RabbitMQ",
      threshold: 100,
      value: 234,
      firstSeenAt: minutesAgo(60),
      lastSeenAt: minutesAgo(3),
      fingerprint: fp("unacked_messages", "queue", "orders.failed"),
    },
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

  const findings = [
    {
      ruleId: "QUEUE_BACKLOG",
      scope: "queue" as const,
      queueName: "orders.processing",
      severity: AlertSeverity.CRITICAL,
      description:
        "orders.processing is holding 12,847 ready messages and climbing — publish rate (1,240 msg/s) has outpaced consumer throughput (310 msg/s) for the last 38 minutes.",
      recommendation:
        "Scale the orders consumer group: the 4 active consumers are saturated. Add capacity or raise prefetch, then confirm the ready count trends down.",
      ageMin: 38,
      explanation:
        "**Root cause: a sustained producer/consumer imbalance, not a spike.**\n\nThe backlog on `orders.processing` has grown steadily for ~38 minutes because publishers are sustaining ~1,240 msg/s while the 4 consumers drain only ~310 msg/s combined. That 4:1 gap compounds — at this rate the queue adds ~930 messages every second.\n\nThis is a throughput ceiling on the consumer side, not a transient burst: the publish rate is flat, so a retry storm or fan-out misconfiguration is unlikely. The most probable cause is consumers blocked on a downstream dependency (DB writes, a slow API) or a prefetch set too low to keep workers busy.\n\n**What to do:** add consumer capacity (or raise `prefetch_count` if workers are idle between acks) and watch the ready count. If it doesn't fall within a few minutes of scaling, the bottleneck is downstream of the consumers — profile the message handler, not RabbitMQ.",
    },
    {
      ruleId: "CONSUMER_CRASH",
      scope: "queue" as const,
      queueName: "notifications.email",
      severity: AlertSeverity.HIGH,
      description:
        "notifications.email dropped from 3 consumers to 0 at 02:41. 1,902 messages are now accumulating with nothing draining them.",
      recommendation:
        "Restart the email worker and inspect its logs around 02:41 for an unhandled exception or OOM. Messages are durable and will drain once a consumer reconnects.",
      ageMin: 19,
      explanation:
        "**Root cause: the consumer fleet died, not RabbitMQ.**\n\nAll 3 consumers on `notifications.email` disconnected within the same second (02:41) and none reconnected. A simultaneous drop across every consumer points to a single shared failure — a deploy that crash-loops, an unhandled exception killing the process, or an OOM — rather than independent network blips.\n\nThe queue itself is healthy: messages are durable and simply queuing up safely. The risk is purely latency (emails are delayed), and it grows until a consumer returns.\n\n**What to do:** check the email worker's logs at 02:41 for the exit reason. If it's crash-looping on a poison message, the redelivery will keep killing new consumers — move the offending message to a dead-letter queue before bringing workers back.",
    },
    {
      ruleId: "SLOW_CONSUMER",
      scope: "queue" as const,
      queueName: "payments.capture",
      severity: AlertSeverity.MEDIUM,
      description:
        "payments.capture has consumers attached but ack latency has risen to 4.2s/msg (was ~280ms). The queue is draining, but far slower than it's filling.",
      recommendation:
        "Profile the capture handler — a 15x latency jump usually means a downstream call (payment gateway, DB lock) regressed. Check gateway response times first.",
      ageMin: 52,
      explanation:
        "**Root cause: the consumer is alive but slow — a downstream regression.**\n\n`payments.capture` consumers are still acking, so this isn't a crash. But per-message ack time jumped from ~280ms to ~4.2s — a 15x regression. RabbitMQ is delivering fine; the time is being spent inside the handler.\n\nA jump this sharp and this uniform almost always traces to a single downstream dependency: a payment-gateway call that started timing out and retrying, a database row-lock under contention, or a connection pool exhausted by the slower calls backing up.\n\n**What to do:** correlate the latency step-change with downstream metrics. Start with the payment gateway's p95 — if it regressed at the same timestamp, that's your cause and RabbitMQ is just the messenger.",
    },
    {
      ruleId: "MEMORY_ALARM_ACTIVE",
      scope: "broker" as const,
      queueName: "",
      severity: AlertSeverity.HIGH,
      description:
        "Node rabbit@demo has tripped its memory high-watermark alarm (3.8 GB / 4 GB). Publishers are now flow-controlled cluster-wide.",
      recommendation:
        "Find what's resident in memory — usually a large unacked backlog or a queue without a length limit. Draining the biggest queue will clear the alarm.",
      ageMin: 7,
      explanation:
        "**Root cause: memory pressure is back-pressuring the whole broker.**\n\n`rabbit@demo` crossed its memory high-watermark (3.8 GB of a 4 GB limit), so RabbitMQ did exactly what it's designed to do: it blocked publishers across the node to protect itself from running out of memory entirely. Every connection that's publishing will see this as stalled `basic.publish` calls.\n\nThe memory is almost always held by message bodies — a large unacked backlog (messages delivered but not yet acked stay in RAM) or an unbounded queue that's grown huge. It's a symptom of one of the other findings, not an independent fault.\n\n**What to do:** identify the largest queue by memory and drain or cap it. Clearing the backlog drops resident memory below the watermark and lifts the publish block automatically — no node restart needed.",
    },
    {
      ruleId: "QUEUE_DRAIN_STALL",
      scope: "queue" as const,
      queueName: "analytics.events",
      severity: AlertSeverity.MEDIUM,
      description:
        "analytics.events stopped draining 11 minutes ago — depth flat at 6,204, consumers connected but ack rate is 0 msg/s.",
      recommendation:
        "Consumers are attached but idle — likely stuck on a blocking call or waiting on a lock. Restart the consumer group if no progress resumes.",
      ageMin: 11,
      explanation:
        "**Root cause: consumers are connected but wedged — not consuming.**\n\n`analytics.events` shows the tell-tale signature of a drain stall: depth is perfectly flat (6,204), consumers are still registered, but the ack rate is a hard zero. If consumers had crashed you'd see the count drop; if they were merely slow you'd see a trickle. Zero acks with live connections means the consumer threads are blocked.\n\nThe usual culprits are a synchronous call inside the handler that's hung (a downstream service not responding and no timeout set), or a deadlock on a shared resource. The consumers will sit there indefinitely holding their prefetched messages.\n\n**What to do:** capture a thread dump from a consumer to see where it's parked. If you need to restore flow immediately, restart the consumer group — but the stall will recur until the blocking call gets a timeout.",
    },
    {
      ruleId: "NO_CONSUMER_PERSISTENT_QUEUE",
      scope: "queue" as const,
      queueName: "audit.log",
      severity: AlertSeverity.LOW,
      description:
        "audit.log is durable and accumulating (842 messages) but has had 0 consumers for over 6 hours. Persistent messages with no consumer grow unbounded.",
      recommendation:
        "Confirm a consumer is supposed to be running. If audit events are no longer consumed, add a TTL or length limit so the queue can't grow without bound.",
      ageMin: 372,
      explanation:
        "**Root cause: an orphaned durable queue — a slow leak, not an incident.**\n\n`audit.log` is declared durable and has been collecting persistent messages for 6+ hours with no consumer ever attached. Nothing is acutely broken, which is exactly why this is easy to miss: there's no alarm, just steady, unbounded growth backed to disk.\n\nThis pattern means one of two things — a consumer that was supposed to be deployed never was (or was decommissioned without removing the queue), or the queue is genuinely write-only and simply lacks a retention policy.\n\n**What to do:** decide if anything is meant to read `audit.log`. If yes, the consumer is missing — deploy it. If the queue is intentionally unconsumed, give it a `x-message-ttl` or `x-max-length` so it self-trims instead of eventually pressuring node memory or disk.",
    },
  ];

  for (const f of findings) {
    const seenAt = minutesAgo(f.ageMin);
    // Broker-scoped findings carry empty queueName/vhost on the wire; the
    // fingerprint must hash the same values that are persisted.
    const effectiveVhost = f.scope === "broker" ? "" : vhost;
    const record = await prisma.incidentDiagnosisRecord.create({
      data: {
        serverId,
        workspaceId,
        fingerprint: demoFingerprint(
          f.ruleId,
          f.scope,
          f.queueName,
          effectiveVhost
        ),
        scope: f.scope,
        ruleId: f.ruleId,
        queueName: f.queueName,
        vhost: effectiveVhost,
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
