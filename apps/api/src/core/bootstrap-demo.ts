import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { isDemoMode } from "@/config/deployment";

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

  const host = process.env.DEMO_RABBITMQ_HOST;
  const port = process.env.DEMO_RABBITMQ_PORT;
  const amqpPort = process.env.DEMO_RABBITMQ_AMQP_PORT;
  const username = process.env.DEMO_RABBITMQ_USER;
  const password = process.env.DEMO_RABBITMQ_PASS;
  const vhost = process.env.DEMO_RABBITMQ_VHOST;

  if (!host || !username || !password) {
    logger.warn(
      "DEMO_MODE is true but DEMO_RABBITMQ_* env vars are missing — skipping demo seed"
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
    // Server exists — still check if alerts need seeding
    const alertCount = await prisma.alert.count({
      where: { workspaceId: workspace.id },
    });
    if (alertCount === 0) {
      await seedDemoAlerts(workspace.id, existing.id);
    }
    return;
  }

  const server = await prisma.rabbitMQServer.create({
    data: {
      name: "Demo RabbitMQ",
      host,
      port: parseInt(port || "15672", 10),
      amqpPort: parseInt(amqpPort || "5672", 10),
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
  await seedDemoAlerts(workspace.id, server.id);
}

async function seedDemoAlerts(
  workspaceId: string,
  serverId: string
): Promise<void> {
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  // Fingerprint format must match alert.fingerprint.ts:
  //   queue alerts: {serverId}-{category}-queue-{vhost}-{sourceName}
  //   node alerts:  {serverId}-{category}-node-{sourceName}
  const vhost = process.env.DEMO_RABBITMQ_VHOST || "demo";
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
      sourceType: "exchange",
      sourceName: "analytics.direct",
      serverName: "Demo RabbitMQ",
      threshold: 1000,
      value: 1523,
      firstSeenAt: minutesAgo(120),
      lastSeenAt: minutesAgo(15),
      acknowledgedAt: minutesAgo(90),
      fingerprint: fp("message_rate", "exchange", "analytics.direct"),
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
