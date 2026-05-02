import { test, expect } from "../../fixtures/test-base.js";
import { mockTrpcQuery } from "../../helpers/trpc-mock.js";

const now = Math.floor(Date.now() / 1000);
const fourteenDaysFromNow = now + 14 * 24 * 60 * 60;

function makeBillingOverview(
  overrides: {
    status?: string;
    trialEnd?: string | null;
    paymentMethod?: unknown;
  } = {}
) {
  const status = overrides.status ?? "TRIALING";
  const trialEnd =
    overrides.trialEnd !== undefined
      ? overrides.trialEnd
      : new Date(fourteenDaysFromNow * 1000).toISOString();

  return {
    workspace: { id: "ws-1", name: "Test Workspace" },
    subscription: {
      id: "sub-db-1",
      status,
      plan: "ENTERPRISE",
      stripeCustomerId: "cus_test123",
      stripeSubscriptionId: "sub_test123",
      canceledAt: null,
      isRenewalAfterCancel: false,
      previousCancelDate: null,
      trialStart:
        status === "TRIALING" ? new Date(now * 1000).toISOString() : null,
      trialEnd: status === "TRIALING" ? trialEnd : null,
      createdAt: new Date(now * 1000).toISOString(),
      updatedAt: new Date(now * 1000).toISOString(),
    },
    stripeSubscription: {
      id: "sub_test123",
      status: status === "TRIALING" ? "trialing" : "active",
      current_period_start: now,
      current_period_end: fourteenDaysFromNow,
      cancel_at_period_end: false,
      canceled_at: null,
      default_payment_method: null,
      currency: "usd",
      items: {
        data: [
          {
            price: {
              id: "price_test123",
              unit_amount: 1900,
              currency: "usd",
              recurring: { interval: "month" },
            },
          },
        ],
      },
    },
    upcomingInvoice: null,
    paymentMethod: overrides.paymentMethod ?? null,
    currentUsage: {
      servers: 1,
      users: 1,
      queues: 0,
      messagesThisMonth: 0,
    },
    recentPayments: [],
  };
}

const mockPaymentMethod = {
  id: "pm_test123",
  type: "card",
  card: {
    brand: "visa",
    last4: "4242",
    exp_month: 12,
    exp_year: 2027,
  },
  billing_details: null,
};

test.describe("Trial Billing UI @p1", () => {
  test("should show trial badge and add payment method button when trialing without card @cloud", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(
      adminPage,
      "payment.billing.getBillingOverview",
      makeBillingOverview({ status: "TRIALING", paymentMethod: null })
    );

    await adminPage.goto("/billing");
    await adminPage.waitForLoadState("domcontentloaded");

    // Verify trial badge is visible
    await expect(adminPage.getByText(/^Trial$/)).toBeVisible({
      timeout: 15_000,
    });

    // Verify "Add payment method" buttons are visible (one in plan card, one in management banner)
    const addPaymentButtons = adminPage.getByRole("button", {
      name: /add payment method/i,
    });
    await expect(addPaymentButtons).toHaveCount(2);
    await expect(addPaymentButtons.nth(0)).toBeVisible();
    await expect(addPaymentButtons.nth(1)).toBeVisible();

    // Verify trial end date section is shown
    await expect(adminPage.getByText(/trial ends/i)).toBeVisible();

    // Verify trial active banner is shown
    await expect(adminPage.getByText(/your trial is active/i)).toBeVisible();
  });

  test("should NOT show add payment button when trialing WITH a card @cloud", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(
      adminPage,
      "payment.billing.getBillingOverview",
      makeBillingOverview({
        status: "TRIALING",
        paymentMethod: mockPaymentMethod,
      })
    );

    await adminPage.goto("/billing");
    await adminPage.waitForLoadState("domcontentloaded");

    // Trial badge should still be visible
    await expect(adminPage.getByText(/^Trial$/)).toBeVisible({
      timeout: 15_000,
    });

    // Card last4 should be shown
    await expect(adminPage.getByText("4242")).toBeVisible();

    // No "Add payment method" buttons should be visible when card is on file
    const addPaymentButtons = adminPage.getByRole("button", {
      name: /add payment method/i,
    });
    await expect(addPaymentButtons).toHaveCount(0);
  });
});

test.describe("Active Subscription Billing UI @p2", () => {
  test("should NOT show trial badge or trial banner for active subscription @cloud", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(
      adminPage,
      "payment.billing.getBillingOverview",
      makeBillingOverview({
        status: "ACTIVE",
        paymentMethod: mockPaymentMethod,
      })
    );

    await adminPage.goto("/billing");
    await adminPage.waitForLoadState("domcontentloaded");

    // Wait for page to load
    await expect(adminPage.getByText("4242")).toBeVisible({ timeout: 15_000 });

    // No trial badge
    await expect(adminPage.getByText(/^Trial$/)).not.toBeVisible();

    // No trial banner
    await expect(
      adminPage.getByText(/your trial is active/i)
    ).not.toBeVisible();
  });
});
