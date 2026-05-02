import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { refreshServerCapabilities } from "@/services/feature-gate/capability-refresh";

import { isDemoMode } from "@/config/deployment";

/**
 * Server Capabilities Cron Service
 *
 * Refreshes the persisted `CapabilitySnapshot` (see
 * `services/feature-gate/capability-snapshot.ts`) for every active
 * server once per day. The detector itself is read-only against the
 * broker; the cost is one Management API hit per server per cycle.
 *
 * **Deterministic jitter**: each server's refresh runs at
 * `cycleStart + (hash(serverId) % cycleWindow)`, so 5 000 workspaces do
 * not all hit the broker at the same UTC minute. The hash is
 * server-stable, so a flapping server doesn't reschedule every cycle.
 *
 * **Single-replica required** — concurrent runs would both pass the
 * compare-and-swap CAS in `persistServerCapabilities` only one at a time
 * (the loser silently no-ops), so correctness is preserved, but running
 * the cron on multiple replicas wastes broker probes. Run on the same
 * host as `queue-metrics` (the metrics-monitor worker is single-replica
 * by deployment contract).
 *
 * **Demo mode**: skipped entirely. Demo servers point at fictional
 * brokers; refresh would log a failed cycle every 24 h with no value.
 */
class ServerCapabilitiesCronService {
  /** One full cycle = 24 h. */
  private readonly cycleMs = 24 * 60 * 60 * 1000;
  /**
   * Window over which jittered refreshes are spread. 30 min is enough to
   * smooth burst load while keeping each refresh "today".
   */
  private readonly jitterWindowMs = 30 * 60 * 1000;

  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentController: AbortController | null = null;
  /**
   * Promise of the currently-running cycle (when one is active). `await`d
   * by `stopAndWait` so graceful shutdown actually waits for the cycle
   * to drain before returning.
   */
  private currentCyclePromise: Promise<void> | null = null;

  start(): void {
    if (this.isRunning) {
      logger.info("Server capabilities cron service already running");
      return;
    }
    if (isDemoMode()) {
      logger.info("Server capabilities cron skipped (demo mode)");
      return;
    }
    this.isRunning = true;
    logger.info(
      { cycleMs: this.cycleMs, jitterWindowMs: this.jitterWindowMs },
      "Starting server capabilities cron service"
    );

    // Eager backfill: refresh every row whose snapshot has never been
    // persisted (`capabilitiesAt IS NULL`) immediately, ahead of the
    // jittered cycle. This closes the window where a freshly-deployed
    // build sees `caps === null` for every existing server until the
    // first cycle's jitter delays expire.
    void this.runBackfillThenStartCycle();
  }

  async stopAndWait(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentController?.abort();
    if (this.currentCyclePromise) {
      // Wait for the in-flight cycle to drain so SIGTERM doesn't yank
      // Prisma out from under an active refresh.
      try {
        await this.currentCyclePromise;
      } catch (err) {
        logger.warn(
          { err },
          "capability cron: cycle promise rejected during shutdown"
        );
      }
    }
    logger.info("Server capabilities cron service stopped");
  }

  /**
   * Fire-and-forget eager backfill, then start the recurring cycle.
   * Splitting them lets a fresh deploy populate snapshots within the
   * order of seconds-to-minutes (linear in `null`-snapshot row count)
   * instead of waiting up to `jitterWindowMs`.
   */
  private async runBackfillThenStartCycle(): Promise<void> {
    try {
      await this.runBackfill();
    } catch (err) {
      logger.warn({ err }, "capability cron: eager backfill failed");
    }
    if (!this.isRunning) return;

    // Run a full cycle immediately after backfill so servers with
    // existing snapshots get a fresh post-deploy check instead of
    // waiting up to `cycleMs` (24h) — frequent worker restarts would
    // otherwise postpone the first refresh indefinitely.
    void this.runCycle();

    // Schedule the recurring cycle after the eager pass completes.
    this.intervalId = setInterval(() => {
      void this.runCycle();
    }, this.cycleMs);
  }

  private async runBackfill(): Promise<void> {
    const servers = await prisma.rabbitMQServer.findMany({
      select: { id: true },
      where: {
        workspaceId: { not: null },
        capabilitiesAt: null,
      },
    });
    if (servers.length === 0) return;

    logger.info(
      { count: servers.length },
      "capability cron: backfilling null-snapshot rows"
    );

    // No jitter for backfill — there are usually few null rows on deploy
    // and we want them populated ASAP. Sequential to bound concurrent
    // outbound HTTP load.
    for (const server of servers) {
      if (!this.isRunning) break;
      try {
        await refreshServerCapabilities(server.id);
      } catch (err) {
        logger.warn(
          { err, serverId: server.id },
          "capability cron: backfill failed for server"
        );
      }
    }
  }

  private async runCycle(): Promise<void> {
    if (this.currentCyclePromise) {
      logger.warn(
        "capability cron: previous cycle still running — skipping this tick"
      );
      return;
    }
    const controller = new AbortController();
    this.currentController = controller;
    const cyclePromise = this.runCycleInner(controller.signal);
    this.currentCyclePromise = cyclePromise;
    try {
      await cyclePromise;
    } finally {
      this.currentController = null;
      this.currentCyclePromise = null;
    }
  }

  private async runCycleInner(signal: AbortSignal): Promise<void> {
    const cycleStart = Date.now();
    let processed = 0;
    let changed = 0;
    let failed = 0;

    try {
      const servers = await prisma.rabbitMQServer.findMany({
        select: { id: true },
        // Orphaned rows (no workspace) have no consumer for the snapshot.
        where: { workspaceId: { not: null } },
      });

      logger.info({ count: servers.length }, "capability cron: starting cycle");

      // Compute each server's absolute target time once per cycle so
      // jitter is RELATIVE to cycleStart instead of accumulating
      // sequentially. With sequential per-server sleeps a 30-min
      // jitter window with N servers degrades to N×jitter total,
      // which can run past the next cycle tick. Sorting by delay also
      // means we process the earliest-scheduled brokers first.
      const scheduled = servers
        .map((server) => ({
          id: server.id,
          delayMs: jitterDelay(server.id, this.jitterWindowMs),
        }))
        .sort((a, b) => a.delayMs - b.delayMs);

      for (const server of scheduled) {
        if (signal.aborted) break;

        const remaining = Math.max(0, cycleStart + server.delayMs - Date.now());
        await sleep(remaining, signal);
        if (signal.aborted) break;

        try {
          const result = await refreshServerCapabilities(server.id);
          processed += 1;
          if (result.changed) changed += 1;
        } catch (error) {
          failed += 1;
          logger.warn(
            { error, serverId: server.id },
            "capability cron: refresh failed for server"
          );
        }
      }

      logger.info(
        {
          processed,
          changed,
          failed,
          durationMs: Date.now() - cycleStart,
        },
        "capability cron: cycle complete"
      );
    } catch (error) {
      logger.error({ error }, "capability cron: cycle aborted");
    }
  }
}

/**
 * Per-server deterministic jitter delay (ms within the window).
 *
 * Hash distribution: a simple FNV-1a 32-bit hash gives good spread for
 * UUID-like inputs without needing crypto. Stability is the only
 * requirement — `hash(serverId)` produces the same bucket every cycle so
 * the same broker is hit at the same offset relative to cycle start.
 */
function jitterDelay(serverId: string, windowMs: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < serverId.length; i++) {
    h ^= serverId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % windowMs;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };
    // Both paths (timeout fired, abort received) explicitly remove
    // the abort listener — without the timeout-side cleanup, a long-
    // running cycle accumulates a listener per `sleep()` call against
    // the same AbortSignal, leaking until shutdown.
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export const serverCapabilitiesCronService =
  new ServerCapabilitiesCronService();

// Test-only export for jitter determinism.
export const __test__ = { jitterDelay };
