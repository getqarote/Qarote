import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/core/prisma";

import { licenseService } from "@/services/license/license.service";

import { handleInvoicePaymentSucceeded } from "../webhook-handlers";

// Mock the Prisma client
vi.mock("@/core/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    license: {
      findMany: vi.fn(),
    },
    licenseFileVersion: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock license service (renewLicense, generateLicenseFile, saveLicenseFileVersion)
vi.mock("@/services/license/license.service", () => ({
  licenseService: {
    renewLicense: vi.fn(),
    generateLicenseFile: vi.fn(),
    saveLicenseFileVersion: vi.fn(),
  },
}));

// Mock license features service
vi.mock("@/services/license/license-features.service", () => ({
  getLicenseFeaturesForTier: vi.fn().mockReturnValue(["feature1"]),
}));

// Mock email service
vi.mock("@/services/email/email.service", () => ({
  EmailService: {
    sendLicenseRenewalEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock sentry
vi.mock("@/services/sentry", () => ({
  trackPaymentError: vi.fn(),
}));

// Mock logger
vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock config
vi.mock("@/config", () => ({
  emailConfig: {
    portalFrontendUrl: "https://portal.test.com",
  },
  stripeConfig: {
    secretKey: null,
    priceIds: {
      developer: { monthly: null, yearly: null },
      enterprise: { monthly: null, yearly: null },
    },
  },
  licenseConfig: {
    privateKey: null,
  },
}));

// Mock utils
vi.mock("@/core/utils", () => ({
  getUserDisplayName: vi.fn().mockReturnValue("Test User"),
}));

/**
 * Test suite for webhook idempotency handling
 *
 * Verifies that duplicate invoice.payment_succeeded webhooks for license renewals
 * are handled correctly and don't result in:
 * - Multiple version increments
 * - Multiple expiration date extensions
 * - Duplicate license file versions
 * - Duplicate renewal emails
 */
describe("Webhook Idempotency - License Renewal", () => {
  // Stripe v20 invoice format: subscription ID is in parent.subscription_details
  const mockInvoice = {
    id: "in_test_renewal_invoice_123",
    parent: {
      type: "subscription_details",
      subscription_details: {
        subscription: "sub_test_123",
      },
    },
    billing_reason: "subscription_cycle",
    amount_paid: 100000, // $1000
    currency: "usd",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process license renewal only once for duplicate webhooks", async () => {
    // This test demonstrates the idempotency behavior:
    // 1. First webhook delivery: processes renewal, creates LicenseFileVersion with invoiceId
    // 2. Second webhook delivery: detects existing LicenseFileVersion with same invoiceId, skips processing

    const licenseId = "test-license-id";
    const subscriptionId = "sub_test_123";

    // Mock subscription exists
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub-id",
      stripeSubscriptionId: subscriptionId,
      userId: "user-id",
      user: {
        id: "user-id",
        email: "test@example.com",
        name: "Test User",
      },
    } as any);

    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);

    // First call: license with version 1
    // Second call: same license (already renewed on second webhook delivery)
    vi.mocked(prisma.license.findMany)
      .mockResolvedValueOnce([
        {
          id: licenseId,
          licenseKey: "test-key",
          tier: "ENTERPRISE",
          customerEmail: "test@example.com",
          expiresAt: new Date("2026-01-01"),
          currentVersion: 1,
          isActive: true,
        },
      ] as any)
      .mockResolvedValueOnce([
        {
          id: licenseId,
          licenseKey: "test-key",
          tier: "ENTERPRISE",
          customerEmail: "test@example.com",
          expiresAt: new Date("2027-01-01"),
          currentVersion: 2,
          isActive: true,
        },
      ] as any);

    // First call: No existing renewal found (null) → process renewal
    // Second call: Existing renewal found → skip
    vi.mocked(prisma.licenseFileVersion.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "version-id",
        licenseId,
        version: 2,
        stripeInvoiceId: mockInvoice.id,
        fileContent: "{}",
        expiresAt: new Date("2027-01-01"),
        createdAt: new Date(),
        deletesAt: new Date(),
      } as any);

    // Mock license service operations
    vi.mocked(licenseService.renewLicense).mockResolvedValue({
      newVersion: 2,
    } as any);

    vi.mocked(licenseService.generateLicenseFile).mockResolvedValue({
      licenseFile: { key: "test-signed-file" },
    } as any);

    vi.mocked(licenseService.saveLicenseFileVersion).mockResolvedValue(
      undefined
    );

    // Process webhook first time
    await handleInvoicePaymentSucceeded(mockInvoice);

    // Verify renewal was processed
    expect(licenseService.renewLicense).toHaveBeenCalledTimes(1);
    expect(licenseService.saveLicenseFileVersion).toHaveBeenCalledTimes(1);

    // Process webhook second time (duplicate)
    await handleInvoicePaymentSucceeded(mockInvoice);

    // Verify renewal was NOT processed again
    // Still only 1 call from first processing
    expect(licenseService.renewLicense).toHaveBeenCalledTimes(1);
    expect(licenseService.saveLicenseFileVersion).toHaveBeenCalledTimes(1);
  });

  it("should create LicenseFileVersion with invoice ID for audit trail", async () => {
    const invoiceId = "in_test_renewal_789";
    const licenseId = "license-123";

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub-id",
      stripeSubscriptionId: "sub_test",
      userId: "user-id",
      user: {
        id: "user-id",
        email: "test@example.com",
        name: "Test User",
      },
    } as any);

    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);

    vi.mocked(prisma.license.findMany).mockResolvedValue([
      {
        id: licenseId,
        licenseKey: "key",
        tier: "ENTERPRISE",
        customerEmail: "test@example.com",
        expiresAt: new Date("2026-01-01"),
        currentVersion: 1,
        isActive: true,
      },
    ] as any);

    vi.mocked(prisma.licenseFileVersion.findFirst).mockResolvedValue(null);

    vi.mocked(licenseService.renewLicense).mockResolvedValue({
      newVersion: 2,
    } as any);

    vi.mocked(licenseService.generateLicenseFile).mockResolvedValue({
      licenseFile: { key: "test-signed-file" },
    } as any);

    const saveVersionSpy = vi.mocked(licenseService.saveLicenseFileVersion);
    saveVersionSpy.mockResolvedValue(undefined);

    await handleInvoicePaymentSucceeded({
      id: invoiceId,
      parent: {
        type: "subscription_details",
        subscription_details: {
          subscription: "sub_test",
        },
      },
      billing_reason: "subscription_cycle",
      amount_paid: 100000,
      currency: "usd",
    } as any);

    // Verify invoice ID was passed for idempotency
    expect(saveVersionSpy).toHaveBeenCalledWith(
      licenseId,
      2,
      expect.any(String),
      expect.any(Date),
      invoiceId // ← Key assertion: invoice ID saved for audit trail
    );
  });
});
