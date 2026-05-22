/**
 * Notification Outbox Drain Cron
 *
 * Runs on the license-monitor worker (which holds the license advisory
 * lock so this drain is process-singleton across replicas) and pulls
 * pending outbox rows every 30s — fanned out by channel for fairness.
 */

import { logger } from "@/core/logger";

import { drainNotificationOutbox } from "@/services/notification/notification-outbox.service";

// 30s cadence is a safety net only: the LISTEN/NOTIFY wake-up triggers a
// cycle in <100ms after each enqueue, so polling exists to (a) catch
// rows whose nextAttemptAt becomes due (no NOTIFY fires on retry) and
// (b) cover dropped-LISTEN-connection windows.
const DRAIN_INTERVAL_MS = 30_000;
const DRAIN_BATCH_LIMIT = 50;

class NotificationOutboxCronService {
  private isRunning = false;
  private isDraining = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentCyclePromise: Promise<void> | null = null;

  start(): void {
    if (this.isRunning) {
      logger.info("Notification outbox drain already running");
      return;
    }
    this.isRunning = true;
    logger.info(
      { intervalMs: DRAIN_INTERVAL_MS, batchLimit: DRAIN_BATCH_LIMIT },
      "Starting notification outbox drain cron"
    );

    // Skip re-assigning when a drain cycle is still running — otherwise
    // the isDraining-skipped callback would clobber the real promise and
    // stopAndWait would no-op.
    this.currentCyclePromise = this.runCycle();
    this.intervalId = setInterval(() => {
      if (this.isDraining) return;
      this.currentCyclePromise = this.runCycle();
    }, DRAIN_INTERVAL_MS);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info("Notification outbox drain cron stopped");
  }

  async stopAndWait(): Promise<void> {
    this.stop();
    if (this.currentCyclePromise) {
      try {
        await this.currentCyclePromise;
      } catch (error) {
        logger.error(
          { error },
          "Notification outbox drain in-flight cycle errored during shutdown"
        );
      }
      this.currentCyclePromise = null;
    }
  }

  /**
   * Trigger an immediate drain cycle. Called by the worker's LISTEN handler
   * so a freshly-enqueued row is processed in <100ms instead of waiting for
   * the next polling tick.
   *
   * Skip the assignment when a cycle is already running — otherwise the
   * isDraining-skipped runCycle returns the immediately-resolved no-op
   * promise and clobbers the real in-flight cycle. stopAndWait would
   * then return early while the actual drain is still using Prisma.
   */
  triggerCycleNow(): void {
    if (!this.isRunning) return;
    if (this.isDraining) return;
    this.currentCyclePromise = this.runCycle();
  }

  private async runCycle(): Promise<void> {
    if (this.isDraining) {
      logger.debug(
        "Notification outbox drain skipping — previous cycle still in progress"
      );
      return;
    }
    this.isDraining = true;
    try {
      const stats = await drainNotificationOutbox(DRAIN_BATCH_LIMIT);
      if (stats.sent > 0 || stats.failed > 0 || stats.retrying > 0) {
        logger.info({ ...stats }, "Notification outbox drain cycle complete");
      }
    } catch (error) {
      logger.error({ error }, "Notification outbox drain cycle errored");
    } finally {
      this.isDraining = false;
    }
  }
}

export const notificationOutboxCronService =
  new NotificationOutboxCronService();
