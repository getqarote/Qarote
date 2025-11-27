import Stripe from "stripe";
import { UserPlan } from "@prisma/client";
import { logger } from "@/core/logger";
import { Sentry, setSentryContext, trackPaymentError } from "@/services/sentry";
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
  [UserPlan.DEVELOPER]: {
    monthly: stripeConfig.priceIds.developer.monthly,
    yearly: stripeConfig.priceIds.developer.yearly,
  },
  [UserPlan.ENTERPRISE]: {
    monthly: stripeConfig.priceIds.enterprise.monthly,
    yearly: stripeConfig.priceIds.enterprise.yearly,
  },
} as const;

export const PLAN_PRICING = {
  [UserPlan.DEVELOPER]: {
    monthly: 1000, // $10.00 in cents
    yearly: 10000, // $100.00 in cents (yearly discount)
  },
  [UserPlan.ENTERPRISE]: {
    monthly: 5000, // $50.00 in cents
    yearly: 50000, // $500.00 in cents (yearly discount)
  },
} as const;

export interface CreateCheckoutSessionParams {
  userId: string;
  plan: UserPlan;
  billingInterval: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  trialDays?: number;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  userId: string;
}

export class CoreStripeService {
  /**
   * Map Stripe price ID to user plan
   */
  static mapStripePlanToUserPlan(stripePriceId: string): UserPlan | null {
    for (const [plan, prices] of Object.entries(STRIPE_PRICE_IDS)) {
      if (prices.monthly === stripePriceId || prices.yearly === stripePriceId) {
        return plan as UserPlan;
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
  static extractCustomerId(session: Stripe.Checkout.Session): string | null {
    return typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null;
  }

  /**
   * Extract subscription ID from Stripe session object
   * Handles both string and object formats
   */
  static extractSubscriptionId(
    session: Stripe.Checkout.Session
  ): string | null {
    return typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id || null;
  }

  /**
   * Extract customer ID from subscription or invoice object
   * Handles both string and object formats
   */
  static extractCustomerIdFromObject(
    obj: Stripe.Subscription | Stripe.Invoice | Stripe.PaymentIntent
  ): string | null {
    return typeof obj.customer === "string"
      ? obj.customer
      : obj.customer?.id || null;
  }

  /**
   * Set Sentry context for Stripe operations
   */
  static setSentryContext(
    context: string,
    data: Record<string, unknown>
  ): void {
    setSentryContext(context, data);
  }

  /**
   * Log and capture Stripe errors in Sentry
   */
  static logStripeError(
    error: unknown,
    operation: string,
    context: Record<string, unknown> = {}
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

    // Track payment error metric
    trackPaymentError("stripe_operation", {
      operation,
      error_message: error instanceof Error ? error.message : "Unknown error",
      ...Object.fromEntries(
        Object.entries(context).map(([k, v]) => [
          k,
          typeof v === "string" ? v : String(v),
        ])
      ),
    });
  }
}
