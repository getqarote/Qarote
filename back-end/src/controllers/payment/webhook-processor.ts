import { Event } from "@/services/stripe.service";
import { logger } from "@/core/logger";
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionChange,
  handleSubscriptionDeleted,
  handleTrialWillEnd,
  handlePaymentSucceeded,
  handlePaymentFailed,
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
      await handleSubscriptionDeleted(event.data.object);
      break;

    case "customer.subscription.trial_will_end":
      await handleTrialWillEnd(event.data.object);
      break;

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object);
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
