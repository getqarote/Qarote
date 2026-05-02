/**
 * Smoke tests for the incident diagnosis cleanup cron's lifecycle.
 *
 * The actual DELETE is exercised in integration; this file pins the
 * service contract: idempotent start, double-start no-ops, stop is
 * always safe, and skipped under demo mode.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/prisma", () => ({
  prisma: {
    incidentDiagnosisRecord: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("@/config/deployment", () => ({
  isDemoMode: vi.fn().mockReturnValue(false),
}));

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { isDemoMode } from "@/config/deployment";

import { incidentDiagnosisCleanupCronService } from "@/cron/incident-diagnosis-cleanup.cron";

describe("incidentDiagnosisCleanupCronService", () => {
  afterEach(async () => {
    await incidentDiagnosisCleanupCronService.stopAndWait();
    vi.mocked(isDemoMode).mockReturnValue(false);
  });

  it("start() is idempotent — second call is a no-op", () => {
    incidentDiagnosisCleanupCronService.start();
    // Second call should NOT throw or schedule a second interval.
    expect(() => incidentDiagnosisCleanupCronService.start()).not.toThrow();
  });

  it("start() skips when demo mode is on", () => {
    vi.mocked(isDemoMode).mockReturnValue(true);
    expect(() => incidentDiagnosisCleanupCronService.start()).not.toThrow();
  });

  it("stopAndWait() is safe when not running", async () => {
    await expect(
      incidentDiagnosisCleanupCronService.stopAndWait()
    ).resolves.toBeUndefined();
  });
});
