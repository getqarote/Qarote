import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { initSentry } from "@/services/sentry";

import { isCloudMode } from "@/config/deployment";

import { rabbitMQAlertsCronService } from "@/cron/rabbitmq-alerts.cron";

// Initialize Sentry only if enabled
if (isCloudMode() || process.env.ENABLE_SENTRY === "true") {
  initSentry();
}

/**
 * Alert Monitor Worker Process
 * Dedicated process for continuously monitoring RabbitMQ servers for health alerts
 */
async function startWorker() {
  try {
    logger.info("Starting RabbitMQ Alert Monitor worker process...");

    // Connect to database
    await prisma.$connect();
    logger.info("Connected to database");

    // Start the RabbitMQ alerts cron service
    rabbitMQAlertsCronService.start();
    logger.info("RabbitMQ alerts cron service started");

    logger.info("Alert Monitor worker process is running");
  } catch (error) {
    logger.error({ error }, "Failed to start Alert Monitor worker");
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
async function shutdown() {
  logger.info("Shutting down Alert Monitor worker...");
  try {
    rabbitMQAlertsCronService.stop();
    await prisma.$disconnect();
    logger.info("Alert Monitor worker stopped gracefully");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await shutdown();
});
process.on("SIGTERM", async () => {
  await shutdown();
});

// Handle uncaught errors
process.on("uncaughtException", async (error) => {
  logger.error({ error }, "Uncaught exception in Alert Monitor worker");
  await shutdown();
});

process.on("unhandledRejection", async (reason, promise) => {
  logger.error(
    { reason, promise },
    "Unhandled rejection in Alert Monitor worker"
  );
  await shutdown();
});

// Start the worker
startWorker();
