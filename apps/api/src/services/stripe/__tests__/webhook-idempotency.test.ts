import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/core/prisma";

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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    licenseFileVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
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
  const mockInvoice = {
    id: "in_test_renewal_invoice_123",
    subscription: "sub_test_123",
    billing_reason: "subscription_cycle",
    amount_paid: 100000, // $1000
    currency: "usd",
    payment_intent: null,
  } as any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it("should process license renewal only once for duplicate webhooks", async () => {
    // This test demonstrates the idempotency behavior:
    // 1. First webhook delivery: processes renewal, creates LicenseFileVersion with invoiceId
    // 2. Second webhook delivery: detects existing LicenseFileVersion with same invoiceId, skips processing

    const licenseId = "test-license-id";
    const subscriptionId = "sub_test_123";

    // Mock subscription exists
    vi.spyOn(prisma.subscription, "findUnique").mockResolvedValue({
      id: "sub-id",
      stripeSubscriptionId: subscriptionId,
      userId: "user-id",
      user: {
        id: "user-id",
        email: "test@example.com",
        name: "Test User",
      },
    } as any);

    // Mock subscription update
    vi.spyOn(prisma.subscription, "update").mockResolvedValue({} as any);

    // First call: No existing renewal
    vi.spyOn(prisma.license, "findMany")
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
      // Second call: Same license
      .mockResolvedValueOnce([
        {
          id: licenseId,
          licenseKey: "test-key",
          tier: "ENTERPRISE",
          customerEmail: "test@example.com",
          expiresAt: new Date("2027-01-01"), // Already extended
          currentVersion: 2, // Already incremented
          isActive: true,
        },
      ] as any);

    // First call: No existing renewal found (null)
    // Second call: Existing renewal found (returns the created record)
    vi.spyOn(prisma.licenseFileVersion, "findFirst")
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

    // Mock other operations
    vi.spyOn(prisma.license, "findUnique").mockResolvedValue({
      id: licenseId,
      currentVersion: 1,
      expiresAt: new Date("2026-01-01"),
    } as any);

    vi.spyOn(prisma.license, "update").mockResolvedValue({
      id: licenseId,
      currentVersion: 2,
      expiresAt: new Date("2027-01-01"),
    } as any);

    vi.spyOn(prisma.licenseFileVersion, "create").mockResolvedValue({} as any);

    // Process webhook first time
    await handleInvoicePaymentSucceeded(mockInvoice);

    // Verify renewal was processed
    expect(prisma.license.update).toHaveBeenCalledTimes(1);
    expect(prisma.licenseFileVersion.create).toHaveBeenCalledTimes(1);

    // Process webhook second time (duplicate)
    await handleInvoicePaymentSucceeded(mockInvoice);

    // Verify renewal was NOT processed again
    // Still only 1 call from first processing
    expect(prisma.license.update).toHaveBeenCalledTimes(1);
    expect(prisma.licenseFileVersion.create).toHaveBeenCalledTimes(1);
  });

  it("should create LicenseFileVersion with invoice ID for audit trail", async () => {
    const invoiceId = "in_test_renewal_789";
    const licenseId = "license-123";

    // Mock database calls
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
    vi.mocked(prisma.license.findUnique).mockResolvedValue({
      id: licenseId,
      currentVersion: 1,
      expiresAt: new Date("2026-01-01"),
    } as any);
    vi.mocked(prisma.license.update).mockResolvedValue({
      id: licenseId,
      currentVersion: 2,
      expiresAt: new Date("2027-01-01"),
    } as any);

    const createSpy = vi.mocked(prisma.licenseFileVersion.create);
    createSpy.mockResolvedValue({} as any);

    await handleInvoicePaymentSucceeded({
      id: invoiceId,
      subscription: "sub_test",
      billing_reason: "subscription_cycle",
      amount_paid: 100000,
      currency: "usd",
      payment_intent: null,
    } as any);

    // Verify invoice ID was saved for idempotency
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          licenseId,
          version: 2,
          stripeInvoiceId: invoiceId, // ← Key assertion
        }),
      })
    );
  });
});
