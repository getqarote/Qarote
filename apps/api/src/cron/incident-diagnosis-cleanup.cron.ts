import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { isDemoMode } from "@/config/deployment";

/**
 * Incident Diagnosis Cleanup Cron Service
 *
 * Hard-deletes resolved `IncidentDiagnosisRecord` rows older than
 * `RETENTION_MS`. Diagnosis findings are deduplicated by
 * `(serverId, fingerprint)` and marked `resolvedAt = now()` once the
 * underlying condition clears past the dedup TTL — so the table grows
 * by one row per *distinct* fingerprint a workspace has ever observed.
 * On a busy broker with auto-named queues the long tail of resolved
 * rows is unbounded; this cron caps it.
 *
 * **Soft-resolved is enough for forensics within the retention
 * window.** "Open since X" displays read `firstSeenAt` only when
 * `resolvedAt IS NULL`, so resolved rows are pure history. Anything
 * older than 90 days is disk waste — the operator already has audit
 * logs and PostHog `diagnosis_feedback` events for long-term signal.
 *
 * **Daily cadence.** Runs once at startup then every 24 h from
 * process start. The sweep is off busy-hour hot paths because it
 * targets resolved rows only (cold path). We don't bother with a
 * fixed wall-clock offset because the cleanup is idempotent and a
 * single bulk DELETE, not a per-server fan-out.
 *
 * **Single-replica safe.** `DELETE WHERE resolvedAt < cutoff` is
 * idempotent under concurrent execution — the loser deletes zero
 * rows. We still co-locate it on the metrics-monitor worker (the
 * single-replica contract) because that's where the related
 * `IncidentDiagnosisRecord` writes already happen via `dedup.ts`.
 *
 * **Demo mode**: skipped — demo deployments don't need historical
 * diagnoses purged.
 */
class IncidentDiagnosisCleanupCronService {
  /** One full cycle = 24 h. */
  private readonly cycleMs = 24 * 60 * 60 * 1000;
  /**
   * Records resolved more than 90 days ago are deleted. Window is
   * generous on purpose — operators sometimes investigate
   * post-mortems on multi-week-old incidents and want the dedup
   * record's `firstSeenAt` / `lastSeenAt` to still be there.
   */
  private readonly retentionMs = 90 * 24 * 60 * 60 * 1000;

  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentCyclePromise: Promise<void> | null = null;

  start(): void {
    if (this.isRunning) {
      logger.info("Incident diagnosis cleanup cron already running");
      return;
    }
    if (isDemoMode()) {
      logger.info("Incident diagnosis cleanup cron skipped (demo mode)");
      return;
    }
    this.isRunning = true;
    logger.info(
      { cycleMs: this.cycleMs, retentionMs: this.retentionMs },
      "Starting incident diagnosis cleanup cron"
    );

    // Run once on startup so a long-stopped worker doesn't accumulate
    // a full cycle's worth of stale rows before its first sweep.
    void this.runCycle();

    this.intervalId = setInterval(() => {
      void this.runCycle();
    }, this.cycleMs);
  }

  async stopAndWait(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.currentCyclePromise) {
      // Drain the in-flight DELETE before SIGTERM so we don't leave
      // Prisma mid-statement.
      try {
        await this.currentCyclePromise;
      } catch (err) {
        logger.warn(
          { err },
          "diagnosis cleanup cron: cycle promise rejected during shutdown"
        );
      }
    }
    logger.info("Incident diagnosis cleanup cron stopped");
  }

  private async runCycle(): Promise<void> {
    if (this.currentCyclePromise) {
      logger.warn(
        "diagnosis cleanup cron: previous cycle still running — skipping this tick"
      );
      return;
    }
    this.currentCyclePromise = this.runCycleInner();
    try {
      await this.currentCyclePromise;
    } finally {
      this.currentCyclePromise = null;
    }
  }

  private async runCycleInner(): Promise<void> {
    const cutoff = new Date(Date.now() - this.retentionMs);
    const start = Date.now();
    try {
      const { count } = await prisma.incidentDiagnosisRecord.deleteMany({
        where: {
          resolvedAt: { not: null, lt: cutoff },
        },
      });
      logger.info(
        { deleted: count, cutoff, durationMs: Date.now() - start },
        "diagnosis cleanup cron: cycle complete"
      );
    } catch (error) {
      logger.error({ error, cutoff }, "diagnosis cleanup cron: cycle failed");
    }
  }
}

export const incidentDiagnosisCleanupCronService =
  new IncidentDiagnosisCleanupCronService();
