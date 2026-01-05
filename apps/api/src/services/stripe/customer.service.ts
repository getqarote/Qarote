import { UserPlan } from "@prisma/client";
import Stripe from "stripe";

import { logger } from "@/core/logger";
import { retryWithBackoff } from "@/core/retry";

import {
  CoreStripeService,
  CreateCheckoutSessionParams,
  CreateCustomerParams,
  stripe,
  STRIPE_PRICE_IDS,
} from "./core.service";

export class StripeCustomerService {
  /**
   * Create a new Stripe customer
   */
  static async createCustomer({ email, name, userId }: CreateCustomerParams) {
    try {
      logger.info({ email, userId }, "Creating Stripe customer");

      const customer = await retryWithBackoff(
        () =>
          stripe.customers.create({
            email,
            name,
            metadata: {
              userId,
            },
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      // Set Sentry context for payment tracking
      CoreStripeService.setSentryContext("stripe_customer", {
        customerId: customer.id,
        email: customer.email,
        userId,
      });

      logger.info(
        {
          customerId: customer.id,
          userId,
        },
        "Stripe customer created successfully"
      );

      return customer;
    } catch (error) {
      CoreStripeService.logStripeError(error, "create_customer", {
        email,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create a billing portal session
   */
  static async createPortalSession(customerId: string, returnUrl: string) {
    try {
      logger.info({ customerId }, "Creating Stripe portal session");

      const session = await retryWithBackoff(
        () =>
          stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      logger.info(
        {
          sessionId: session.id,
          customerId,
        },
        "Stripe portal session created successfully"
      );

      return session;
    } catch (error) {
      CoreStripeService.logStripeError(error, "create_portal_session", {
        customerId,
      });
      throw error;
    }
  }

  /**
   * Create a checkout session
   */
  static async createCheckoutSession({
    userId,
    plan,
    billingInterval,
    successUrl,
    cancelUrl,
    customerEmail,
    trialDays,
  }: CreateCheckoutSessionParams) {
    try {
      if (plan === UserPlan.FREE) {
        throw new Error("Cannot create checkout session for FREE plan");
      }

      logger.info(
        {
          userId,
          plan,
          billingInterval,
          customerEmail,
        },
        "Creating Stripe checkout session"
      );

      if (!STRIPE_PRICE_IDS) {
        throw new Error(
          "Stripe is not configured. STRIPE_PRICE_IDS are required for creating checkout sessions."
        );
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
          userId,
          plan,
          billingInterval,
          ...(trialDays && { trialDays: trialDays.toString() }),
        },
        subscription_data: {
          metadata: {
            userId,
            plan,
            billingInterval,
            ...(trialDays && { trialDays: trialDays.toString() }),
          },
          // Add trial period for early access users
          ...(trialDays && { trial_period_days: trialDays }),
        },
        allow_promotion_codes: true,
      };

      // Add customer email if provided
      if (customerEmail) {
        sessionParams.customer_email = customerEmail;
      }

      const session = await retryWithBackoff(
        () => stripe.checkout.sessions.create(sessionParams),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      // Set Sentry context for checkout tracking
      CoreStripeService.setSentryContext("stripe_checkout", {
        sessionId: session.id,
        userId,
        plan,
        billingInterval,
        priceId,
      });

      logger.info(
        {
          sessionId: session.id,
          userId,
          plan,
        },
        "Stripe checkout session created successfully"
      );

      return session;
    } catch (error) {
      CoreStripeService.logStripeError(error, "create_checkout_session", {
        userId,
        plan,
        billingInterval,
        customerEmail,
      });
      throw error;
    }
  }
}
