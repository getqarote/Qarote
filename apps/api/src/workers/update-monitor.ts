import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { initSentry } from "@/services/sentry";

import { sentryConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

import { updateCheckerCronService } from "@/cron/update-checker.cron";

// Initialize Sentry only if enabled
if (isCloudMode() || sentryConfig.enabled) {
  initSentry();
}

/**
 * Update Monitor Worker Process
 * Dedicated process for checking available Qarote updates and notifying admins
 *
 * Only runs in cloud mode — self-hosted users don't need this.
 */
async function startWorker() {
  if (!isCloudMode()) {
    logger.info("Update Monitor worker skipped — only runs in cloud mode");
    return;
  }

  try {
    logger.info("Starting Update Monitor worker process...");

    // Connect to database
    await prisma.$connect();
    logger.info("Connected to database");

    // Start the update checker cron service
    updateCheckerCronService.start();
    logger.info("Update checker cron service started");

    logger.info("Update Monitor worker process is running");
  } catch (error) {
    logger.error({ error }, "Failed to start Update Monitor worker");
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
async function shutdown() {
  logger.info("Shutting down Update Monitor worker...");
  try {
    updateCheckerCronService.stop();
    await prisma.$disconnect();
    logger.info("Update Monitor worker stopped gracefully");
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
  logger.error({ error }, "Uncaught exception in Update Monitor worker");
  await shutdown();
});

process.on("unhandledRejection", async (reason, promise) => {
  logger.error(
    { reason, promise },
    "Unhandled rejection in Update Monitor worker"
  );
  await shutdown();
});

// Start the worker
startWorker();
