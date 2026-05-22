/**
 * License-tier sync cron service (RBAC Phase 3 PR-1).
 *
 * Runs once at startup then every 24 h. Resyncs every workspace's
 * denormalized `licenseTier` from the canonical
 * `Subscription.plan` source. Cheap (one UPDATE per workspace iff
 * the tier actually changed; one no-op SELECT otherwise) and
 * idempotent — safe to re-run.
 *
 * Per-mutation hooks in PR-2 (license activation, subscription
 * upserts) call `syncWorkspaceLicenseTier(workspaceId)` directly for
 * fast convergence; this cron is the correctness floor.
 *
 * **Demo mode**: skipped — demo deployments are short-lived and
 * the snapshot data already pins Enterprise tier.
 */

import { logger } from "@/core/logger";

import { syncAllWorkspaceLicenseTiers } from "@/services/license/license-tier-sync.service";

import { isDemoMode } from "@/config/deployment";

class LicenseTierSyncCronService {
  private readonly cycleMs = 24 * 60 * 60 * 1000;

  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentCyclePromise: Promise<void> | null = null;

  start(): void {
    if (this.isRunning) {
      logger.info("License tier sync cron already running");
      return;
    }
    if (isDemoMode()) {
      logger.info("License tier sync cron skipped (demo mode)");
      return;
    }
    this.isRunning = true;
    logger.info({ cycleMs: this.cycleMs }, "Starting license tier sync cron");

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
      try {
        await this.currentCyclePromise;
      } catch (err) {
        logger.warn(
          { err },
          "license tier sync cron: cycle promise rejected during shutdown"
        );
      }
    }
    logger.info("License tier sync cron stopped");
  }

  /** Backward-compat alias for the older cron stop() pattern. */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runCycle(): Promise<void> {
    if (this.currentCyclePromise) {
      logger.warn(
        "license tier sync cron: previous cycle still running — skipping this tick"
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
    const start = Date.now();
    try {
      const { total, changed } = await syncAllWorkspaceLicenseTiers();
      logger.info(
        { total, changed, durationMs: Date.now() - start },
        "license tier sync cron: cycle complete"
      );
    } catch (error) {
      logger.error({ error }, "license tier sync cron: cycle failed");
    }
  }
}

export const licenseTierSyncCronService = new LicenseTierSyncCronService();
