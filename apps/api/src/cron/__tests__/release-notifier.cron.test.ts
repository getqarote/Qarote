/**
 * Tests for the release notifier create-first idempotency.
 *
 * Before this change a mid-loop crash (or rolling-deploy overlap) could
 * re-send the "new release available" email to recipients who had
 * already received it: a single SystemState row was the gate, and it
 * was only updated AFTER the loop. Per-recipient dedup via
 * ReleaseNotificationSent + create-before-send closes that hazard, and
 * the SystemState gate is gone — every cycle now queries and dedups
 * via P2002 so newly-licensed customers also get the email.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const createMock = vi.fn();
const sendUpdateMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    license: { findMany: (...args: unknown[]) => findManyMock(...args) },
    releaseNotificationSent: {
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

vi.mock("@/services/email/email.service", () => ({
  EmailService: {
    sendUpdateAvailableEmail: (...args: unknown[]) => sendUpdateMock(...args),
  },
}));

vi.mock("@/config", () => ({
  emailConfig: { enabled: true },
}));

// Stub the version helpers so we drive the cron's branching from the test.
vi.mock("node:fs", () => ({
  default: {
    readFileSync: vi.fn(() => "1.0.0"),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => [{ name: "v2.0.0" }],
  } as unknown as Response);
  sendUpdateMock.mockResolvedValue({ success: true });
});

import { releaseNotifierCronService } from "@/cron/release-notifier.cron";

function makeP2002() {
  const err = new Error("Unique constraint failed") as Error & {
    code?: string;
  };
  err.code = "P2002";
  return err;
}

describe("releaseNotifierCronService — create-first idempotency", () => {
  afterEach(async () => {
    await releaseNotifierCronService.stopAndWait();
  });

  it("sends the email when the slot create succeeds", async () => {
    findManyMock.mockResolvedValue([{ customerEmail: "alice@example.com" }]);
    createMock.mockResolvedValue({});

    releaseNotifierCronService.start();
    await releaseNotifierCronService.stopAndWait();

    expect(createMock).toHaveBeenCalledWith({
      data: {
        releaseVersion: "2.0.0",
        recipient: "alice@example.com",
      },
    });
    expect(sendUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("skips the email when create fails with P2002 (already notified)", async () => {
    findManyMock.mockResolvedValue([{ customerEmail: "alice@example.com" }]);
    createMock.mockRejectedValue(makeP2002());

    releaseNotifierCronService.start();
    await releaseNotifierCronService.stopAndWait();

    expect(sendUpdateMock).not.toHaveBeenCalled();
  });

  it("skips email when create fails with a non-P2002 error", async () => {
    findManyMock.mockResolvedValue([{ customerEmail: "alice@example.com" }]);
    createMock.mockRejectedValue(new Error("connection lost"));

    releaseNotifierCronService.start();
    await releaseNotifierCronService.stopAndWait();

    expect(sendUpdateMock).not.toHaveBeenCalled();
  });

  it("does NOT roll back the slot when the email send subsequently fails", async () => {
    findManyMock.mockResolvedValue([{ customerEmail: "alice@example.com" }]);
    createMock.mockResolvedValue({});
    sendUpdateMock.mockResolvedValue({ success: false, error: "smtp down" });

    releaseNotifierCronService.start();
    await releaseNotifierCronService.stopAndWait();

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(sendUpdateMock).toHaveBeenCalledTimes(1);
    // No delete — slot stays claimed (best-effort delivery for release notice).
  });

  it("mixed batch: 1 new send + 1 already-sent recipient sends only once", async () => {
    findManyMock.mockResolvedValue([
      { customerEmail: "alice@example.com" },
      { customerEmail: "bob@example.com" },
    ]);
    createMock.mockResolvedValueOnce({}).mockRejectedValueOnce(makeP2002());

    releaseNotifierCronService.start();
    await releaseNotifierCronService.stopAndWait();

    expect(sendUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("a newly-licensed recipient on the next cycle is not locked out", async () => {
    // Cycle 1: Alice exists, gets the email.
    findManyMock.mockResolvedValueOnce([
      { customerEmail: "alice@example.com" },
    ]);
    createMock.mockResolvedValueOnce({});
    releaseNotifierCronService.start();
    await releaseNotifierCronService.stopAndWait();
    expect(sendUpdateMock).toHaveBeenCalledTimes(1);

    // Cycle 2: Bob has just acquired a license. Alice's create() now
    // raises P2002 (already notified) but Bob's create() succeeds and
    // his email goes out — the regression the SystemState gate caused.
    findManyMock.mockResolvedValueOnce([
      { customerEmail: "alice@example.com" },
      { customerEmail: "bob@example.com" },
    ]);
    createMock.mockRejectedValueOnce(makeP2002()).mockResolvedValueOnce({});
    releaseNotifierCronService.start();
    await releaseNotifierCronService.stopAndWait();

    expect(sendUpdateMock).toHaveBeenCalledTimes(2);
    expect(sendUpdateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: "bob@example.com" })
    );
  });
});

describe("releaseNotifierCronService — lifecycle", () => {
  afterEach(async () => {
    await releaseNotifierCronService.stopAndWait();
  });

  it("start() is idempotent", () => {
    findManyMock.mockResolvedValue([]);
    releaseNotifierCronService.start();
    expect(() => releaseNotifierCronService.start()).not.toThrow();
  });

  it("stopAndWait() is safe when not running", async () => {
    await expect(
      releaseNotifierCronService.stopAndWait()
    ).resolves.toBeUndefined();
  });
});
