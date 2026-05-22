import { Client } from "pg";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { posthog } from "@/services/posthog";

import { config } from "@/config";
import { isCloudMode } from "@/config/deployment";

import { ghcrPatExpiryCronService } from "@/cron/ghcr-pat-expiry.cron";
import { licenseExpirationRemindersCronService } from "@/cron/license-expiration-reminders.cron";
import { licenseFileCleanupCronService } from "@/cron/license-file-cleanup.cron";
import { licenseTierSyncCronService } from "@/cron/license-tier-sync.cron";
import { ADVISORY_LOCK_KEYS } from "@/workers/advisory-lock-keys";

/**
 * License Monitor Worker Process
 * Dedicated process for:
 * - Monitoring license expirations and sending renewal reminders
 * - Cleaning up expired license file versions
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
 * The DB-level unique constraint on LicenseRenewalEmail
 * (licenseId, reminderType) is the second line of defense for the
 * rolling-deploy overlap window.
 */

let lockClient: Client | null = null;

async function startWorker() {
  if (!isCloudMode()) {
    logger.info("License Monitor worker skipped — only runs in cloud mode");
    return;
  }

  try {
    logger.info("Starting License Monitor worker process...");

    await prisma.$connect();
    logger.info("Connected to database");

    lockClient = new Client({ connectionString: config.DATABASE_URL });
    await lockClient.connect();

    const result = await lockClient.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock($1::bigint) AS acquired",
      [ADVISORY_LOCK_KEYS.license]
    );
    if (!result.rows[0].acquired) {
      logger.warn(
        { lockKey: ADVISORY_LOCK_KEYS.license },
        "license-monitor: advisory lock already held — another instance is running. Exiting."
      );
      await lockClient.end();
      await prisma.$disconnect();
      process.exit(0);
    }
    logger.info("license-monitor: advisory lock acquired");

    lockClient.on("error", async (err) => {
      logger.error(
        { error: err },
        "license-monitor: lock client error — exiting"
      );
      await shutdown(1);
    });

    lockClient.on("end", async () => {
      if (shuttingDown) return;
      logger.error(
        { event: "license-monitor.lock-client-ended" },
        "license-monitor: lock client ended unexpectedly — exiting"
      );
      await shutdown(1);
    });

    licenseExpirationRemindersCronService.start();
    logger.info("License expiration reminders cron service started");

    licenseFileCleanupCronService.start();
    logger.info("License file cleanup cron service started");

    // RBAC Phase 3 — sync the denormalized Workspace.licenseTier
    // column from the canonical Subscription.plan source. Per-
    // mutation hooks in PR-2 will keep individual workspaces fresh;
    // this cron is the daily correctness floor.
    licenseTierSyncCronService.start();
    logger.info("License tier sync cron service started");

    ghcrPatExpiryCronService.start();
    logger.info("GHCR PAT expiry check cron service started");

    logger.info("License Monitor worker process is running");
  } catch (error) {
    logger.error({ error }, "Failed to start License Monitor worker");
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
  logger.info("Shutting down License Monitor worker...");
  try {
    const stopResults = await Promise.allSettled([
      licenseExpirationRemindersCronService.stopAndWait(),
      licenseFileCleanupCronService.stopAndWait(),
      // Drain any in-flight tier sync before disconnecting Prisma — a
      // running sweep mid-shutdown would otherwise see EPIPE / closed
      // pool errors and emit confusing audit log failures.
      licenseTierSyncCronService.stopAndWait(),
      ghcrPatExpiryCronService.stopAndWait(),
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
        "One or more license-monitor services failed to stop cleanly"
      );
      exitCode = 1;
    } else {
      logger.info("License Monitor worker stopped gracefully");
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
  logger.error({ error }, "Uncaught exception in License Monitor worker");
  await shutdown(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  logger.error(
    { reason, promise },
    "Unhandled rejection in License Monitor worker"
  );
  await shutdown(1);
});

startWorker();
