import { describe, expect, it, vi } from "vitest";

import { processStripeWebhook } from "../webhook-processor";

// Mock all webhook handlers
vi.mock("../webhook-handlers", () => ({
  handleCheckoutSessionCompleted: vi.fn().mockResolvedValue(undefined),
  handleSubscriptionChange: vi.fn().mockResolvedValue(undefined),
  handleCustomerSubscriptionDeleted: vi.fn().mockResolvedValue(undefined),
  handleInvoicePaymentSucceeded: vi.fn().mockResolvedValue(undefined),
  handleInvoicePaymentFailed: vi.fn().mockResolvedValue(undefined),
  handleTrialWillEnd: vi.fn().mockResolvedValue(undefined),
  handlePaymentActionRequired: vi.fn().mockResolvedValue(undefined),
  handleUpcomingInvoice: vi.fn().mockResolvedValue(undefined),
  handlePaymentIntentFailed: vi.fn().mockResolvedValue(undefined),
  handlePaymentIntentSucceeded: vi.fn().mockResolvedValue(undefined),
  handleCustomerUpdated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Import handlers after mocking so we get the mocked versions
const handlers = await import("../webhook-handlers");

function makeEvent(type: string, data: unknown = {}) {
  return { type, data: { object: data } } as any;
}

describe("processStripeWebhook", () => {
  it("routes checkout.session.completed", async () => {
    const data = { id: "cs_123" };
    await processStripeWebhook(makeEvent("checkout.session.completed", data));
    expect(handlers.handleCheckoutSessionCompleted).toHaveBeenCalledWith(data);
  });

  it("routes customer.subscription.created to handleSubscriptionChange", async () => {
    const data = { id: "sub_123" };
    await processStripeWebhook(
      makeEvent("customer.subscription.created", data)
    );
    expect(handlers.handleSubscriptionChange).toHaveBeenCalledWith(data);
  });

  it("routes customer.subscription.updated to handleSubscriptionChange", async () => {
    const data = { id: "sub_456" };
    await processStripeWebhook(
      makeEvent("customer.subscription.updated", data)
    );
    expect(handlers.handleSubscriptionChange).toHaveBeenCalledWith(data);
  });

  it("routes customer.subscription.deleted", async () => {
    const data = { id: "sub_del" };
    await processStripeWebhook(
      makeEvent("customer.subscription.deleted", data)
    );
    expect(handlers.handleCustomerSubscriptionDeleted).toHaveBeenCalledWith(
      data
    );
  });

  it("routes invoice.payment_succeeded", async () => {
    const data = { id: "in_success" };
    await processStripeWebhook(makeEvent("invoice.payment_succeeded", data));
    expect(handlers.handleInvoicePaymentSucceeded).toHaveBeenCalledWith(data);
  });

  it("routes invoice.payment_failed", async () => {
    const data = { id: "in_fail" };
    await processStripeWebhook(makeEvent("invoice.payment_failed", data));
    expect(handlers.handleInvoicePaymentFailed).toHaveBeenCalledWith(data);
  });

  it("routes customer.updated", async () => {
    const data = { id: "cus_123" };
    await processStripeWebhook(makeEvent("customer.updated", data));
    expect(handlers.handleCustomerUpdated).toHaveBeenCalledWith(data);
  });

  it("does not throw for unknown event types", async () => {
    await expect(
      processStripeWebhook(makeEvent("unknown.event.type"))
    ).resolves.not.toThrow();
  });
});
