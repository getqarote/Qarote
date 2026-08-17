import { Client } from "pg";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { NOTIFICATION_OUTBOX_CHANNEL } from "@/services/notification/notification-outbox.service";

import { config } from "@/config";

import { notificationOutboxCronService } from "@/cron/notification-outbox.cron";
import { notificationRetentionCronService } from "@/cron/notification-retention.cron";
import { acquireSingletonLock } from "@/workers/advisory-lock";
import { ADVISORY_LOCK_KEYS } from "@/workers/advisory-lock-keys";

/**
 * Notification Worker Process
 * Drains NotificationOutbox: delivers transactional emails (Stripe-driven,
 * auth flows) and any future Slack/webhook fanout. Runs in both cloud and
 * self-hosted (auth emails are universal).
 *
 * Singleton enforcement: PostgreSQL session-level advisory lock acquired at
 * startup via a dedicated pg.Client whose lifetime matches the process. If
 * the lock is already held another instance is running and this process
 * exits 0 (intentional yield — supervisor will not restart). On unexpected
 * lock disconnect we exit 1 so the supervisor restarts a fresh singleton.
 *
 * The unique idempotencyKey on NotificationOutbox is the second line of
 * defense for the rolling-deploy overlap window.
 */

let lockClient: Client | null = null;
// Dedicated LISTEN connection. Kept separate from the lock client so a
// LISTEN reconnect doesn't risk releasing the singleton lock.
let listenClient: Client | null = null;

async function startWorker() {
  try {
    logger.info("Starting Notification worker process...");

    await prisma.$connect();
    logger.info("Connected to database");

    lockClient = new Client({ connectionString: config.DATABASE_URL });
    await lockClient.connect();

    const acquired = await acquireSingletonLock(
      lockClient,
      ADVISORY_LOCK_KEYS.notification,
      "notification-worker"
    );
    if (!acquired) {
      await lockClient.end();
      await prisma.$disconnect();
      process.exit(0);
    }
    logger.info("notification-worker: advisory lock acquired");

    lockClient.on("error", async (err) => {
      logger.error(
        { error: err },
        "notification-worker: lock client error — exiting"
      );
      await shutdown(1);
    });

    lockClient.on("end", async () => {
      if (shuttingDown) return;
      logger.error(
        { event: "notification-worker.lock-client-ended" },
        "notification-worker: lock client ended unexpectedly — exiting"
      );
      await shutdown(1);
    });

    notificationOutboxCronService.start();
    logger.info("Notification outbox drain cron service started");

    notificationRetentionCronService.start();
    logger.info("Notification retention cron service started");

    // LISTEN for new outbox rows. Postgres pushes a notification each time
    // an enqueue commits with NOTIFY, so the drain wakes in <100ms instead
    // of waiting for the polling tick. Polling stays as the safety net.
    listenClient = new Client({ connectionString: config.DATABASE_URL });
    await listenClient.connect();
    await listenClient.query(`LISTEN ${NOTIFICATION_OUTBOX_CHANNEL}`);
    listenClient.on("notification", (msg) => {
      if (msg.channel !== NOTIFICATION_OUTBOX_CHANNEL) return;
      notificationOutboxCronService.triggerCycleNow();
    });
    listenClient.on("error", (err) => {
      // Don't crash the worker — the polling fallback keeps the drain
      // working. Reconnecting LISTEN is left to the next process restart;
      // the connection error usually surfaces with the lock client too.
      logger.error(
        { error: err },
        "notification-worker: LISTEN client error — falling back to polling"
      );
    });
    logger.info(
      { channel: NOTIFICATION_OUTBOX_CHANNEL },
      "notification-worker: LISTEN active"
    );

    logger.info("Notification worker process is running");
  } catch (error) {
    logger.error({ error }, "Failed to start Notification worker");
    if (listenClient) {
      await listenClient.end().catch(() => {});
      listenClient = null;
    }
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
  logger.info("Shutting down Notification worker...");
  try {
    const stopResults = await Promise.allSettled([
      notificationOutboxCronService.stopAndWait(),
      notificationRetentionCronService.stopAndWait(),
    ]);
    if (listenClient) {
      await listenClient.end().catch(() => {});
      listenClient = null;
    }
    if (lockClient) {
      await lockClient.end().catch(() => {});
      lockClient = null;
    }
    await prisma.$disconnect();

    const stopFailures = stopResults.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    if (stopFailures.length > 0) {
      logger.error(
        { errors: stopFailures.map((f) => f.reason) },
        "Notification worker failed to stop cleanly"
      );
      exitCode = 1;
    } else {
      logger.info("Notification worker stopped gracefully");
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
  logger.error({ error }, "Uncaught exception in Notification worker");
  await shutdown(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  logger.error(
    { reason, promise },
    "Unhandled rejection in Notification worker"
  );
  await shutdown(1);
});

startWorker();
