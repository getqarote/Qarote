import Stripe from "stripe";

import { logger } from "@/core/logger";

import { CoreStripeService, stripe } from "./core.service";

export class StripeSubscriptionService {
  /**
   * Get a subscription with optional expansion
   */
  static async getSubscription(subscriptionId: string, expand?: string[]) {
    try {
      logger.info({ subscriptionId, expand }, "Retrieving Stripe subscription");

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        ...(expand && { expand }),
      });

      logger.info(
        {
          subscriptionId,
          status: subscription.status,
        },
        "Stripe subscription retrieved successfully"
      );

      return subscription;
    } catch (error) {
      CoreStripeService.logStripeError(error, "get_subscription", {
        subscriptionId,
      });
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
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
      CoreStripeService.setSentryContext("stripe_cancellation", {
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
      CoreStripeService.logStripeError(error, "cancel_subscription", {
        subscriptionId,
        atPeriodEnd,
      });
      throw error;
    }
  }

  /**
   * Cancel subscription with advanced options
   */
  static async cancelSubscriptionAdvanced(
    subscriptionId: string,
    options: {
      cancelImmediately?: boolean;
      reason?: string;
      feedback?: string;
      canceledBy?: string;
    } = {}
  ) {
    try {
      const {
        cancelImmediately = false,
        reason,
        feedback,
        canceledBy,
      } = options;

      logger.info(
        {
          subscriptionId,
          cancelImmediately,
          reason,
        },
        "Canceling Stripe subscription with advanced options"
      );

      const updateParams: Stripe.SubscriptionUpdateParams = {
        cancel_at_period_end: !cancelImmediately,
        metadata: {
          canceled_by: canceledBy || "system",
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || "user_requested",
          user_feedback: feedback || "",
        },
      };

      // If canceling immediately, we need to use a different approach
      if (cancelImmediately) {
        // Cancel immediately by setting cancel_at_period_end to false
        updateParams.cancel_at_period_end = false;
      }

      const subscription = await stripe.subscriptions.update(
        subscriptionId,
        updateParams
      );

      // Set Sentry context for subscription cancellation
      CoreStripeService.setSentryContext("stripe_cancellation_advanced", {
        subscriptionId,
        cancelImmediately,
        reason,
        status: subscription.status,
      });

      logger.info(
        {
          subscriptionId,
          status: subscription.status,
          cancelImmediately,
        },
        "Stripe subscription canceled successfully with advanced options"
      );

      return subscription;
    } catch (error) {
      CoreStripeService.logStripeError(error, "cancel_subscription_advanced", {
        subscriptionId,
        options,
      });
      throw error;
    }
  }

  /**
   * Update subscription to new price
   */
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
      CoreStripeService.setSentryContext("stripe_update", {
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
      CoreStripeService.logStripeError(error, "update_subscription", {
        subscriptionId,
        newPriceId,
      });
      throw error;
    }
  }

  /**
   * Update subscription payment method
   */
  static async updateSubscriptionPaymentMethod(
    subscriptionId: string,
    paymentMethodId: string
  ) {
    try {
      logger.info(
        {
          subscriptionId,
          paymentMethodId,
        },
        "Updating subscription payment method"
      );

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        default_payment_method: paymentMethodId,
      });

      logger.info(
        {
          subscriptionId,
          paymentMethodId,
        },
        "Subscription payment method updated successfully"
      );

      return subscription;
    } catch (error) {
      CoreStripeService.logStripeError(
        error,
        "update_subscription_payment_method",
        {
          subscriptionId,
          paymentMethodId,
        }
      );
      throw error;
    }
  }
}
