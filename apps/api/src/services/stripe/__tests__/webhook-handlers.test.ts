import { addDays, subDays } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/core/prisma";

import { enqueueNotification } from "@/services/notification/notification-outbox.service";

import {
  handleCheckoutSessionCompleted,
  handleCustomerSubscriptionDeleted,
  handleCustomerUpdated,
  handleInvoicePaymentFailed,
} from "../webhook-handlers";

// --- Mocks ---

vi.mock("@/core/prisma", () => {
  const prismaMock = {
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
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organizationMember: {
      findFirst: vi.fn(),
    },
    license: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    licenseFileVersion: {
      findFirst: vi.fn(),
    },
    // $transaction passes the same mock back as the tx client so handler
    // code that does `tx.subscription.create(...)` exercises the same
    // mocked methods.
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock)),
  };
  return { prisma: prismaMock };
});

vi.mock("@/services/license/license.service", () => ({
  licenseService: {
    generateLicense: vi.fn(),
    renewLicense: vi.fn(),
    generateLicenseJwt: vi.fn(),
    saveLicenseFileVersion: vi.fn(),
  },
}));

vi.mock("@/services/license/license-features.service", () => ({
  getLicenseFeaturesForTier: vi.fn().mockReturnValue(["feature1"]),
}));

vi.mock("@/services/notification/notification-outbox.service", () => ({
  enqueueNotification: vi.fn().mockResolvedValue(true),
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
  deploymentConfig: {
    mode: "cloud",
    isCloud: () => true,
    isSelfHosted: () => false,
  },
  posthogConfig: { apiKey: undefined, host: "https://eu.i.posthog.com" },
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

    // Org found via stripeCustomerId — Organization is billing authority
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: "org-1",
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(prisma.organization.update).mockResolvedValue({} as any);
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

    // Organization updated with the Stripe customer id only — the
    // subscription id is no longer denormalized onto Organization.
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { stripeCustomerId: "cus_123" },
    });

    // Subscription created — keyed on the organization, not a user.
    expect(prisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          stripeSubscriptionId: "sub_new",
          plan: "DEVELOPER",
        }),
      })
    );

    // Welcome email enqueued via outbox
    expect(enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ template: "upgrade_confirmation" }),
      expect.anything()
    );
  });

  it("skips duplicate when subscription already exists (idempotency)", async () => {
    const session = {
      metadata: { userId: "user-1", plan: "DEVELOPER" },
      customer: "cus_123",
      subscription: "sub_existing",
    } as any;

    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    // Valid org so the flow reaches the idempotency check (a missing org would
    // short-circuit earlier via Fail Fast, for a different reason).
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: "org-1",
      stripeCustomerId: "cus_123",
    } as any);
    vi.mocked(prisma.organization.update).mockResolvedValue({} as any);
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

    const futureDate = addDays(new Date(), 30);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub-id",
      stripeSubscriptionId: "sub_cancel_123",
      organizationId: "org-1",
    } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
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

    // Cancellation email enqueued via outbox
    expect(enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "license_cancellation",
        target: "user@test.com",
        payload: expect.objectContaining({
          licenseKey: "KEY-001",
          tier: "ENTERPRISE",
        }),
      }),
      expect.anything()
    );
  });

  it("handles subscription with no licenses (subscription-only plan)", async () => {
    const subscription = { id: "sub_no_lic", customer: "cus_123" } as any;

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub-id",
      stripeSubscriptionId: "sub_no_lic",
      organizationId: "org-1",
    } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.license.findMany).mockResolvedValue([]);

    await handleCustomerSubscriptionDeleted(subscription);

    expect(prisma.subscription.update).toHaveBeenCalled();
    expect(prisma.license.updateMany).not.toHaveBeenCalled();
    expect(enqueueNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ template: "license_cancellation" }),
      expect.anything()
    );
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
    // The billing contact is resolved via the org's OWNER membership.
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        workspace: null,
      },
    } as any);
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
      organizationId: "org-1",
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
    const recentPeriodEnd = subDays(new Date(), 2); // 2 days ago

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub",
      stripeSubscriptionId: "sub_grace",
      currentPeriodEnd: recentPeriodEnd,
      organizationId: "org-1",
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

    // Grace period warning email enqueued via outbox
    expect(enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "license_payment_failed",
        payload: expect.objectContaining({ isInGracePeriod: true }),
      }),
      expect.anything()
    );
  });

  it("deactivates licenses after grace period expires", async () => {
    const invoice = makeInvoice("sub_expired");

    // Period ended 20 days ago — past 14-day grace period
    const expiredPeriodEnd = subDays(new Date(), 20);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub",
      stripeSubscriptionId: "sub_expired",
      currentPeriodEnd: expiredPeriodEnd,
      organizationId: "org-1",
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

    // Expired email enqueued via outbox (not grace period warning)
    expect(enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ template: "license_expired" }),
      expect.anything()
    );
    expect(enqueueNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ template: "license_payment_failed" }),
      expect.anything()
    );
  });

  it("deactivates licenses past grace even when the org has no OWNER (emails skipped)", async () => {
    const invoice = makeInvoice("sub_no_owner");
    const expiredPeriodEnd = subDays(new Date(), 20);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "db-sub",
      stripeSubscriptionId: "sub_no_owner",
      currentPeriodEnd: expiredPeriodEnd,
      organizationId: "org-1",
    } as any);
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);
    // No OWNER member resolvable — license suspension must still happen.
    vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.license.findMany).mockResolvedValue([
      {
        id: "lic-1",
        licenseKey: "KEY-001",
        tier: "ENTERPRISE",
        isActive: true,
        expiresAt: new Date("2026-01-01"),
      },
    ] as any);
    vi.mocked(prisma.license.updateMany).mockResolvedValue({ count: 1 } as any);

    await handleInvoicePaymentFailed(invoice);

    // Billing-critical deactivation is NOT gated on owner resolution.
    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    );
    // No owner → no notification emails.
    expect(enqueueNotification).not.toHaveBeenCalled();
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
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: "org-1",
      stripeCustomerId: "cus_sync",
      contactEmail: "old@test.com",
    } as any);
    vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

    await handleCustomerUpdated({
      id: "cus_sync",
      email: "new@test.com",
    } as any);

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { contactEmail: "new@test.com" },
    });
  });

  it("handles missing org gracefully", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

    await handleCustomerUpdated({
      id: "cus_unknown",
      email: "ghost@test.com",
    } as any);

    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
});
