import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

// 180-day rolling hard delete. GDPR Art. 5(1)(e) storage limitation.
const RETENTION_DAYS = 180;
const CYCLE_MS = 30 * 24 * 60 * 60 * 1000; // monthly

class LlmExplanationRetentionCronService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentCyclePromise: Promise<void> | null = null;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(
      { retentionDays: RETENTION_DAYS },
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
    const start = Date.now();
    try {
      const deleted = await prisma.$executeRaw`
        DELETE FROM llm_explanations WHERE created_at < ${cutoff}
      `;
      logger.info(
        { deleted, cutoff, durationMs: Date.now() - start },
        "llm.explanation.retention.complete"
      );
    } catch (err) {
      logger.error({ err, cutoff }, "llm.explanation.retention.failed");
    }
  }
}

export const llmExplanationRetentionCronService =
  new LlmExplanationRetentionCronService();
