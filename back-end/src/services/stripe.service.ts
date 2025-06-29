import Stripe from "stripe";
import { WorkspacePlan } from "@prisma/client";
import { logger } from "@/core/logger";
import { Sentry, setSentryContext } from "@/core/sentry";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

// Stripe Price IDs for each plan (these would be created in Stripe Dashboard)
export const STRIPE_PRICE_IDS = {
  [WorkspacePlan.FREELANCE]: {
    monthly: process.env.STRIPE_FREELANCE_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_FREELANCE_YEARLY_PRICE_ID,
  },
  [WorkspacePlan.STARTUP]: {
    monthly: process.env.STRIPE_STARTUP_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_STARTUP_YEARLY_PRICE_ID,
  },
  [WorkspacePlan.BUSINESS]: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
  },
} as const;

export const PLAN_PRICING = {
  [WorkspacePlan.FREELANCE]: {
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
      logger.info("Creating Stripe customer", { email, workspaceId });

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

      logger.info("Stripe customer created successfully", {
        customerId: customer.id,
        workspaceId,
      });

      return customer;
    } catch (error) {
      logger.error("Failed to create Stripe customer", {
        error,
        email,
        workspaceId,
      });

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

      logger.info("Creating Stripe checkout session", {
        workspaceId,
        plan,
        billingInterval,
        customerEmail,
      });

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

      logger.info("Stripe checkout session created successfully", {
        sessionId: session.id,
        workspaceId,
        plan,
      });

      return session;
    } catch (error) {
      logger.error("Failed to create Stripe checkout session", {
        error,
        workspaceId,
        plan,
        billingInterval,
      });

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
      logger.info("Creating Stripe portal session", { customerId });

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      logger.info("Stripe portal session created successfully", {
        sessionId: session.id,
        customerId,
      });

      return session;
    } catch (error) {
      logger.error("Failed to create Stripe portal session", {
        error,
        customerId,
      });

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
      logger.info("Retrieving Stripe subscription", { subscriptionId });

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      logger.info("Stripe subscription retrieved successfully", {
        subscriptionId,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      logger.error("Failed to retrieve Stripe subscription", {
        error,
        subscriptionId,
      });

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
      logger.info("Canceling Stripe subscription", {
        subscriptionId,
        atPeriodEnd,
      });

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: atPeriodEnd,
      });

      // Set Sentry context for subscription cancellation
      setSentryContext("stripe_cancellation", {
        subscriptionId,
        atPeriodEnd,
        status: subscription.status,
      });

      logger.info("Stripe subscription canceled successfully", {
        subscriptionId,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      logger.error("Failed to cancel Stripe subscription", {
        error,
        subscriptionId,
      });

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
      logger.info("Updating Stripe subscription", {
        subscriptionId,
        newPriceId,
      });

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

      logger.info("Stripe subscription updated successfully", {
        subscriptionId,
        newPriceId,
        status: updatedSubscription.status,
      });

      return updatedSubscription;
    } catch (error) {
      logger.error("Failed to update Stripe subscription", {
        error,
        subscriptionId,
        newPriceId,
      });

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
      logger.info("Retrieving Stripe payment history", { customerId, limit });

      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        status: "paid",
      });

      logger.info("Stripe payment history retrieved successfully", {
        customerId,
        invoiceCount: invoices.data.length,
      });

      return invoices;
    } catch (error) {
      logger.error("Failed to retrieve Stripe payment history", {
        error,
        customerId,
      });

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

  static async constructWebhookEvent(payload: string, signature: string) {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error(
          "STRIPE_WEBHOOK_SECRET environment variable is required"
        );
      }

      logger.info("Constructing Stripe webhook event");

      const event = await stripe.webhooks.constructEvent(
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

      logger.info("Stripe webhook event constructed successfully", {
        eventType: event.type,
        eventId: event.id,
      });

      return event;
    } catch (error) {
      logger.error("Failed to construct Stripe webhook event", { error });

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
}
