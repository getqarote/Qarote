import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

// 180-day rolling hard delete. GDPR Art. 5(1)(e) storage limitation.
const RETENTION_DAYS = 180;
// Trace-linked explanations are capped to the trace hypertable's 7-day
// retention. MessageTraceEvent rows are removed by TimescaleDB chunk-drop, which
// fires no app-level cascade, so a trace explanation can briefly outlive its
// event as a dangling soft-reference (the ref is a filter column only — no join,
// so this is a hygiene concern, not a crash). The cap is by `created_at`: since
// an event is always explained AFTER it occurred (event.timestamp <= created_at),
// the event's chunk drops at event.timestamp + 7d <= created_at + 7d, so deleting
// the explanation at created_at + 7d guarantees the event is already gone. With
// the DAILY cron below, the residual dangling window is bounded to <= 7 days and
// self-heals. See docs/plans/timescaledb-migration.md.
const TRACE_RETENTION_DAYS = 7;
// Daily — must be <= the trace chunk-drop granularity (1 day) for the 7-day cap
// above to actually bound the orphan window. A monthly cycle would let trace
// explanations linger up to ~30 days past their event.
const CYCLE_MS = 24 * 60 * 60 * 1000;

class LlmExplanationRetentionCronService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentCyclePromise: Promise<void> | null = null;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(
      {
        retentionDays: RETENTION_DAYS,
        traceRetentionDays: TRACE_RETENTION_DAYS,
      },
      "llm.explanation.retention.start"
    );
    void this.runCycle();
    this.intervalId = setInterval(() => void this.runCycle(), CYCLE_MS);
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
        logger.warn({ err }, "llm.explanation.retention.shutdown.error");
      }
    }
  }

  private async runCycle(): Promise<void> {
    if (this.currentCyclePromise) {
      logger.warn(
        "llm.explanation.retention: previous cycle still running — skipping"
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
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const traceCutoff = new Date(
      Date.now() - TRACE_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    const start = Date.now();
    try {
      // Tighter 7-day cap for trace-linked explanations (matches the trace
      // hypertable retention), then the global 180-day sweep for the rest.
      const traceDeleted = await prisma.$executeRaw`
        DELETE FROM llm_explanations
        WHERE trace_event_id IS NOT NULL AND created_at < ${traceCutoff}
      `;
      const deleted = await prisma.$executeRaw`
        DELETE FROM llm_explanations WHERE created_at < ${cutoff}
      `;
      logger.info(
        {
          deleted,
          traceDeleted,
          cutoff,
          traceCutoff,
          durationMs: Date.now() - start,
        },
        "llm.explanation.retention.complete"
      );
    } catch (err) {
      logger.error(
        { err, cutoff, traceCutoff },
        "llm.explanation.retention.failed"
      );
    }
  }
}

export const llmExplanationRetentionCronService =
  new LlmExplanationRetentionCronService();
