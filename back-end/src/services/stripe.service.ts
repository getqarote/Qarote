import Stripe from "stripe";
import { WorkspacePlan } from "@prisma/client";

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
    return await stripe.customers.create({
      email,
      name,
      metadata: {
        workspaceId,
      },
    });
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
    if (plan === WorkspacePlan.FREE) {
      throw new Error("Cannot create checkout session for FREE plan");
    }

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

    return stripe.checkout.sessions.create(sessionParams);
  }

  static async createPortalSession(customerId: string, returnUrl: string) {
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  static async getSubscription(subscriptionId: string) {
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  static async cancelSubscription(subscriptionId: string, atPeriodEnd = true) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    });
  }

  static async updateSubscription(subscriptionId: string, newPriceId: string) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
    });
  }

  static async getPaymentHistory(customerId: string, limit = 100) {
    return stripe.invoices.list({
      customer: customerId,
      limit,
      status: "paid",
    });
  }

  static async constructWebhookEvent(payload: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
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
