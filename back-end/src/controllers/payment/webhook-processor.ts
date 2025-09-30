import { logger } from "@/core/logger";
import { Event } from "@/services/stripe/stripe.service";
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionChange,
  handleCustomerSubscriptionDeleted,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleTrialWillEnd,
  handlePaymentActionRequired,
  handleUpcomingInvoice,
  handlePaymentIntentFailed,
  handleCustomerUpdated,
} from "./webhook-handlers";

export async function processStripeWebhook(event: Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChange(event.data.object);
      break;

    case "customer.subscription.deleted":
      await handleCustomerSubscriptionDeleted(event.data.object);
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object);
      break;

    case "customer.subscription.trial_will_end":
      await handleTrialWillEnd(event.data.object);
      break;

    case "invoice.payment_action_required":
      await handlePaymentActionRequired(event.data.object);
      break;

    case "invoice.upcoming":
      await handleUpcomingInvoice(event.data.object);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object);
      break;

    case "customer.updated":
      await handleCustomerUpdated(event.data.object);
      break;

    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }
}
