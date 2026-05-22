/**
 * Tests for the create-first idempotency pattern on license expiration
 * reminders. The unique constraint on (licenseId, reminderType) plus the
 * create-before-send order is what prevents duplicate emails when two
 * cycles overlap (rolling deploy, restart, missed advisory lock).
 */

import { addDays } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const createMock = vi.fn();
const sendReminderMock = vi.fn();
const sendExpiredMock = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    license: { findMany: (...args: unknown[]) => findManyMock(...args) },
    licenseRenewalEmail: {
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/config", () => ({
  emailConfig: { portalFrontendUrl: "https://portal.example" },
}));

vi.mock("@/services/email/email.service", () => ({
  EmailService: {
    sendLicenseExpirationReminderEmail: (...args: unknown[]) =>
      sendReminderMock(...args),
    sendLicenseExpiredEmail: (...args: unknown[]) => sendExpiredMock(...args),
  },
}));

import { licenseExpirationRemindersCronService } from "@/cron/license-expiration-reminders.cron";

const license = {
  id: "lic_1",
  licenseKey: "KEY",
  tier: "DEVELOPER",
  customerEmail: "alice@example.com",
  expiresAt: addDays(new Date(), 30),
};

function makeP2002() {
  const err = new Error("Unique constraint failed") as Error & {
    code?: string;
  };
  err.code = "P2002";
  return err;
}

describe("licenseExpirationRemindersCronService — create-first idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockImplementation(({ where }: { where: unknown }) => {
      const w = where as { expiresAt?: { gte?: Date; lte?: Date; lt?: Date } };
      // Reminder loop targets future windows (30/15/7 days). The EXPIRED
      // loop targets `lt: now`. Distinguish by the absence of `lte`.
      if (w.expiresAt && "lte" in w.expiresAt) {
        return Promise.resolve([license]);
      }
      return Promise.resolve([]);
    });
    sendReminderMock.mockResolvedValue({ success: true });
    sendExpiredMock.mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    await licenseExpirationRemindersCronService.stopAndWait();
  });

  it("sends an email when the create succeeds (slot claimed)", async () => {
    createMock.mockResolvedValue({});
    licenseExpirationRemindersCronService.start();
    await licenseExpirationRemindersCronService.stopAndWait();
    // 3 reminder windows (30/15/7) all see the same single license.
    expect(createMock).toHaveBeenCalledTimes(3);
    expect(sendReminderMock).toHaveBeenCalledTimes(3);
  });

  it("skips the email when the create fails with P2002 (slot already claimed)", async () => {
    createMock.mockRejectedValue(makeP2002());
    licenseExpirationRemindersCronService.start();
    await licenseExpirationRemindersCronService.stopAndWait();
    expect(createMock).toHaveBeenCalledTimes(3);
    expect(sendReminderMock).not.toHaveBeenCalled();
  });

  it("skips the email and logs when the create fails with a non-P2002 error", async () => {
    createMock.mockRejectedValue(new Error("connection lost"));
    licenseExpirationRemindersCronService.start();
    await licenseExpirationRemindersCronService.stopAndWait();
    expect(sendReminderMock).not.toHaveBeenCalled();
  });

  it("does NOT roll back the slot when the email send subsequently fails", async () => {
    createMock.mockResolvedValue({});
    sendReminderMock.mockResolvedValue({ success: false, error: "smtp down" });
    licenseExpirationRemindersCronService.start();
    await licenseExpirationRemindersCronService.stopAndWait();
    expect(createMock).toHaveBeenCalledTimes(3);
    expect(sendReminderMock).toHaveBeenCalledTimes(3);
    // No delete call — the slot stays claimed (best-effort delivery).
  });

  it("EXPIRED branch is also create-first idempotent (P2002 skips send)", async () => {
    // Make findMany return our license for the EXPIRED window (lt: now)
    // and nothing for the reminder windows so we isolate the EXPIRED path.
    findManyMock.mockImplementation(({ where }: { where: unknown }) => {
      const w = where as { expiresAt?: { gte?: Date; lte?: Date; lt?: Date } };
      if (w.expiresAt && "lt" in w.expiresAt) {
        return Promise.resolve([
          { ...license, expiresAt: new Date(Date.now() - 60_000) },
        ]);
      }
      return Promise.resolve([]);
    });
    createMock.mockRejectedValue(makeP2002());
    licenseExpirationRemindersCronService.start();
    await licenseExpirationRemindersCronService.stopAndWait();
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(sendExpiredMock).not.toHaveBeenCalled();
  });
});

describe("licenseExpirationRemindersCronService — lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue([]);
  });

  afterEach(async () => {
    await licenseExpirationRemindersCronService.stopAndWait();
  });

  it("start() is idempotent", () => {
    licenseExpirationRemindersCronService.start();
    expect(() => licenseExpirationRemindersCronService.start()).not.toThrow();
  });

  it("stopAndWait() is safe when not running", async () => {
    await expect(
      licenseExpirationRemindersCronService.stopAndWait()
    ).resolves.toBeUndefined();
  });

  it("stopAndWait awaits the actively-running cycle even when an interval tick overlaps", async () => {
    // Regression: a setInterval tick firing while checkExpiringLicenses is
    // still in flight used to overwrite currentCyclePromise with the
    // immediately-resolved skip-promise (isChecking guard returns early).
    // stopAndWait would then await the no-op and return before the real
    // cycle finished. The fix gates the interval re-assignment behind
    // !isChecking; this test pins the behavior.
    let resolveFindMany!: (rows: unknown[]) => void;
    const findManyDeferred = new Promise<unknown[]>((resolve) => {
      resolveFindMany = resolve;
    });
    findManyMock.mockReturnValueOnce(findManyDeferred);

    vi.useFakeTimers();
    licenseExpirationRemindersCronService.start();

    // Let the immediate first cycle reach the awaited findMany.
    await Promise.resolve();
    expect(findManyMock).toHaveBeenCalledTimes(1);

    // Trigger an interval tick while the first cycle is still pending —
    // the bug would re-assign currentCyclePromise here.
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);
    expect(findManyMock).toHaveBeenCalledTimes(1); // skipped, not re-fired

    // Resolve the original cycle and ensure stopAndWait actually awaits it.
    resolveFindMany([]);
    vi.useRealTimers();
    await expect(
      licenseExpirationRemindersCronService.stopAndWait()
    ).resolves.toBeUndefined();
  });
});
