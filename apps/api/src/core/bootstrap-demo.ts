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
    logger.debug("Demo RabbitMQ server already seeded");
    return;
  }

  await prisma.rabbitMQServer.create({
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
}
