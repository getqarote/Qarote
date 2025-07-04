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

export class CoreStripeService {
  /**
   * Map Stripe price ID to workspace plan
   */
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

  /**
   * Get billing interval from Stripe price ID
   */
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

  /**
   * Set Sentry context for Stripe operations
   */
  static setSentryContext(context: string, data: Record<string, any>): void {
    setSentryContext(context, data);
  }

  /**
   * Log and capture Stripe errors in Sentry
   */
  static logStripeError(
    error: any,
    operation: string,
    context: Record<string, any> = {}
  ): void {
    logger.error(
      { error, ...context },
      `Stripe operation failed: ${operation}`
    );

    Sentry.withScope((scope) => {
      scope.setTag("component", "payment");
      scope.setTag("operation", operation);
      scope.setContext("stripe_operation", {
        operation,
        ...context,
      });
      Sentry.captureException(error);
    });
  }
}
