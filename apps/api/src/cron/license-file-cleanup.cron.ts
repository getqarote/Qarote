import { logger } from "@/core/logger";

import { licenseService } from "@/services/license/license.service";

/**
 * License File Version Cleanup Cron Service
 * Deletes expired license file versions based on deletesAt timestamp
 * Runs daily to clean up old license files while maintaining grace period
 */
class LicenseFileCleanupCronService {
  private isRunning = false;
  private isCleaning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentCyclePromise: Promise<void> | null = null;
  private readonly checkInterval: number;

  constructor() {
    // Run once per day (24 hours interval)
    this.checkInterval = 24 * 60 * 60 * 1000;
  }

  /**
   * Start the license file cleanup service
   */
  start(): void {
    if (this.isRunning) {
      logger.info("License file cleanup service is already running");
      return;
    }

    this.isRunning = true;
    logger.info(
      {
        checkInterval: this.checkInterval,
      },
      "Starting license file cleanup service..."
    );

    // Run immediately, then at intervals. Skip re-assigning when a cycle
    // is still running — otherwise the immediately-resolved skip would
    // clobber the real in-flight promise and stopAndWait would no-op.
    this.currentCyclePromise = this.cleanup();
    this.intervalId = setInterval(() => {
      if (this.isCleaning) return;
      this.currentCyclePromise = this.cleanup();
    }, this.checkInterval);
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info("License file cleanup service is not running");
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info("License file cleanup service stopped");
  }

  /**
   * Stop and wait for the in-flight cycle to drain.
   */
  async stopAndWait(): Promise<void> {
    this.stop();
    if (this.currentCyclePromise) {
      try {
        await this.currentCyclePromise;
      } catch (error) {
        logger.error(
          { error },
          "License file cleanup in-flight cycle errored during shutdown"
        );
      }
      this.currentCyclePromise = null;
    }
  }

  /**
   * Clean up expired license file versions
   */
  private async cleanup(): Promise<void> {
    // Prevent overlapping cycles
    if (this.isCleaning) {
      logger.debug("Skipping cleanup cycle - previous cycle still in progress");
      return;
    }

    this.isCleaning = true;
    const startTime = Date.now();

    try {
      logger.info("Starting license file version cleanup cycle");

      // Call the license service cleanup method
      await licenseService.cleanupExpiredLicenseVersions();

      const duration = Date.now() - startTime;
      logger.info(
        {
          duration,
        },
        `Completed license file version cleanup cycle in ${duration}ms`
      );
    } catch (error) {
      logger.error({ error }, "Error in license file cleanup cycle");
    } finally {
      this.isCleaning = false;
    }
  }
}

// Export a singleton instance
export const licenseFileCleanupCronService =
  new LicenseFileCleanupCronService();
