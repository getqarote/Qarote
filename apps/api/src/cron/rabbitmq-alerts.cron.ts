import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { alertService } from "@/services/alerts/alert.service";

import { alertConfig } from "@/config";

/**
 * Process items with sliding window concurrency
 * Maintains constant concurrency - as soon as one task completes, the next starts
 * This maximizes throughput compared to sequential batches
 */
async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<void>,
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let index = 0;
  let completed = 0;
  const running: Promise<void>[] = [];

  // Promise that resolves when all items are processed
  let resolveAll: () => void;
  const allCompleted = new Promise<void>((resolve) => {
    resolveAll = resolve;
  });

  // Helper to start next task
  const startNext = () => {
    try {
      if (index >= items.length) return;

      const item = items[index++];
      const promise = processor(item)
        .catch(() => {
          // Errors are already logged in the processor
          // We just need to handle the promise rejection
        })
        .finally(() => {
          completed++;
          // Report progress (wrap in try-catch to prevent callback errors from breaking flow)
          try {
            if (onProgress) {
              onProgress(completed, items.length);
            }
          } catch (progressError) {
            // Log but don't break processing if progress callback fails
            logger.error(
              { error: progressError },
              "Error in progress callback"
            );
          }
          // Remove from running array when done
          const idx = running.indexOf(promise);
          if (idx > -1) {
            running.splice(idx, 1);
          }

          // Check if all items are completed
          if (completed === items.length) {
            resolveAll();
            return;
          }

          // Start next task immediately to maintain concurrency
          startNext();
        });

      running.push(promise);
    } catch (error) {
      // Handle synchronous errors in startNext (e.g., memory issues, null references)
      logger.error(
        { error, index, completed, runningCount: running.length },
        "Error in startNext() - attempting to continue"
      );
      // Try to continue if possible
      if (index < items.length) {
        // Attempt to start next task after a brief delay to avoid tight loop
        setTimeout(() => {
          try {
            startNext();
          } catch (retryError) {
            logger.error({ error: retryError }, "Failed to retry startNext()");
          }
        }, 100);
      }
    }
  };

  // Start initial batch up to concurrency limit
  while (running.length < concurrency && index < items.length) {
    startNext();
  }

  // Wait for all items to be processed
  // This waits until completed === items.length, ensuring all queued items are processed
  await allCompleted;

  // Wait for all running promises to settle (cleanup)
  await Promise.allSettled(running);
}

/**
 * RabbitMQ Alerts Cron Service
 * Continuously monitors all RabbitMQ servers for health alerts
 */
class RabbitMQAlertsCronService {
  private isRunning = false;
  private isChecking = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval: number;
  private readonly concurrency: number;

  constructor() {
    // Use config from centralized config module
    this.checkInterval = alertConfig.checkIntervalMs;
    this.concurrency = alertConfig.concurrency;
  }

  /**
   * Start the alert monitoring service
   */
  start(): void {
    if (this.isRunning) {
      logger.info("RabbitMQ alerts cron service is already running");
      return;
    }

    this.isRunning = true;
    logger.info(
      {
        checkInterval: this.checkInterval,
        concurrency: this.concurrency,
      },
      "Starting RabbitMQ alerts cron service..."
    );

    // Run immediately, then at intervals
    this.checkAllServers();
    this.intervalId = setInterval(() => {
      this.checkAllServers();
    }, this.checkInterval);
  }

  /**
   * Stop the alert monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info("RabbitMQ alerts cron service is not running");
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info("RabbitMQ alerts cron service stopped");
  }

  /**
   * Check all RabbitMQ servers for alerts
   */
  private async checkAllServers(): Promise<void> {
    // Prevent overlapping cycles
    if (this.isChecking) {
      logger.debug("Skipping check cycle - previous cycle still in progress");
      return;
    }

    this.isChecking = true;
    const startTime = Date.now();

    try {
      logger.info("Starting alert check cycle for all servers");

      // Fetch all RabbitMQ servers from database
      const servers = await prisma.rabbitMQServer.findMany({
        select: {
          id: true,
          name: true,
          workspaceId: true,
        },
      });

      logger.info(
        { serverCount: servers.length },
        `Found ${servers.length} servers to check`
      );

      if (servers.length === 0) {
        logger.debug("No servers found, skipping check cycle");
        return;
      }

      // Process servers with sliding window concurrency
      let successCount = 0;
      let errorCount = 0;
      let lastProgressLog = 0;
      const progressInterval = Math.max(1, Math.floor(servers.length / 10)); // Log every 10%

      await processWithConcurrency(
        servers,
        this.concurrency,
        async (server) => {
          try {
            // Add timeout protection (30 seconds) to prevent hanging on slow servers
            let timeoutId: NodeJS.Timeout | undefined = undefined;
            const timeoutPromise = new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                reject(
                  new Error(
                    `Server check timeout after 30 seconds for server ${server.name}`
                  )
                );
              }, 30000); // 30 seconds timeout
            });

            try {
              await Promise.race([
                alertService.getServerAlerts(
                  server.id,
                  server.name,
                  server.workspaceId || "",
                  undefined // Check all vhosts
                ),
                timeoutPromise,
              ]);
              // Clear timeout if server check completed successfully
              if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
              }
              successCount++;
            } catch (raceError) {
              // Clear timeout on error as well
              if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
              }
              throw raceError;
            }
          } catch (error) {
            errorCount++;
            const errorType =
              error instanceof Error && error.message.includes("timeout")
                ? "timeout"
                : "error";
            logger.error(
              {
                error,
                errorType,
                serverId: server.id,
                serverName: server.name,
                workspaceId: server.workspaceId,
              },
              `Failed to check alerts for server ${server.name}${errorType === "timeout" ? " (timeout)" : ""}`
            );
          }
        },
        (completed, total) => {
          // Log progress every 10% or every 100 servers (whichever is more frequent)
          const progressPercent = Math.floor((completed / total) * 100);
          const shouldLog =
            completed - lastProgressLog >= progressInterval ||
            progressPercent % 10 === 0;

          if (shouldLog && completed > lastProgressLog) {
            const elapsed = Date.now() - startTime;
            const rate = completed / (elapsed / 1000); // servers per second
            const remaining = total - completed;
            const estimatedTimeRemaining = remaining / rate; // seconds

            logger.info(
              {
                completed,
                total,
                progressPercent,
                successCount,
                errorCount,
                elapsed,
                rate: Math.round(rate * 10) / 10,
                estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
              },
              `Alert check progress: ${completed}/${total} (${progressPercent}%) - ${Math.round(rate * 10) / 10} servers/sec, ~${Math.round(estimatedTimeRemaining)}s remaining`
            );
            lastProgressLog = completed;
          }
        }
      );

      const duration = Date.now() - startTime;
      logger.info(
        {
          serverCount: servers.length,
          successCount,
          errorCount,
          duration,
        },
        `Completed alert check cycle: ${successCount} successful, ${errorCount} errors in ${duration}ms`
      );
    } catch (error) {
      logger.error({ error }, "Error in checkAllServers");
    } finally {
      this.isChecking = false;
    }
  }
}

// Export a singleton instance
export const rabbitMQAlertsCronService = new RabbitMQAlertsCronService();
