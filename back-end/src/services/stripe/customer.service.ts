import Stripe from "stripe";
import { WorkspacePlan } from "@prisma/client";
import { logger } from "@/core/logger";
import {
  stripe,
  CreateCustomerParams,
  CreateCheckoutSessionParams,
  STRIPE_PRICE_IDS,
  CoreStripeService,
} from "./core.service";

export class StripeCustomerService {
  /**
   * Create a new Stripe customer
   */
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
      CoreStripeService.setSentryContext("stripe_customer", {
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
      CoreStripeService.logStripeError(error, "create_customer", {
        email,
        workspaceId,
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
    workspaceId,
    plan,
    billingInterval,
    successUrl,
    cancelUrl,
    customerEmail,
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
      CoreStripeService.setSentryContext("stripe_checkout", {
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
      CoreStripeService.logStripeError(error, "create_checkout_session", {
        workspaceId,
        plan,
        billingInterval,
        customerEmail,
      });
      throw error;
    }
  }
}
