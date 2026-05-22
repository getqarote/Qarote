/**
 * GHCR Robot PAT Expiry Check Cron — CLOUD-ONLY
 *
 * Watches `GHCR_PAT_EXPIRY_DATE` (operator-provided ISO date) and logs an
 * escalating warning as the shared `qarote-pull-bot` PAT approaches expiry.
 * The PAT is the credential EE self-hosters use to `docker pull` the licensed
 * image; if it lapses unnoticed, every customer's next deploy breaks silently.
 *
 * Why cloud-only:
 *   The GHCR robot account belongs to Qarote (the SaaS operator), not to
 *   self-hosters. Self-hosters merely consume the credential delivered in
 *   their license email — they cannot rotate it. Three layers enforce that
 *   this cron never runs on a customer's box:
 *
 *   1. `GHCR_*` env vars are declared only in `cloudSchema` — they are not
 *      part of the selfhosted config surface (`schemas/selfhosted.ts`).
 *   2. This cron is wired into the `license-monitor` worker, which exits
 *      early when `isCloudMode() === false` (see workers/license-monitor.ts).
 *   3. Defense in depth: `ghcrConfig.patExpiryDate` resolves to `undefined`
 *      whenever the field is absent from `config`, and the `check()` method
 *      no-ops on `undefined` — so even an accidental wiring into a
 *      selfhosted worker would be a silent no-op rather than a failure.
 *
 * Thresholds: warn at ≤30 days, error at ≤7 days, error once expired.
 * The cron drops a `logger.error` so Sentry picks it up via standard log
 * shipping — no separate alerting hook is wired.
 */

import { logger } from "@/core/logger";

import { ghcrConfig } from "@/config";

const WARN_DAYS = 30;
const CRITICAL_DAYS = 7;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

class GhcrPatExpiryCronService {
  private isRunning = false;
  private isChecking = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentCyclePromise: Promise<void> | null = null;

  start(): void {
    if (this.isRunning) {
      logger.info("GHCR PAT expiry check service is already running");
      return;
    }
    this.isRunning = true;
    logger.info("Starting GHCR PAT expiry check cron service...");
    this.currentCyclePromise = this.check();
    this.intervalId = setInterval(() => {
      if (this.isChecking) return;
      this.currentCyclePromise = this.check();
    }, CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info("GHCR PAT expiry check service stopped");
  }

  async stopAndWait(): Promise<void> {
    this.stop();
    if (this.currentCyclePromise) {
      try {
        await this.currentCyclePromise;
      } catch (error) {
        logger.error(
          { error },
          "GHCR PAT expiry check errored during shutdown"
        );
      }
      this.currentCyclePromise = null;
    }
  }

  private async check(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;
    try {
      const { patExpiryDate } = ghcrConfig;
      if (!patExpiryDate) return;

      // Interpret the YYYY-MM-DD env value as end-of-day UTC so a PAT
      // configured to expire on 2026-06-20 is still considered "valid today"
      // throughout that day regardless of worker timezone. Past that instant
      // daysUntilExpiry goes negative and the "has expired" branch fires.
      const msPerDay = 1000 * 60 * 60 * 24;
      const expiryEndOfDayUtc = new Date(
        `${patExpiryDate}T23:59:59Z`
      ).getTime();
      const daysUntilExpiry = Math.floor(
        (expiryEndOfDayUtc - Date.now()) / msPerDay
      );

      if (daysUntilExpiry < 0) {
        logger.error(
          { patExpiryDate, daysUntilExpiry },
          "GHCR robot PAT has expired — EE self-hosters cannot pull images. Rotate GHCR_ROBOT_TOKEN immediately."
        );
      } else if (daysUntilExpiry <= CRITICAL_DAYS) {
        logger.error(
          { patExpiryDate, daysUntilExpiry },
          `GHCR robot PAT expires in ${daysUntilExpiry} day(s) — rotate GHCR_ROBOT_TOKEN immediately.`
        );
      } else if (daysUntilExpiry <= WARN_DAYS) {
        logger.warn(
          { patExpiryDate, daysUntilExpiry },
          `GHCR robot PAT expires in ${daysUntilExpiry} day(s) — schedule GHCR_ROBOT_TOKEN rotation.`
        );
      }
    } finally {
      this.isChecking = false;
    }
  }
}

export const ghcrPatExpiryCronService = new GhcrPatExpiryCronService();
