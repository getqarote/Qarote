/**
 * Unit tests for GHCR PAT expiry check logic.
 *
 * Truth-table: expired / critical (≤7d) / warn (≤30d) / healthy / no expiry set.
 * Lifecycle: idempotent start, safe stop-when-not-running.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/config", () => ({
  ghcrConfig: { patExpiryDate: undefined as string | undefined },
}));

import { logger } from "@/core/logger";

import { ghcrConfig } from "@/config";

import { ghcrPatExpiryCronService } from "@/cron/ghcr-pat-expiry.cron";

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("ghcrPatExpiryCronService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ghcrConfig as { patExpiryDate: string | undefined }).patExpiryDate =
      undefined;
  });

  afterEach(async () => {
    await ghcrPatExpiryCronService.stopAndWait();
  });

  it("start() is idempotent — second call is a no-op", () => {
    ghcrPatExpiryCronService.start();
    expect(() => ghcrPatExpiryCronService.start()).not.toThrow();
  });

  it("stopAndWait() is safe when not running", async () => {
    await expect(
      ghcrPatExpiryCronService.stopAndWait()
    ).resolves.toBeUndefined();
  });

  it("no-op when patExpiryDate is not set", async () => {
    (ghcrConfig as { patExpiryDate: string | undefined }).patExpiryDate =
      undefined;
    ghcrPatExpiryCronService.start();
    await ghcrPatExpiryCronService.stopAndWait();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("logs error when PAT has expired", async () => {
    (ghcrConfig as { patExpiryDate: string | undefined }).patExpiryDate =
      daysFromNow(-1);
    ghcrPatExpiryCronService.start();
    await ghcrPatExpiryCronService.stopAndWait();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ daysUntilExpiry: expect.any(Number) }),
      expect.stringContaining("has expired")
    );
  });

  it("logs critical (not expired) on expiry day itself", async () => {
    // Boundary: the PAT is still valid through end-of-day UTC, so the cron
    // should warn "rotate immediately" — not "has expired" — until the day passes.
    (ghcrConfig as { patExpiryDate: string | undefined }).patExpiryDate =
      daysFromNow(0);
    ghcrPatExpiryCronService.start();
    await ghcrPatExpiryCronService.stopAndWait();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ daysUntilExpiry: 0 }),
      expect.stringContaining("immediately")
    );
    expect(logger.error).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining("has expired")
    );
  });

  it("logs error when PAT expires within 7 days", async () => {
    (ghcrConfig as { patExpiryDate: string | undefined }).patExpiryDate =
      daysFromNow(5);
    ghcrPatExpiryCronService.start();
    await ghcrPatExpiryCronService.stopAndWait();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ daysUntilExpiry: 5 }),
      expect.stringContaining("immediately")
    );
  });

  it("logs warn when PAT expires within 30 days", async () => {
    (ghcrConfig as { patExpiryDate: string | undefined }).patExpiryDate =
      daysFromNow(20);
    ghcrPatExpiryCronService.start();
    await ghcrPatExpiryCronService.stopAndWait();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ daysUntilExpiry: 20 }),
      expect.stringContaining("schedule")
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs nothing when PAT expiry is healthy (>30 days)", async () => {
    (ghcrConfig as { patExpiryDate: string | undefined }).patExpiryDate =
      daysFromNow(60);
    ghcrPatExpiryCronService.start();
    await ghcrPatExpiryCronService.stopAndWait();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
