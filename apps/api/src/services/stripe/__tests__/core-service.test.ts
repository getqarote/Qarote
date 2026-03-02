import { describe, expect, it, vi } from "vitest";

import { CoreStripeService } from "../core.service";

// Mock dependencies required at module level by core.service.ts
vi.mock("@/config", () => ({
  stripeConfig: {
    secretKey: null,
    priceIds: {
      developer: { monthly: null, yearly: null },
      enterprise: { monthly: null, yearly: null },
    },
  },
}));

vi.mock("@/services/sentry", () => ({
  Sentry: { withScope: vi.fn(), captureException: vi.fn() },
  setSentryContext: vi.fn(),
  trackPaymentError: vi.fn(),
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("CoreStripeService", () => {
  describe("extractSubscriptionIdFromInvoice", () => {
    it("extracts string subscription from parent.subscription_details", () => {
      const invoice = {
        parent: {
          type: "subscription_details",
          subscription_details: {
            subscription: "sub_abc123",
          },
        },
      } as any;

      expect(CoreStripeService.extractSubscriptionIdFromInvoice(invoice)).toBe(
        "sub_abc123"
      );
    });

    it("extracts subscription id from object", () => {
      const invoice = {
        parent: {
          type: "subscription_details",
          subscription_details: {
            subscription: { id: "sub_obj456" },
          },
        },
      } as any;

      expect(CoreStripeService.extractSubscriptionIdFromInvoice(invoice)).toBe(
        "sub_obj456"
      );
    });

    it("returns null when parent type is not subscription_details", () => {
      const invoice = {
        parent: {
          type: "quote_details",
          quote_details: {},
        },
      } as any;

      expect(
        CoreStripeService.extractSubscriptionIdFromInvoice(invoice)
      ).toBeNull();
    });

    it("returns null when parent is missing", () => {
      const invoice = {} as any;

      expect(
        CoreStripeService.extractSubscriptionIdFromInvoice(invoice)
      ).toBeNull();
    });

    it("returns null when subscription is null", () => {
      const invoice = {
        parent: {
          type: "subscription_details",
          subscription_details: {
            subscription: null,
          },
        },
      } as any;

      expect(
        CoreStripeService.extractSubscriptionIdFromInvoice(invoice)
      ).toBeNull();
    });
  });

  describe("extractCustomerIdFromSubscription", () => {
    it("extracts string customer id", () => {
      const sub = { customer: "cus_abc123" } as any;
      expect(CoreStripeService.extractCustomerIdFromSubscription(sub)).toBe(
        "cus_abc123"
      );
    });

    it("extracts customer id from object", () => {
      const sub = { customer: { id: "cus_obj456" } } as any;
      expect(CoreStripeService.extractCustomerIdFromSubscription(sub)).toBe(
        "cus_obj456"
      );
    });

    it("returns null when customer is null", () => {
      const sub = { customer: null } as any;
      expect(
        CoreStripeService.extractCustomerIdFromSubscription(sub)
      ).toBeNull();
    });
  });

  describe("mapStripeStatusToSubscriptionStatus", () => {
    it("maps active status", () => {
      expect(
        CoreStripeService.mapStripeStatusToSubscriptionStatus("active")
      ).toBe("ACTIVE");
    });

    it("maps past_due status", () => {
      expect(
        CoreStripeService.mapStripeStatusToSubscriptionStatus("past_due")
      ).toBe("PAST_DUE");
    });

    it("maps canceled status", () => {
      expect(
        CoreStripeService.mapStripeStatusToSubscriptionStatus("canceled")
      ).toBe("CANCELED");
    });

    it("maps cancelled (british spelling)", () => {
      expect(
        CoreStripeService.mapStripeStatusToSubscriptionStatus("cancelled")
      ).toBe("CANCELED");
    });

    it("maps incomplete status", () => {
      expect(
        CoreStripeService.mapStripeStatusToSubscriptionStatus("incomplete")
      ).toBe("INCOMPLETE");
    });

    it("maps incomplete_expired status", () => {
      expect(
        CoreStripeService.mapStripeStatusToSubscriptionStatus(
          "incomplete_expired"
        )
      ).toBe("INCOMPLETE_EXPIRED");
    });

    it("defaults to INCOMPLETE for unknown status", () => {
      expect(
        CoreStripeService.mapStripeStatusToSubscriptionStatus("unknown_status")
      ).toBe("INCOMPLETE");
    });
  });

  describe("mapStripePlanToUserPlan", () => {
    // STRIPE_PRICE_IDS is null in tests (no secret key), so only string fallback is tested
    it("maps price id containing 'developer'", () => {
      expect(
        CoreStripeService.mapStripePlanToUserPlan("price_developer_monthly")
      ).toBe("DEVELOPER");
    });

    it("maps price id containing 'enterprise'", () => {
      expect(
        CoreStripeService.mapStripePlanToUserPlan("price_enterprise_yearly")
      ).toBe("ENTERPRISE");
    });

    it("maps price id containing 'free'", () => {
      expect(CoreStripeService.mapStripePlanToUserPlan("price_free_tier")).toBe(
        "FREE"
      );
    });

    it("returns null for unknown price id", () => {
      expect(
        CoreStripeService.mapStripePlanToUserPlan("price_unknown_xyz")
      ).toBeNull();
    });
  });

  describe("mapSubscriptionStatusFromTrial", () => {
    it("returns TRIALING when trial exists", () => {
      expect(
        CoreStripeService.mapSubscriptionStatusFromTrial(1000000, 2000000)
      ).toBe("TRIALING");
    });

    it("returns ACTIVE when no trial", () => {
      expect(CoreStripeService.mapSubscriptionStatusFromTrial(null, null)).toBe(
        "ACTIVE"
      );
    });

    it("returns ACTIVE when trial start is null", () => {
      expect(
        CoreStripeService.mapSubscriptionStatusFromTrial(null, 2000000)
      ).toBe("ACTIVE");
    });
  });

  describe("mapStripeBillingIntervalToBillingInterval", () => {
    it("maps 'yearly' to YEAR", () => {
      expect(
        CoreStripeService.mapStripeBillingIntervalToBillingInterval("yearly")
      ).toBe("YEAR");
    });

    it("maps 'year' to YEAR", () => {
      expect(
        CoreStripeService.mapStripeBillingIntervalToBillingInterval("year")
      ).toBe("YEAR");
    });

    it("maps 'monthly' to MONTH", () => {
      expect(
        CoreStripeService.mapStripeBillingIntervalToBillingInterval("monthly")
      ).toBe("MONTH");
    });

    it("defaults to MONTH for undefined", () => {
      expect(
        CoreStripeService.mapStripeBillingIntervalToBillingInterval(undefined)
      ).toBe("MONTH");
    });
  });

  describe("mapInvoiceToFailureReason", () => {
    it("returns finalization error message when available", () => {
      const invoice = {
        last_finalization_error: { message: "Card declined" },
      } as any;
      expect(CoreStripeService.mapInvoiceToFailureReason(invoice)).toBe(
        "Card declined"
      );
    });

    it("returns default message when no error details", () => {
      const invoice = {} as any;
      expect(CoreStripeService.mapInvoiceToFailureReason(invoice)).toBe(
        "Payment failed"
      );
    });
  });

  describe("transformPaymentDescription", () => {
    it("generates description when input is null", () => {
      expect(
        CoreStripeService.transformPaymentDescription(
          null,
          "DEVELOPER",
          "MONTH"
        )
      ).toBe("Payment for developer plan (monthly)");
    });

    it("generates yearly description when input is null", () => {
      expect(
        CoreStripeService.transformPaymentDescription(
          null,
          "ENTERPRISE",
          "YEAR"
        )
      ).toBe("Payment for enterprise plan (yearly)");
    });

    it("transforms technical description with sub_ id", () => {
      expect(
        CoreStripeService.transformPaymentDescription(
          "Payment for sub_123",
          "DEVELOPER",
          "MONTH"
        )
      ).toBe("Payment for developer plan (monthly)");
    });

    it("detects failed in technical description", () => {
      expect(
        CoreStripeService.transformPaymentDescription(
          "Failed payment for sub_456",
          "ENTERPRISE",
          "YEAR"
        )
      ).toBe("Failed for enterprise plan (yearly)");
    });

    it("returns user-friendly description as-is", () => {
      const desc = "Payment for developer plan (monthly)";
      expect(
        CoreStripeService.transformPaymentDescription(
          desc,
          "DEVELOPER",
          "MONTH"
        )
      ).toBe(desc);
    });

    it("returns non-technical description as-is", () => {
      expect(
        CoreStripeService.transformPaymentDescription(
          "Custom charge",
          "DEVELOPER",
          "MONTH"
        )
      ).toBe("Custom charge");
    });
  });
});
