/**
 * Notification retention cron.
 *
 * Sweeps two notification-related tables on the same daily cycle:
 *
 *  - NotificationOutbox: deletes SENT rows older than 30 days. FAILED
 *    rows are kept indefinitely — they're the audit trail for "we never
 *    reached this customer", and ops triage them manually before any
 *    cleanup. PENDING rows are obviously never deleted.
 *
 *  - DigestLog: deletes "sent" and "failed" rows older than 30 days.
 *    "queued" rows are kept indefinitely — orphaned queued rows signal
 *    a delivery breakdown that never resolved (drain crashed, retention
 *    can't tell), and ops should triage before cleanup.
 *
 * Runs once per day, on the same notification-worker that drains the
 * outbox (singleton via pg advisory lock).
 */

import { subDays } from "date-fns";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

const RETENTION_DAYS = 30;
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1_000;

class NotificationRetentionCronService {
  private isRunning = false;
  private isCleaning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentCyclePromise: Promise<void> | null = null;

  start(): void {
    if (this.isRunning) {
      logger.info("Notification retention cron already running");
      return;
    }
    this.isRunning = true;
    logger.info(
      { retentionDays: RETENTION_DAYS },
      "Starting notification retention cron"
    );

    this.currentCyclePromise = this.runCycle();
    this.intervalId = setInterval(() => {
      if (this.isCleaning) return;
      this.currentCyclePromise = this.runCycle();
    }, RUN_INTERVAL_MS);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info("Notification retention cron stopped");
  }

  async stopAndWait(): Promise<void> {
    this.stop();
    if (this.currentCyclePromise) {
      try {
        await this.currentCyclePromise;
      } catch (error) {
        logger.error(
          { error },
          "Notification retention in-flight cycle errored during shutdown"
        );
      }
      this.currentCyclePromise = null;
    }
  }

  private async runCycle(): Promise<void> {
    if (this.isCleaning) return;
    this.isCleaning = true;
    try {
      const cutoff = subDays(new Date(), RETENTION_DAYS);

      const outboxResult = await prisma.notificationOutbox.deleteMany({
        where: { status: "SENT", sentAt: { lt: cutoff } },
      });

      // DigestLog has no nullable column for terminal status, so we filter
      // by the explicit list to avoid sweeping "queued" rows. The drain
      // transitions queued → sent | failed; orphaned "queued" rows past
      // retention indicate something the operator should look at.
      const digestLogResult = await prisma.digestLog.deleteMany({
        where: {
          status: { in: ["sent", "failed"] },
          sentAt: { lt: cutoff },
        },
      });

      if (outboxResult.count > 0 || digestLogResult.count > 0) {
        logger.info(
          {
            notificationOutboxDeleted: outboxResult.count,
            digestLogDeleted: digestLogResult.count,
            retentionDays: RETENTION_DAYS,
          },
          "Notification retention cycle complete"
        );
      }
    } catch (error) {
      logger.error({ error }, "Notification retention cycle errored");
    } finally {
      this.isCleaning = false;
    }
  }
}

export const notificationRetentionCronService =
  new NotificationRetentionCronService();
