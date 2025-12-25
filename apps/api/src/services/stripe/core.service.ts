import { BillingInterval, SubscriptionStatus, UserPlan } from "@prisma/client";
import Stripe from "stripe";

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
    monthly: 3400, // $34.00 in cents
    yearly: 34800, // $348.00 in cents (yearly discount)
  },
  [UserPlan.ENTERPRISE]: {
    monthly: 12400, // $124.00 in cents
    yearly: 118800, // $1,188.00 in cents (yearly discount)
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
   * First tries exact match with STRIPE_PRICE_IDS, then falls back to string matching
   */
  static mapStripePlanToUserPlan(stripePriceId: string): UserPlan | null {
    // First, try exact match with configured price IDs
    for (const [plan, prices] of Object.entries(STRIPE_PRICE_IDS)) {
      if (prices.monthly === stripePriceId || prices.yearly === stripePriceId) {
        return plan as UserPlan;
      }
    }
    // Fallback to string matching for flexibility
    if (stripePriceId.includes("free")) {
      return UserPlan.FREE;
    }
    if (stripePriceId.includes("developer")) {
      return UserPlan.DEVELOPER;
    }
    if (stripePriceId.includes("enterprise")) {
      return UserPlan.ENTERPRISE;
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
   * Extract subscription ID from Stripe invoice
   * Handles both string and object subscription types
   */
  static extractSubscriptionIdFromInvoice(
    invoice: Stripe.Invoice
  ): string | null {
    if (typeof invoice.subscription === "string") {
      return invoice.subscription;
    }
    return invoice.subscription?.id || null;
  }

  /**
   * Extract customer ID from Stripe subscription
   * Handles both string and object customer types
   */
  static extractCustomerIdFromSubscription(
    subscription: Stripe.Subscription
  ): string | null {
    if (typeof subscription.customer === "string") {
      return subscription.customer;
    }
    return subscription.customer?.id || null;
  }

  /**
   * Extract payment intent ID from Stripe checkout session
   * Handles both string and object payment_intent types
   */
  static extractPaymentIntentIdFromSession(
    session: Stripe.Checkout.Session
  ): string | null {
    if (typeof session.payment_intent === "string") {
      return session.payment_intent;
    }
    return session.payment_intent?.id || null;
  }

  /**
   * Map Stripe subscription status to our internal SubscriptionStatus enum
   */
  static mapStripeStatusToSubscriptionStatus(
    stripeStatus: string
  ): SubscriptionStatus {
    switch (stripeStatus.toUpperCase()) {
      case "ACTIVE":
        return SubscriptionStatus.ACTIVE;
      case "PAST_DUE":
        return SubscriptionStatus.PAST_DUE;
      case "CANCELED":
      case "CANCELLED":
        return SubscriptionStatus.CANCELED;
      case "INCOMPLETE":
        return SubscriptionStatus.INCOMPLETE;
      case "INCOMPLETE_EXPIRED":
        return SubscriptionStatus.INCOMPLETE_EXPIRED;
      default:
        return SubscriptionStatus.INCOMPLETE;
    }
  }

  /**
   * Extract payment failure reason from Stripe invoice
   * Attempts to get the most specific error message available
   */
  static mapInvoiceToFailureReason(invoice: Stripe.Invoice): string {
    // First, try to get failure_message from the charge object
    if (
      invoice.charge &&
      typeof invoice.charge !== "string" &&
      invoice.charge.failure_message
    ) {
      return invoice.charge.failure_message;
    }

    // Fallback to outcome reason if available
    if (
      invoice.charge &&
      typeof invoice.charge !== "string" &&
      invoice.charge.outcome?.reason
    ) {
      return invoice.charge.outcome.reason;
    }

    // Default fallback
    return "Payment failed";
  }

  /**
   * Determine subscription status based on trial information
   * Returns TRIALING if trial exists, otherwise ACTIVE
   */
  static mapSubscriptionStatusFromTrial(
    trialStart: number | null | undefined,
    trialEnd: number | null | undefined
  ): SubscriptionStatus {
    const hasTrial = trialStart && trialEnd;
    return hasTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE;
  }

  /**
   * Map Stripe billing interval string to BillingInterval enum
   * Handles both "yearly"/"year" and "monthly"/"month" formats
   */
  static mapStripeBillingIntervalToBillingInterval(
    interval: string | undefined
  ): BillingInterval {
    if (interval === "yearly" || interval === "year") {
      return BillingInterval.YEAR;
    }
    return BillingInterval.MONTH;
  }

  /**
   * Map Stripe recurring interval to BillingInterval enum
   * Stripe uses "year" and "month" for recurring intervals
   */
  static mapStripeBillingInterval(
    interval: string | undefined
  ): BillingInterval {
    if (interval === "year") {
      return BillingInterval.YEAR;
    }
    return BillingInterval.MONTH;
  }

  /**
   * Map BillingInterval enum to string format
   * Returns "monthly" or "yearly" for display/API purposes
   */
  static mapBillingIntervalToString(
    interval: BillingInterval
  ): "monthly" | "yearly" {
    return interval === BillingInterval.YEAR ? "yearly" : "monthly";
  }

  /**
   * Transforms payment descriptions from technical format to user-friendly format
   *
   * @param description - The original payment description (can be null)
   * @param plan - The subscription plan (e.g., 'DEVELOPER', 'PROFESSIONAL')
   * @param billingInterval - The billing interval (e.g., 'MONTH', 'YEAR')
   * @returns A user-friendly payment description
   *
   * @example
   * transformPaymentDescription('Payment for sub_123', 'DEVELOPER', 'MONTH')
   * Returns: 'Payment for developer plan (monthly)'
   *
   * @example
   * transformPaymentDescription('Failed payment for sub_123', 'PROFESSIONAL', 'YEAR')
   * Returns: 'Failed payment for professional plan (yearly)'
   */
  static transformPaymentDescription(
    description: string | null,
    plan: string,
    billingInterval: string
  ): string {
    // Handle null description
    if (!description) {
      const planName = plan.toLowerCase().replace("_", " ");
      const intervalText = billingInterval === "YEAR" ? "yearly" : "monthly";
      return `Payment for ${planName} plan (${intervalText})`;
    }

    // If it's already a user-friendly description, return as is
    if (description.includes("plan (") && !description.includes("sub_")) {
      return description;
    }

    // Transform technical descriptions
    if (description.includes("sub_")) {
      const planName = plan.toLowerCase().replace("_", " ");
      const intervalText = billingInterval === "YEAR" ? "yearly" : "monthly";
      const prefix = description.toLowerCase().includes("failed")
        ? "Failed"
        : "Payment";

      return `${prefix} for ${planName} plan (${intervalText})`;
    }

    // Return original description if we can't transform it
    return description;
  }

  /**
   * Generates a new user-friendly payment description for webhook events
   *
   * @param plan - The subscription plan
   * @param billingInterval - The billing interval
   * @param isFailed - Whether this is a failed payment
   * @returns A user-friendly payment description
   *
   * @example
   * generatePaymentDescription('DEVELOPER', 'MONTH', false)
   * Returns: 'Payment for developer plan (monthly)'
   */
  static generatePaymentDescription(
    plan: string,
    billingInterval: string,
    isFailed = false
  ): string {
    const planName = plan.toLowerCase().replace("_", " ");
    const intervalText = billingInterval === "YEAR" ? "yearly" : "monthly";
    const prefix = isFailed ? "Failed" : "Payment";

    return `${prefix} for ${planName} plan (${intervalText})`;
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
      error_message: Error.isError(error) ? error.message : "Unknown error",
      ...Object.fromEntries(
        Object.entries(context).map(([k, v]) => [
          k,
          typeof v === "string" ? v : String(v),
        ])
      ),
    });
  }
}
