import Stripe from "stripe";
import { WorkspacePlan } from "@prisma/client";
import { logger } from "@/core/logger";
import { Sentry, setSentryContext } from "@/core/sentry";
import { stripeConfig } from "@/config";

// Export types for use in controllers
export type Event = Stripe.Event;
export type Session = Stripe.Checkout.Session;
export type Subscription = Stripe.Subscription;
export type Invoice = Stripe.Invoice;
export type PaymentIntent = Stripe.PaymentIntent;
export type Customer = Stripe.Customer;

export const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: "2025-02-24.acacia",
});

// Stripe Price IDs for each plan (these would be created in Stripe Dashboard)
export const STRIPE_PRICE_IDS = {
  [WorkspacePlan.DEVELOPER]: {
    monthly: stripeConfig.priceIds.developer.monthly,
    yearly: stripeConfig.priceIds.developer.yearly,
  },
  [WorkspacePlan.STARTUP]: {
    monthly: stripeConfig.priceIds.startup.monthly,
    yearly: stripeConfig.priceIds.startup.yearly,
  },
  [WorkspacePlan.BUSINESS]: {
    monthly: stripeConfig.priceIds.business.monthly,
    yearly: stripeConfig.priceIds.business.yearly,
  },
} as const;

export const PLAN_PRICING = {
  [WorkspacePlan.DEVELOPER]: {
    monthly: 4900, // $49.00 in cents
    yearly: 3900, // $39.00 in cents
  },
  [WorkspacePlan.STARTUP]: {
    monthly: 9900, // $99.00 in cents
    yearly: 7900, // $79.00 in cents
  },
  [WorkspacePlan.BUSINESS]: {
    monthly: 24900, // $249.00 in cents
    yearly: 19900, // $199.00 in cents
  },
} as const;

export interface CreateCheckoutSessionParams {
  workspaceId: string;
  plan: WorkspacePlan;
  billingInterval: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  trialDays?: number;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  workspaceId: string;
}

export class StripeService {
  static async createCustomer({
    email,
    name,
    workspaceId,
  }: CreateCustomerParams) {
    try {
      logger.info({ email, workspaceId }, "Creating Stripe customer");

      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          workspaceId,
        },
      });

      // Set Sentry context for payment tracking
      setSentryContext("stripe_customer", {
        customerId: customer.id,
        email: customer.email,
        workspaceId,
      });

      logger.info(
        {
          customerId: customer.id,
          workspaceId,
        },
        "Stripe customer created successfully"
      );

      return customer;
    } catch (error) {
      logger.error(
        {
          error,
          email,
          workspaceId,
        },
        "Failed to create Stripe customer"
      );

      // Capture payment error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "payment");
        scope.setTag("operation", "create_customer");
        scope.setContext("stripe_operation", {
          operation: "createCustomer",
          email,
          workspaceId,
        });
        Sentry.captureException(error);
      });

      throw error;
    }
  }

  static async createCheckoutSession({
    workspaceId,
    plan,
    billingInterval,
    successUrl,
    cancelUrl,
    customerEmail,
    trialDays = 14,
  }: CreateCheckoutSessionParams) {
    try {
      if (plan === WorkspacePlan.FREE) {
        throw new Error("Cannot create checkout session for FREE plan");
      }

      logger.info(
        {
          workspaceId,
          plan,
          billingInterval,
          customerEmail,
        },
        "Creating Stripe checkout session"
      );

      const priceId = STRIPE_PRICE_IDS[plan][billingInterval];

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          workspaceId,
          plan,
          billingInterval,
        },
        subscription_data: {
          trial_period_days: trialDays,
          metadata: {
            workspaceId,
            plan,
            billingInterval,
          },
        },
        allow_promotion_codes: false,
      };

      // Add customer email if provided
      if (customerEmail) {
        sessionParams.customer_email = customerEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      // Set Sentry context for checkout tracking
      setSentryContext("stripe_checkout", {
        sessionId: session.id,
        workspaceId,
        plan,
        billingInterval,
        priceId,
      });

      logger.info(
        {
          sessionId: session.id,
          workspaceId,
          plan,
        },
        "Stripe checkout session created successfully"
      );

      return session;
    } catch (error) {
      logger.error(
        {
          error,
          workspaceId,
          plan,
          billingInterval,
        },
        "Failed to create Stripe checkout session"
      );

      // Capture payment error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "payment");
        scope.setTag("operation", "create_checkout_session");
        scope.setContext("stripe_operation", {
          operation: "createCheckoutSession",
          workspaceId,
          plan,
          billingInterval,
          customerEmail,
        });
        Sentry.captureException(error);
      });

      throw error;
    }
  }

  static async createPortalSession(customerId: string, returnUrl: string) {
    try {
      logger.info({ customerId }, "Creating Stripe portal session");

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      logger.info(
        {
          sessionId: session.id,
          customerId,
        },
        "Stripe portal session created successfully"
      );

      return session;
    } catch (error) {
      logger.error(
        {
          error,
          customerId,
        },
        "Failed to create Stripe portal session"
      );

      // Capture payment error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "payment");
        scope.setTag("operation", "create_portal_session");
        scope.setContext("stripe_operation", {
          operation: "createPortalSession",
          customerId,
        });
        Sentry.captureException(error);
      });

      throw error;
    }
  }

  static async getSubscription(subscriptionId: string) {
    try {
      logger.info({ subscriptionId }, "Retrieving Stripe subscription");

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      logger.info(
        {
          subscriptionId,
          status: subscription.status,
        },
        "Stripe subscription retrieved successfully"
      );

      return subscription;
    } catch (error) {
      logger.error(
        {
          error,
          subscriptionId,
        },
        "Failed to retrieve Stripe subscription"
      );

      // Capture payment error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "payment");
        scope.setTag("operation", "get_subscription");
        scope.setContext("stripe_operation", {
          operation: "getSubscription",
          subscriptionId,
        });
        Sentry.captureException(error);
      });

      throw error;
    }
  }

  static async cancelSubscription(subscriptionId: string, atPeriodEnd = true) {
    try {
      logger.info(
        {
          subscriptionId,
          atPeriodEnd,
        },
        "Canceling Stripe subscription"
      );

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: atPeriodEnd,
      });

      // Set Sentry context for subscription cancellation
      setSentryContext("stripe_cancellation", {
        subscriptionId,
        atPeriodEnd,
        status: subscription.status,
      });

      logger.info(
        {
          subscriptionId,
          status: subscription.status,
        },
        "Stripe subscription canceled successfully"
      );

      return subscription;
    } catch (error) {
      logger.error(
        {
          error,
          subscriptionId,
        },
        "Failed to cancel Stripe subscription"
      );

      // Capture payment error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "payment");
        scope.setTag("operation", "cancel_subscription");
        scope.setContext("stripe_operation", {
          operation: "cancelSubscription",
          subscriptionId,
          atPeriodEnd,
        });
        Sentry.captureException(error);
      });

      throw error;
    }
  }

  static async updateSubscription(subscriptionId: string, newPriceId: string) {
    try {
      logger.info(
        {
          subscriptionId,
          newPriceId,
        },
        "Updating Stripe subscription"
      );

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const updatedSubscription = await stripe.subscriptions.update(
        subscriptionId,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: "create_prorations",
        }
      );

      // Set Sentry context for subscription update
      setSentryContext("stripe_update", {
        subscriptionId,
        newPriceId,
        oldPriceId: subscription.items.data[0].price.id,
        status: updatedSubscription.status,
      });

      logger.info(
        {
          subscriptionId,
          newPriceId,
          status: updatedSubscription.status,
        },
        "Stripe subscription updated successfully"
      );

      return updatedSubscription;
    } catch (error) {
      logger.error(
        {
          error,
          subscriptionId,
          newPriceId,
        },
        "Failed to update Stripe subscription"
      );

      // Capture payment error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "payment");
        scope.setTag("operation", "update_subscription");
        scope.setContext("stripe_operation", {
          operation: "updateSubscription",
          subscriptionId,
          newPriceId,
        });
        Sentry.captureException(error);
      });

      throw error;
    }
  }

  static async getPaymentHistory(customerId: string, limit = 100) {
    try {
      logger.info({ customerId, limit }, "Retrieving Stripe payment history");

      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        status: "paid",
      });

      logger.info(
        {
          customerId,
          invoiceCount: invoices.data.length,
        },
        "Stripe payment history retrieved successfully"
      );

      return invoices;
    } catch (error) {
      logger.error(
        {
          error,
          customerId,
        },
        "Failed to retrieve Stripe payment history"
      );

      // Capture payment error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "payment");
        scope.setTag("operation", "get_payment_history");
        scope.setContext("stripe_operation", {
          operation: "getPaymentHistory",
          customerId,
          limit,
        });
        Sentry.captureException(error);
      });

      throw error;
    }
  }

  static async constructWebhookEvent(
    payload: string,
    signature: string
  ): Promise<Event> {
    try {
      const webhookSecret = stripeConfig.webhookSecret;

      logger.info("Constructing Stripe webhook event");

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      // Set Sentry context for webhook processing
      setSentryContext("stripe_webhook", {
        eventType: event.type,
        eventId: event.id,
        created: event.created,
      });

      logger.info(
        {
          eventType: event.type,
          eventId: event.id,
        },
        "Stripe webhook event constructed successfully"
      );

      return event;
    } catch (error) {
      logger.error({ error }, "Failed to construct Stripe webhook event");

      // Capture webhook error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "payment");
        scope.setTag("operation", "webhook_construct");
        scope.setContext("stripe_operation", {
          operation: "constructWebhookEvent",
          hasPayload: !!payload,
          hasSignature: !!signature,
        });
        Sentry.captureException(error);
      });

      throw error;
    }
  }

  static mapStripePlanToWorkspacePlan(
    stripePriceId: string
  ): WorkspacePlan | null {
    for (const [plan, prices] of Object.entries(STRIPE_PRICE_IDS)) {
      if (prices.monthly === stripePriceId || prices.yearly === stripePriceId) {
        return plan as WorkspacePlan;
      }
    }
    return null;
  }

  static getBillingInterval(
    stripePriceId: string
  ): "monthly" | "yearly" | null {
    for (const [, prices] of Object.entries(STRIPE_PRICE_IDS)) {
      if (prices.monthly === stripePriceId) return "monthly";
      if (prices.yearly === stripePriceId) return "yearly";
    }
    return null;
  }

  /**
   * Extract customer ID from Stripe session object
   * Handles both string and object formats
   */
  static extractCustomerId(session: any): string | null {
    return typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null;
  }

  /**
   * Extract subscription ID from Stripe session object
   * Handles both string and object formats
   */
  static extractSubscriptionId(session: any): string | null {
    return typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id || null;
  }

  /**
   * Extract customer ID from subscription or invoice object
   * Handles both string and object formats
   */
  static extractCustomerIdFromObject(obj: any): string | null {
    return typeof obj.customer === "string"
      ? obj.customer
      : obj.customer?.id || null;
  }
}
