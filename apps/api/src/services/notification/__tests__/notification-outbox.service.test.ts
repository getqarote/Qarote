/**
 * Tests for the notification outbox service.
 *
 * The outbox is the trust boundary that turns webhook retries / cycle
 * restarts into no-ops and prevents the dual-write hazard. The unit tests
 * here pin:
 *  - enqueue rejects keys without the `<channel>:` prefix
 *  - enqueue P2002 returns false, never throws
 *  - drain marks SENT on success
 *  - drain bumps attempts + computes channel-aware backoff on failure
 *  - drain transitions to FAILED after MAX_ATTEMPTS
 *  - dispatcher rehydrates Date fields from ISO-string payloads
 *  - drain pulls rows fairly per channel (no head-of-line blocking)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findManyMock = vi.fn();
const updateMock = vi.fn();
const digestLogUpdateMock = vi.fn();

const executeRawMock = vi.fn().mockResolvedValue(0);

vi.mock("@/core/prisma", () => ({
  prisma: {
    notificationOutbox: {
      create: (...args: unknown[]) => createMock(...args),
      findMany: (...args: unknown[]) => findManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
    digestLog: {
      update: (...args: unknown[]) => digestLogUpdateMock(...args),
    },
    $executeRawUnsafe: (...args: unknown[]) => executeRawMock(...args),
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

const sendUpgrade = vi.fn();
const sendLicenseDelivery = vi.fn();
const sendLicenseRenewal = vi.fn();
const sendVerification = vi.fn();
const sendPasswordReset = vi.fn();

vi.mock("@/services/email/billing-email.service", () => ({
  BillingEmailService: {
    sendUpgradeConfirmationEmail: (...args: unknown[]) => sendUpgrade(...args),
  },
}));

vi.mock("@/services/email/license-email.service", () => ({
  LicenseEmailService: {
    sendLicenseDeliveryEmail: (...args: unknown[]) =>
      sendLicenseDelivery(...args),
    sendLicenseRenewalEmail: (...args: unknown[]) =>
      sendLicenseRenewal(...args),
    sendLicenseExpiredEmail: vi.fn(),
    sendLicensePaymentFailedEmail: vi.fn(),
    sendLicenseCancellationEmail: vi.fn(),
  },
}));

vi.mock("@/ee/services/email/notification-email.service", () => ({
  NotificationEmailService: {
    sendPaymentConfirmationEmail: vi.fn(),
    sendPaymentFailedEmail: vi.fn(),
    sendTrialEndingEmail: vi.fn(),
    sendPaymentActionRequiredEmail: vi.fn(),
  },
}));

vi.mock("@/services/email/auth-email.service", () => ({
  AuthEmailService: {
    sendVerificationEmail: (...args: unknown[]) => sendVerification(...args),
    sendInvitationEmail: vi.fn(),
    sendOrgInvitationEmail: vi.fn(),
    sendWelcomeEmail: vi.fn(),
  },
}));

vi.mock("@/services/email/password-reset-email.service", () => ({
  passwordResetEmailService: {
    sendPasswordResetEmail: (...args: unknown[]) => sendPasswordReset(...args),
  },
}));

const sendDigestEmail = vi.fn();
const sendDigestSlack = vi.fn();
vi.mock("@/ee/services/email/digest-email.service", () => ({
  DigestEmailService: {
    sendDigestEmail: (...args: unknown[]) => sendDigestEmail(...args),
  },
}));
vi.mock("@/ee/services/digest/digest-slack.service", () => ({
  DigestSlackService: {
    sendDigest: (...args: unknown[]) => sendDigestSlack(...args),
  },
}));

vi.mock("@/services/sentry", () => ({
  Sentry: {
    captureException: vi.fn(),
    withScope: vi.fn((cb: (s: unknown) => void) =>
      cb({
        setTag: vi.fn(),
        setLevel: vi.fn(),
        setContext: vi.fn(),
      })
    ),
  },
  trackMetricCount: vi.fn(),
}));

import {
  drainNotificationOutbox,
  enqueueNotification,
} from "@/services/notification/notification-outbox.service";

function makeP2002() {
  const err = new Error("Unique constraint failed") as Error & {
    code?: string;
  };
  err.code = "P2002";
  return err;
}

/**
 * The drain queries each channel independently. Mock findMany so it only
 * returns rows whose channel matches the query — otherwise the same row
 * would dispatch on every channel (3x sends).
 */
type OutboxRow = {
  id: string;
  channel: string;
  template: string;
  target: string;
  payload: unknown;
  attempts: number;
};
function rowsByChannel(rows: OutboxRow[]) {
  findManyMock.mockImplementation(({ where }: { where: { channel: string } }) =>
    Promise.resolve(rows.filter((r) => r.channel === where.channel))
  );
}

describe("enqueueNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on successful insert", async () => {
    createMock.mockResolvedValue({});
    const ok = await enqueueNotification({
      channel: "email",
      template: "upgrade_confirmation",
      target: "alice@example.com",
      idempotencyKey: "email:k1",
      payload: {
        userName: "Alice",
        workspaceName: "ws",
        plan: "DEVELOPER",
        billingInterval: "monthly",
      },
    });
    expect(ok).toBe(true);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("issues a NOTIFY on the outbox channel after a successful enqueue", async () => {
    createMock.mockResolvedValue({});
    await enqueueNotification({
      channel: "email",
      template: "upgrade_confirmation",
      target: "alice@example.com",
      idempotencyKey: "email:k-notify",
      payload: {
        userName: "Alice",
        workspaceName: "ws",
        plan: "DEVELOPER",
        billingInterval: "monthly",
      },
    });
    expect(executeRawMock).toHaveBeenCalledWith(
      expect.stringContaining("NOTIFY notification_outbox_new")
    );
  });

  it("does NOT issue a NOTIFY when enqueue collides on P2002", async () => {
    createMock.mockRejectedValue(makeP2002());
    await enqueueNotification({
      channel: "email",
      template: "upgrade_confirmation",
      target: "alice@example.com",
      idempotencyKey: "email:k-dup",
      payload: {
        userName: "Alice",
        workspaceName: "ws",
        plan: "DEVELOPER",
        billingInterval: "monthly",
      },
    });
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("returns false on P2002 (idempotent retry)", async () => {
    createMock.mockRejectedValue(makeP2002());
    const ok = await enqueueNotification({
      channel: "email",
      template: "upgrade_confirmation",
      target: "alice@example.com",
      idempotencyKey: "email:k1",
      payload: {
        userName: "Alice",
        workspaceName: "ws",
        plan: "DEVELOPER",
        billingInterval: "monthly",
      },
    });
    expect(ok).toBe(false);
  });

  it("rethrows non-P2002 errors", async () => {
    createMock.mockRejectedValue(new Error("connection lost"));
    await expect(
      enqueueNotification({
        channel: "email",
        template: "upgrade_confirmation",
        target: "alice@example.com",
        idempotencyKey: "email:k1",
        payload: {
          userName: "Alice",
          workspaceName: "ws",
          plan: "DEVELOPER",
          billingInterval: "monthly",
        },
      })
    ).rejects.toThrow("connection lost");
  });

  it("rejects keys missing the channel prefix", async () => {
    await expect(
      enqueueNotification({
        channel: "email",
        template: "upgrade_confirmation",
        target: "alice@example.com",
        idempotencyKey: "k1", // ← missing email: prefix
        payload: {
          userName: "Alice",
          workspaceName: "ws",
          plan: "DEVELOPER",
          billingInterval: "monthly",
        },
      })
    ).rejects.toThrow(/must be prefixed with channel/);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("drainNotificationOutbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks SENT on success", async () => {
    rowsByChannel([
      {
        id: "row1",
        channel: "email",
        template: "upgrade_confirmation",
        target: "alice@example.com",
        payload: {
          userName: "Alice",
          workspaceName: "ws",
          plan: "DEVELOPER",
          billingInterval: "monthly",
        },
        attempts: 0,
      },
    ]);
    sendUpgrade.mockResolvedValue({ success: true });
    updateMock.mockResolvedValue({});

    const stats = await drainNotificationOutbox();

    expect(stats).toEqual({ sent: 1, failed: 0, retrying: 0 });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "row1" },
        data: expect.objectContaining({ status: "SENT" }),
      })
    );
  });

  it("rehydrates Date fields when dispatching license_delivery", async () => {
    const expiresAt = new Date("2027-01-01T00:00:00.000Z");
    rowsByChannel([
      {
        id: "row2",
        channel: "email",
        template: "license_delivery",
        target: "alice@example.com",
        payload: {
          licenseKey: "KEY",
          tier: "DEVELOPER",
          expiresAt: expiresAt.toISOString(),
        },
        attempts: 0,
      },
    ]);
    sendLicenseDelivery.mockResolvedValue({ success: true });
    updateMock.mockResolvedValue({});

    await drainNotificationOutbox();

    expect(sendLicenseDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: expect.any(Date),
      })
    );
    const callArg = sendLicenseDelivery.mock.calls[0][0] as { expiresAt: Date };
    expect(callArg.expiresAt.toISOString()).toBe(expiresAt.toISOString());
  });

  it("retries with exponential backoff on transient failure", async () => {
    rowsByChannel([
      {
        id: "row3",
        channel: "email",
        template: "upgrade_confirmation",
        target: "alice@example.com",
        payload: {
          userName: "Alice",
          workspaceName: "ws",
          plan: "DEVELOPER",
          billingInterval: "monthly",
        },
        attempts: 2,
      },
    ]);
    sendUpgrade.mockResolvedValue({ success: false, error: "smtp 500" });
    updateMock.mockResolvedValue({});

    const stats = await drainNotificationOutbox();

    expect(stats).toEqual({ sent: 0, failed: 0, retrying: 1 });
    const updateArg = updateMock.mock.calls[0][0] as {
      data: { attempts: number; status: string; nextAttemptAt: Date };
    };
    expect(updateArg.data.attempts).toBe(3);
    expect(updateArg.data.status).toBe("PENDING");
    expect(updateArg.data.nextAttemptAt).toBeInstanceOf(Date);
  });

  it("transitions to FAILED after MAX_ATTEMPTS (10)", async () => {
    rowsByChannel([
      {
        id: "row4",
        channel: "email",
        template: "upgrade_confirmation",
        target: "alice@example.com",
        payload: {
          userName: "Alice",
          workspaceName: "ws",
          plan: "DEVELOPER",
          billingInterval: "monthly",
        },
        attempts: 9,
      },
    ]);
    sendUpgrade.mockResolvedValue({ success: false, error: "smtp 500" });
    updateMock.mockResolvedValue({});

    const stats = await drainNotificationOutbox();

    expect(stats).toEqual({ sent: 0, failed: 1, retrying: 0 });
    const updateArg = updateMock.mock.calls[0][0] as {
      data: { status: string };
    };
    expect(updateArg.data.status).toBe("FAILED");
  });

  it("queries each channel separately for fairness", async () => {
    rowsByChannel([]);
    await drainNotificationOutbox();
    // 3 channels = 3 findMany calls (one per channel)
    expect(findManyMock).toHaveBeenCalledTimes(3);
    const channelsQueried = findManyMock.mock.calls.map(
      (c) => (c[0] as { where: { channel: string } }).where.channel
    );
    expect(new Set(channelsQueried)).toEqual(
      new Set(["email", "slack", "webhook"])
    );
  });

  it("only fetches PENDING rows where nextAttemptAt is in the past", async () => {
    rowsByChannel([]);
    await drainNotificationOutbox();
    const where = (findManyMock.mock.calls[0][0] as { where: unknown }).where;
    expect(where).toEqual(
      expect.objectContaining({
        status: "PENDING",
        nextAttemptAt: expect.objectContaining({ lte: expect.any(Date) }),
      })
    );
  });

  it("dispatches verification template via AuthEmailService", async () => {
    rowsByChannel([
      {
        id: "verif-1",
        channel: "email",
        template: "verification",
        target: "alice@example.com",
        payload: {
          userName: "Alice",
          verificationToken: "tok_abc",
          type: "SIGNUP",
          sourceApp: "app",
          locale: "en",
        },
        attempts: 0,
      },
    ]);
    sendVerification.mockResolvedValue({ success: true });
    updateMock.mockResolvedValue({});

    await drainNotificationOutbox();

    expect(sendVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        verificationToken: "tok_abc",
        type: "SIGNUP",
      })
    );
  });

  it("password_reset wrapper turns void/throw into success/error result", async () => {
    rowsByChannel([
      {
        id: "pwd-1",
        channel: "email",
        template: "password_reset",
        target: "alice@example.com",
        payload: {
          userName: "Alice",
          resetToken: "tok_xyz",
          tokenExpiresAt: new Date("2026-12-31T00:00:00.000Z").toISOString(),
          locale: "en",
        },
        attempts: 0,
      },
    ]);
    sendPasswordReset.mockRejectedValueOnce(new Error("smtp blew up"));
    updateMock.mockResolvedValue({});

    const stats = await drainNotificationOutbox();
    expect(stats.retrying).toBe(1);
    const updateArg = updateMock.mock.calls[0][0] as {
      data: { lastError: string | null };
    };
    expect(updateArg.data.lastError).toContain("smtp blew up");
  });

  it("treats a thrown error from the email service as a retryable failure", async () => {
    rowsByChannel([
      {
        id: "row5",
        channel: "email",
        template: "upgrade_confirmation",
        target: "alice@example.com",
        payload: {
          userName: "Alice",
          workspaceName: "ws",
          plan: "DEVELOPER",
          billingInterval: "monthly",
        },
        attempts: 0,
      },
    ]);
    sendUpgrade.mockRejectedValue(new Error("smtp connect timeout"));
    updateMock.mockResolvedValue({});

    const stats = await drainNotificationOutbox();
    expect(stats.retrying).toBe(1);
    const updateArg = updateMock.mock.calls[0][0] as {
      data: { lastError: string | null };
    };
    expect(updateArg.data.lastError).toContain("smtp connect timeout");
  });

  it("stamps DigestLog as 'sent' after a successful digest delivery", async () => {
    rowsByChannel([
      {
        id: "digest-row-ok",
        channel: "email",
        template: "digest",
        target: "alice@example.com",
        payload: {
          digestLogId: "log-1",
          data: {
            workspace: { id: "ws-1", name: "Acme", contactEmail: "a@x" },
            servers: [],
            activeAlerts: [],
            generatedAt: new Date().toISOString(),
          },
        },
        attempts: 0,
      },
    ]);
    sendDigestEmail.mockResolvedValue({ success: true });
    updateMock.mockResolvedValue({});
    digestLogUpdateMock.mockResolvedValue({});

    await drainNotificationOutbox();

    expect(digestLogUpdateMock).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { status: "sent" },
    });
  });

  it("stamps DigestLog as 'failed' when a digest delivery exhausts retries", async () => {
    rowsByChannel([
      {
        id: "digest-row-fail",
        channel: "email",
        template: "digest",
        target: "alice@example.com",
        payload: {
          digestLogId: "log-2",
          data: {
            workspace: { id: "ws-1", name: "Acme", contactEmail: "a@x" },
            servers: [],
            activeAlerts: [],
            generatedAt: new Date().toISOString(),
          },
        },
        attempts: 9, // next attempt is the 10th (MAX_ATTEMPTS) → FAILED
      },
    ]);
    sendDigestEmail.mockResolvedValue({ success: false, error: "smtp" });
    updateMock.mockResolvedValue({});
    digestLogUpdateMock.mockResolvedValue({});

    const stats = await drainNotificationOutbox();
    expect(stats.failed).toBe(1);
    expect(digestLogUpdateMock).toHaveBeenCalledWith({
      where: { id: "log-2" },
      data: { status: "failed" },
    });
  });

  it("does NOT stamp DigestLog while still retrying (only on terminal states)", async () => {
    rowsByChannel([
      {
        id: "digest-row-retry",
        channel: "email",
        template: "digest",
        target: "alice@example.com",
        payload: {
          digestLogId: "log-3",
          data: {
            workspace: { id: "ws-1", name: "Acme", contactEmail: "a@x" },
            servers: [],
            activeAlerts: [],
            generatedAt: new Date().toISOString(),
          },
        },
        attempts: 0,
      },
    ]);
    sendDigestEmail.mockResolvedValue({ success: false, error: "smtp" });
    updateMock.mockResolvedValue({});

    await drainNotificationOutbox();

    expect(digestLogUpdateMock).not.toHaveBeenCalled();
  });
});
