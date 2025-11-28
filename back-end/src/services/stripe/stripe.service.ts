// Re-export types and constants for backward compatibility
export {
  CoreStripeService,
  CreateCheckoutSessionParams,
  CreateCustomerParams,
  Customer,
  Event,
  Invoice,
  PaymentIntent,
  PLAN_PRICING,
  Session,
  stripe,
  STRIPE_PRICE_IDS,
  Subscription,
} from "./core.service";

// Re-export services
export { StripeCustomerService } from "./customer.service";
export { StripePaymentService } from "./payment.service";
export { StripeSubscriptionService } from "./subscription.service";
export { StripeWebhookService } from "./webhook.service";

// Import services for internal use
import { CoreStripeService } from "./core.service";
import { StripeCustomerService } from "./customer.service";
import { StripePaymentService } from "./payment.service";
import { StripeSubscriptionService } from "./subscription.service";
import { StripeWebhookService } from "./webhook.service";

/**
 * Main StripeService class that provides all Stripe functionality
 * This maintains backward compatibility while delegating to specialized services
 */
export class StripeService {
  // Core utilities
  static mapStripePlanToUserPlan = CoreStripeService.mapStripePlanToUserPlan;
  static getBillingInterval = CoreStripeService.getBillingInterval;
  static extractCustomerId = CoreStripeService.extractCustomerId;
  static extractSubscriptionId = CoreStripeService.extractSubscriptionId;
  static extractCustomerIdFromObject =
    CoreStripeService.extractCustomerIdFromObject;
  static transformPaymentDescription =
    CoreStripeService.transformPaymentDescription;
  static generatePaymentDescription =
    CoreStripeService.generatePaymentDescription;

  // Customer operations
  static createCustomer = StripeCustomerService.createCustomer;
  static createPortalSession = StripeCustomerService.createPortalSession;
  static createCheckoutSession = StripeCustomerService.createCheckoutSession;

  // Subscription operations
  static getSubscription = StripeSubscriptionService.getSubscription;
  static cancelSubscription = StripeSubscriptionService.cancelSubscription;
  static cancelSubscriptionAdvanced =
    StripeSubscriptionService.cancelSubscriptionAdvanced;
  static updateSubscription = StripeSubscriptionService.updateSubscription;
  static updateSubscriptionPaymentMethod =
    StripeSubscriptionService.updateSubscriptionPaymentMethod;

  // Payment operations
  static getUpcomingInvoice = StripePaymentService.getUpcomingInvoice;
  static getPaymentMethod = StripePaymentService.getPaymentMethod;
  static getPaymentHistory = StripePaymentService.getPaymentHistory;
  static getInvoiceHistory = StripePaymentService.getInvoiceHistory;

  // Webhook operations
  static constructWebhookEvent = StripeWebhookService.constructWebhookEvent;
}
