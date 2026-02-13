import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { initSentry } from "@/services/sentry";

import { sentryConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

import { licenseExpirationRemindersCronService } from "@/cron/license-expiration-reminders.cron";
import { licenseFileCleanupCronService } from "@/cron/license-file-cleanup.cron";

// Initialize Sentry only if enabled
if (isCloudMode() || sentryConfig.enabled) {
  initSentry();
}

/**
 * License Monitor Worker Process
 * Dedicated process for:
 * - Monitoring license expirations and sending renewal reminders
 * - Cleaning up expired license file versions
 *
 * Only runs in cloud mode — self-hosted users don't need this.
 */
async function startWorker() {
  if (!isCloudMode()) {
    logger.info("License Monitor worker skipped — only runs in cloud mode");
    return;
  }

  try {
    logger.info("Starting License Monitor worker process...");

    // Connect to database
    await prisma.$connect();
    logger.info("Connected to database");

    // Start the license expiration reminders cron service
    licenseExpirationRemindersCronService.start();
    logger.info("License expiration reminders cron service started");

    // Start the license file cleanup cron service
    licenseFileCleanupCronService.start();
    logger.info("License file cleanup cron service started");

    logger.info("License Monitor worker process is running");
  } catch (error) {
    logger.error({ error }, "Failed to start License Monitor worker");
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
async function shutdown() {
  logger.info("Shutting down License Monitor worker...");
  try {
    licenseExpirationRemindersCronService.stop();
    licenseFileCleanupCronService.stop();
    await prisma.$disconnect();
    logger.info("License Monitor worker stopped gracefully");
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
  logger.error({ error }, "Uncaught exception in License Monitor worker");
  await shutdown();
});

process.on("unhandledRejection", async (reason, promise) => {
  logger.error(
    { reason, promise },
    "Unhandled rejection in License Monitor worker"
  );
  await shutdown();
});

// Start the worker
startWorker();
