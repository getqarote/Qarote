import { Client } from "pg";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { posthog } from "@/services/posthog";

import { config } from "@/config";
import { isCloudMode } from "@/config/deployment";

import { releaseNotifierCronService } from "@/cron/release-notifier.cron";
import { ADVISORY_LOCK_KEYS } from "@/workers/advisory-lock-keys";

/**
 * Release Notifier Worker Process
 * Dedicated process for checking available Qarote releases and notifying
 * license holders.
 *
 * Only runs in cloud mode — self-hosted users don't need this.
 *
 * Singleton enforcement: acquires a PostgreSQL session-level advisory lock at
 * startup via a dedicated pg.Client (not the Prisma pool) so the lock is tied
 * to a connection that stays open for the full process lifetime. If the lock
 * cannot be obtained, another instance is already running and this process
 * exits 0 (intentional yield — not a crash, so the supervisor does not restart
 * it). If the lock client disconnects unexpectedly the process exits 1 so the
 * supervisor can restart a fresh singleton.
 *
 * The DB-level unique constraint on ReleaseNotificationSent
 * (releaseVersion, recipient) is the second line of defense for the
 * rolling-deploy overlap window.
 */

let lockClient: Client | null = null;

async function startWorker() {
  if (!isCloudMode()) {
    logger.info("Release Notifier worker skipped — only runs in cloud mode");
    return;
  }

  try {
    logger.info("Starting Release Notifier worker process...");

    await prisma.$connect();
    logger.info("Connected to database");

    lockClient = new Client({ connectionString: config.DATABASE_URL });
    await lockClient.connect();

    const result = await lockClient.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock($1::bigint) AS acquired",
      [ADVISORY_LOCK_KEYS.release]
    );
    if (!result.rows[0].acquired) {
      logger.warn(
        { lockKey: ADVISORY_LOCK_KEYS.release },
        "release-notifier: advisory lock already held — another instance is running. Exiting."
      );
      await lockClient.end();
      await prisma.$disconnect();
      process.exit(0);
    }
    logger.info("release-notifier: advisory lock acquired");

    lockClient.on("error", async (err) => {
      logger.error(
        { error: err },
        "release-notifier: lock client error — exiting"
      );
      await shutdown(1);
    });

    lockClient.on("end", async () => {
      if (shuttingDown) return;
      logger.error(
        { event: "release-notifier.lock-client-ended" },
        "release-notifier: lock client ended unexpectedly — exiting"
      );
      await shutdown(1);
    });

    releaseNotifierCronService.start();
    logger.info("Release notifier cron service started");

    logger.info("Release Notifier worker process is running");
  } catch (error) {
    logger.error({ error }, "Failed to start Release Notifier worker");
    if (lockClient) {
      await lockClient.end().catch(() => {});
      lockClient = null;
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

let shuttingDown = false;
async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutting down Release Notifier worker...");
  try {
    const stopResults = await Promise.allSettled([
      releaseNotifierCronService.stopAndWait(),
    ]);
    if (lockClient) {
      await lockClient.end().catch(() => {});
      lockClient = null;
    }
    await Promise.allSettled([prisma.$disconnect(), posthog?.shutdown()]);

    const stopFailures = stopResults.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    if (stopFailures.length > 0) {
      logger.error(
        { errors: stopFailures.map((f) => f.reason) },
        "Release notifier failed to stop cleanly"
      );
      exitCode = 1;
    } else {
      logger.info("Release Notifier worker stopped gracefully");
    }
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
    exitCode = 1;
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

process.on("uncaughtException", async (error) => {
  logger.error({ error }, "Uncaught exception in Release Notifier worker");
  await shutdown(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  logger.error(
    { reason, promise },
    "Unhandled rejection in Release Notifier worker"
  );
  await shutdown(1);
});

startWorker();
