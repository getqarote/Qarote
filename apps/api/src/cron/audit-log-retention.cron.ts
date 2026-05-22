import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { isDemoMode } from "@/config/deployment";

const DEFAULT_RETENTION_DAYS = 400;
const MIN_RETENTION_DAYS = 30;
const MAX_RETENTION_DAYS = 3650;

function resolveRetentionMs(): number {
  const raw = process.env.AUDIT_LOG_RETENTION_DAYS;
  let days = DEFAULT_RETENTION_DAYS;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (
      Number.isFinite(parsed) &&
      parsed >= MIN_RETENTION_DAYS &&
      parsed <= MAX_RETENTION_DAYS
    ) {
      days = parsed;
    } else {
      logger.warn(
        { raw, min: MIN_RETENTION_DAYS, max: MAX_RETENTION_DAYS },
        `AUDIT_LOG_RETENTION_DAYS=${raw} out of range — falling back to ${DEFAULT_RETENTION_DAYS}`
      );
    }
  }
  return days * 24 * 60 * 60 * 1000;
}

/**
 * AuditLog Retention Cron Service
 *
 * Hard-deletes rows older than the configured retention window. The
 * audit table has a BEFORE UPDATE/DELETE trigger blocking ad-hoc
 * mutations (`audit_log_immutable`); the retention cron bypasses it
 * by setting the custom GUC `app.audit_retention_active = 'on'`
 * *inside the same transaction*. The trigger checks that GUC and
 * permits DELETE only when it's `on`. The setting is transaction-
 * scoped (`set_config(..., true)`) so a crash mid-cycle reverts on
 * the next session — no risk of leaving the trigger bypassed.
 *
 * Custom GUCs in the `app.*` namespace work on every Postgres
 * (vanilla, RDS, Supabase, Neon, Heroku) — unlike
 * `session_replication_role = 'replica'` which requires SUPERUSER.
 *
 * **Retention window.** Default 400 days (covers a 12-month SOC 2 Type
 * II audit + 30-day onboarding buffer). Configurable via
 * `AUDIT_LOG_RETENTION_DAYS` env var; minimum 30, maximum 3650 (10y).
 *
 * **Daily cadence.** Runs once at startup then every 24 h. Cleanup is
 * idempotent and bulk; no per-tenant fan-out needed.
 *
 * **Demo mode**: skipped — demo deployments are short-lived.
 */
class AuditLogRetentionCronService {
  /** One full cycle = 24 h. */
  private readonly cycleMs = 24 * 60 * 60 * 1000;
  /** Configurable via `AUDIT_LOG_RETENTION_DAYS`. Default 400 days. */
  private readonly retentionMs = resolveRetentionMs();

  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentCyclePromise: Promise<void> | null = null;

  start(): void {
    if (this.isRunning) {
      logger.info("Audit log retention cron already running");
      return;
    }
    if (isDemoMode()) {
      logger.info("Audit log retention cron skipped (demo mode)");
      return;
    }
    this.isRunning = true;
    logger.info(
      { cycleMs: this.cycleMs, retentionMs: this.retentionMs },
      "Starting audit log retention cron"
    );

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
          "audit log retention cron: cycle promise rejected during shutdown"
        );
      }
    }
    logger.info("Audit log retention cron stopped");
  }

  private async runCycle(): Promise<void> {
    if (this.currentCyclePromise) {
      logger.warn(
        "audit log retention cron: previous cycle still running — skipping this tick"
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
      // Trigger bypass: set_config(..., is_local=true) is scoped to
      // the transaction. The trigger checks `app.audit_retention_active`
      // and permits DELETE only when it's 'on'. Works on every managed
      // Postgres (no SUPERUSER required, unlike session_replication_role).
      const deleted: number = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.audit_retention_active', 'on', true)`;
        const result = await tx.$executeRaw`
          DELETE FROM "audit_logs"
          WHERE "timestamp" < ${cutoff}
        `;
        return result;
      });
      logger.info(
        { deleted, cutoff, durationMs: Date.now() - start },
        "audit log retention cron: cycle complete"
      );
    } catch (error) {
      logger.error({ error, cutoff }, "audit log retention cron: cycle failed");
    }
  }
}

export const auditLogRetentionCronService = new AuditLogRetentionCronService();
