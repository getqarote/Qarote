import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/core/prisma";

import { EmailService } from "@/services/email/email.service";

import {
  handleCheckoutSessionCompleted,
  handleCustomerSubscriptionDeleted,
  handleCustomerUpdated,
  handleInvoicePaymentFailed,
} from "../webhook-handlers";

// --- Mocks ---

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    license: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    licenseFileVersion: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/services/license/license.service", () => ({
  licenseService: {
    generateLicense: vi.fn(),
    renewLicense: vi.fn(),
    generateLicenseFile: vi.fn(),
    saveLicenseFileVersion: vi.fn(),
  },
}));

vi.mock("@/services/license/license-features.service", () => ({
  getLicenseFeaturesForTier: vi.fn().mockReturnValue(["feature1"]),
}));

vi.mock("@/services/email/email.service", () => ({
  EmailService: {
    sendUpgradeConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendLicenseCancellationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendLicensePaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendLicenseExpiredEmail: vi.fn().mockResolvedValue(undefined),
    sendLicenseDeliveryEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/sentry", () => ({
  trackPaymentError: vi.fn(),
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/config", () => ({
  emailConfig: { portalFrontendUrl: "https://portal.test.com" },
  stripeConfig: {
    secretKey: null,
    priceIds: {
      developer: { monthly: null, yearly: null },
      enterprise: { monthly: null, yearly: null },
    },
  },
  licenseConfig: { privateKey: null },
}));

vi.mock("@/core/utils", () => ({
  getUserDisplayName: vi.fn().mockReturnValue("Test User"),
}));

// --- Tests ---

describe("handleCheckoutSessionCompleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early when metadata is missing", async () => {
    await handleCheckoutSessionCompleted({ metadata: {} } as any);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });

  it("creates subscription record for subscription-type checkout", async () => {
    const session = {
      metadata: {
        userId: "user-1",
        plan: "DEVELOPER",
        billingInterval: "monthly",
      },
      customer: "cus_123",
      subscription: {
        id: "sub_new",
        items: {
          data: [
            {
              price: { id: "price_dev_monthly", unit_amount: 2900 },
              current_period_start: 1700000000,
              current_period_end: 1702592000,
            },
          ],
        },
        trial_start: null,
        trial_end: null,
        cancel_at_period_end: false,
      },
    } as any;

    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      firstName: "Test",
      lastName: "User",
    } as any);
    // No existing subscription (not a duplicate)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.subscription.create).mockResolvedValue({} as any);

    await handleCheckoutSessionCompleted(session);

    // User updated with Stripe IDs
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_new",
        }),
      })
    );

    // Subscription created
    expect(prisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          stripeSubscriptionId: "sub_new",
          plan: "DEVELOPER",
        }),
      })
    );

    // Welcome email sent
    expect(EmailService.sendUpgradeConfirmationEmail).toHaveBeenCalled();
  });

  it("skips duplicate when subscription already exists (idempotency)", async () => {
    const session = {
      metadata: { userId: "user-1", plan: "DEVELOPER" },
      customer: "cus_123",
      subscription: "sub_existing",
    } as any;

    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
    } as any);
    // Subscription already exists
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "existing-sub",
      stripeSubscriptionId: "sub_existing",
    } as any);

    await handleCheckoutSessionCompleted(session);

    // Should NOT create a new subscription
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });
});

describe("handleCustomerSubscriptionDeleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks subscription as canceled and deactivates licenses", async () => {
    const subscription = {
      id: "sub_cancel_123",
      customer: "cus_123",
    } as any;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub-id",
      stripeSubscriptionId: "sub_cancel_123",
      user: { id: "user-1", email: "user@test.com" },
    } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);
    vi.mocked(prisma.license.findMany).mockResolvedValue([
      {
        id: "lic-1",
        licenseKey: "KEY-001",
        tier: "ENTERPRISE",
        customerEmail: "user@test.com",
        expiresAt: futureDate,
        isActive: true,
      },
    ] as any);
    vi.mocked(prisma.license.updateMany).mockResolvedValue({
      count: 1,
    } as any);

    await handleCustomerSubscriptionDeleted(subscription);

    // Subscription marked canceled
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_cancel_123" },
        data: { status: "CANCELED" },
      })
    );

    // Licenses deactivated
    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_cancel_123" },
        data: { isActive: false },
      })
    );

    // Cancellation email sent
    expect(EmailService.sendLicenseCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@test.com",
        licenseKey: "KEY-001",
        tier: "ENTERPRISE",
      })
    );
  });

  it("handles subscription with no licenses (subscription-only plan)", async () => {
    const subscription = { id: "sub_no_lic", customer: "cus_123" } as any;

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub-id",
      stripeSubscriptionId: "sub_no_lic",
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);
    vi.mocked(prisma.license.findMany).mockResolvedValue([]);

    await handleCustomerSubscriptionDeleted(subscription);

    expect(prisma.subscription.update).toHaveBeenCalled();
    expect(prisma.license.updateMany).not.toHaveBeenCalled();
    expect(EmailService.sendLicenseCancellationEmail).not.toHaveBeenCalled();
  });

  it("handles missing subscription gracefully", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

    await handleCustomerSubscriptionDeleted({
      id: "sub_nonexistent",
    } as any);

    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(prisma.license.updateMany).not.toHaveBeenCalled();
  });
});

describe("handleInvoicePaymentFailed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeInvoice = (subscriptionId: string) =>
    ({
      id: "in_fail_123",
      parent: {
        type: "subscription_details",
        subscription_details: { subscription: subscriptionId },
      },
      amount_due: 100000,
      currency: "usd",
    }) as any;

  it("sets subscription to PAST_DUE", async () => {
    const invoice = makeInvoice("sub_pastdue");

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub",
      stripeSubscriptionId: "sub_pastdue",
      currentPeriodEnd: new Date(), // Period just ended
      user: {
        id: "user-1",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
      },
    } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);
    vi.mocked(prisma.license.findMany).mockResolvedValue([]);

    await handleInvoicePaymentFailed(invoice);

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "PAST_DUE" },
      })
    );
  });

  it("keeps licenses active during grace period", async () => {
    const invoice = makeInvoice("sub_grace");

    // Period ended recently — still within 14-day grace period
    const recentPeriodEnd = new Date();
    recentPeriodEnd.setDate(recentPeriodEnd.getDate() - 2); // 2 days ago

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub",
      stripeSubscriptionId: "sub_grace",
      currentPeriodEnd: recentPeriodEnd,
      user: {
        id: "user-1",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
      },
    } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);
    vi.mocked(prisma.license.findMany).mockResolvedValue([
      {
        id: "lic-1",
        licenseKey: "KEY-001",
        tier: "ENTERPRISE",
        isActive: true,
        expiresAt: new Date("2027-01-01"),
      },
    ] as any);

    await handleInvoicePaymentFailed(invoice);

    // Licenses NOT deactivated (still in grace period)
    expect(prisma.license.updateMany).not.toHaveBeenCalled();

    // Grace period warning email sent
    expect(EmailService.sendLicensePaymentFailedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        isInGracePeriod: true,
      })
    );
  });

  it("deactivates licenses after grace period expires", async () => {
    const invoice = makeInvoice("sub_expired");

    // Period ended 20 days ago — past 14-day grace period
    const expiredPeriodEnd = new Date();
    expiredPeriodEnd.setDate(expiredPeriodEnd.getDate() - 20);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub",
      stripeSubscriptionId: "sub_expired",
      currentPeriodEnd: expiredPeriodEnd,
      user: {
        id: "user-1",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
      },
    } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);
    vi.mocked(prisma.license.findMany).mockResolvedValue([
      {
        id: "lic-1",
        licenseKey: "KEY-001",
        tier: "ENTERPRISE",
        isActive: true,
        expiresAt: new Date("2026-01-01"),
      },
    ] as any);
    vi.mocked(prisma.license.updateMany).mockResolvedValue({
      count: 1,
    } as any);

    await handleInvoicePaymentFailed(invoice);

    // Licenses DEACTIVATED (grace period expired)
    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      })
    );

    // Expired email sent (not grace period warning)
    expect(EmailService.sendLicenseExpiredEmail).toHaveBeenCalled();
    expect(EmailService.sendLicensePaymentFailedEmail).not.toHaveBeenCalled();
  });

  it("returns early when no subscription ID in invoice", async () => {
    await handleInvoicePaymentFailed({ id: "in_no_sub" } as any);

    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });
});

describe("handleCustomerUpdated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs email when Stripe customer email changes", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      email: "old@test.com",
      stripeCustomerId: "cus_sync",
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);

    await handleCustomerUpdated({
      id: "cus_sync",
      email: "new@test.com",
    } as any);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { email: "new@test.com" },
    });
  });

  it("skips update when email has not changed", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      email: "same@test.com",
      stripeCustomerId: "cus_same",
    } as any);

    await handleCustomerUpdated({
      id: "cus_same",
      email: "same@test.com",
    } as any);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("handles missing user gracefully", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    await handleCustomerUpdated({
      id: "cus_unknown",
      email: "ghost@test.com",
    } as any);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
