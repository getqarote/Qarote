/**
 * Tests for the internal new-signup notification policy.
 *
 * The invariants that matter here are the guards, not the copy:
 *  - self-hosted instances NEVER phone home, whatever the env says
 *  - no recipient configured / email disabled = deliberate skip, no outbox row
 *  - the idempotency key is derived from the user id, so a double call is a
 *    no-op rather than a duplicate email
 *  - `target` is the internal recipient; the signup's own address is payload
 *  - empty attribution is dropped, and what is kept is trimmed
 *  - the helper never rejects: call sites are fire-and-forget one-liners
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isCloud: true,
  recipient: undefined as string | undefined,
  emailEnabled: true,
  enqueueNotification: vi.fn(),
  loadEffectiveConfig: vi.fn(),
}));

vi.mock("@/config", () => ({
  internalNotificationConfig: {
    get recipient() {
      return mocks.recipient;
    },
  },
}));

vi.mock("@/config/deployment", () => ({
  isCloudMode: () => mocks.isCloud,
}));

vi.mock("@/services/email/core-email.service", () => ({
  CoreEmailService: {
    loadEffectiveConfig: (...args: unknown[]) =>
      mocks.loadEffectiveConfig(...args),
  },
}));

vi.mock("../notification-outbox.service", () => ({
  enqueueNotification: (...args: unknown[]) =>
    mocks.enqueueNotification(...args),
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { notifyInternalNewSignup } from "../new-signup-notification";

const baseInput = {
  userId: "user-123",
  email: "new@example.com",
  name: "Ada Lovelace",
  signupMethod: "form" as const,
};

describe("notifyInternalNewSignup", () => {
  beforeEach(() => {
    mocks.isCloud = true;
    mocks.recipient = "ops@qarote.io";
    mocks.emailEnabled = true;
    mocks.enqueueNotification.mockReset().mockResolvedValue(true);
    mocks.loadEffectiveConfig
      .mockReset()
      .mockImplementation(async () => ({ enabled: mocks.emailEnabled }));
  });

  it("skips on self-hosted even when a recipient is configured", async () => {
    mocks.isCloud = false;

    await expect(notifyInternalNewSignup(baseInput)).resolves.toBe(false);
    expect(mocks.enqueueNotification).not.toHaveBeenCalled();
  });

  it("skips when no internal recipient is configured", async () => {
    mocks.recipient = undefined;

    await expect(notifyInternalNewSignup(baseInput)).resolves.toBe(false);
    expect(mocks.enqueueNotification).not.toHaveBeenCalled();
  });

  it("skips when email delivery is disabled, so no undeliverable rows pile up", async () => {
    mocks.emailEnabled = false;

    await expect(notifyInternalNewSignup(baseInput)).resolves.toBe(false);
    expect(mocks.enqueueNotification).not.toHaveBeenCalled();
  });

  it("enqueues to the internal recipient, keyed by user id, with the signup as payload", async () => {
    await expect(
      notifyInternalNewSignup({
        ...baseInput,
        referralSource: "twitter",
        acquisitionChannel: "social",
        utmSource: "twitter",
      })
    ).resolves.toBe(true);

    expect(mocks.enqueueNotification).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueNotification).toHaveBeenCalledWith({
      channel: "email",
      template: "internal_new_signup",
      target: "ops@qarote.io",
      idempotencyKey: "email:internal_new_signup:user-123",
      payload: {
        signupEmail: "new@example.com",
        signupName: "Ada Lovelace",
        userId: "user-123",
        signupMethod: "form",
        referralSource: "twitter",
        discoveryQuery: undefined,
        acquisitionChannel: "social",
        utmSource: "twitter",
        utmMedium: undefined,
        utmCampaign: undefined,
        invitedByEmail: undefined,
        invitedToName: undefined,
      },
    });
  });

  it("carries inviter and destination on the invitation path", async () => {
    await notifyInternalNewSignup({
      ...baseInput,
      signupMethod: "invitation",
      invitedByEmail: "marie@acme.com",
      invitedToName: "Acme Production",
    });

    const { payload } = mocks.enqueueNotification.mock.calls[0][0];
    expect(payload.signupMethod).toBe("invitation");
    expect(payload.invitedByEmail).toBe("marie@acme.com");
    expect(payload.invitedToName).toBe("Acme Production");
  });

  it("drops blank attribution and trims what it keeps", async () => {
    await notifyInternalNewSignup({
      ...baseInput,
      name: "  Ada Lovelace  ",
      referralSource: null,
      discoveryQuery: "  ",
      utmMedium: " cpc ",
    });

    const { payload } = mocks.enqueueNotification.mock.calls[0][0];
    expect(payload.signupName).toBe("Ada Lovelace");
    expect(payload.referralSource).toBeUndefined();
    expect(payload.discoveryQuery).toBeUndefined();
    expect(payload.utmMedium).toBe("cpc");
  });

  it("returns false when the row already exists (idempotency collision)", async () => {
    mocks.enqueueNotification.mockResolvedValue(false);

    await expect(notifyInternalNewSignup(baseInput)).resolves.toBe(false);
  });

  it("never rejects when the outbox throws — call sites are fire-and-forget", async () => {
    mocks.enqueueNotification.mockRejectedValue(new Error("db down"));

    await expect(notifyInternalNewSignup(baseInput)).resolves.toBe(false);
  });
});
