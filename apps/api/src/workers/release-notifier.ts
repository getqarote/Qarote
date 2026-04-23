import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { isCloudMode } from "@/config/deployment";

import { releaseNotifierCronService } from "@/cron/release-notifier.cron";

/**
 * Release Notifier Worker Process
 * Dedicated process for checking available Qarote releases and notifying license holders
 *
 * Only runs in cloud mode — self-hosted users don't need this.
 */
async function startWorker() {
  if (!isCloudMode()) {
    logger.info("Release Notifier worker skipped — only runs in cloud mode");
    return;
  }

  try {
    logger.info("Starting Release Notifier worker process...");

    // Connect to database
    await prisma.$connect();
    logger.info("Connected to database");

    // Start the release notifier cron service
    releaseNotifierCronService.start();
    logger.info("Release notifier cron service started");

    logger.info("Release Notifier worker process is running");
  } catch (error) {
    logger.error({ error }, "Failed to start Release Notifier worker");
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
async function shutdown() {
  logger.info("Shutting down Release Notifier worker...");
  try {
    releaseNotifierCronService.stop();
    await prisma.$disconnect();
    logger.info("Release Notifier worker stopped gracefully");
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
  logger.error({ error }, "Uncaught exception in Release Notifier worker");
  await shutdown();
});

process.on("unhandledRejection", async (reason, promise) => {
  logger.error(
    { reason, promise },
    "Unhandled rejection in Release Notifier worker"
  );
  await shutdown();
});

// Start the worker
startWorker();
