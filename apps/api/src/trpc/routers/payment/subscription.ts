import { TRPCError } from "@trpc/server";

import { CoreStripeService } from "@/services/stripe/core.service";
import { StripeService } from "@/services/stripe/stripe.service";

import {
  cancelSubscriptionSchema,
  renewSubscriptionSchema,
} from "@/schemas/payment";

import { config } from "@/config";

import { router, strictRateLimitedProcedure } from "@/trpc/trpc";

/**
 * Subscription router
 * Handles subscription cancellation and renewal
 */
export const subscriptionRouter = router({
  /**
   * Cancel subscription (PROTECTED - STRICT RATE LIMITED)
   */
  cancelSubscription: strictRateLimitedProcedure
    .input(cancelSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      const { cancelImmediately = false, reason = "", feedback = "" } = input;
      const { user, prisma } = ctx;

      try {
        if (!user.stripeSubscriptionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active subscription found",
          });
        }

        const subscription = await StripeService.cancelSubscription(
          user.stripeSubscriptionId,
          cancelImmediately
        );

        // Update subscription in database
        await prisma.subscription.update({
          where: { userId: user.id },
          data: {
            status: CoreStripeService.mapStripeStatusToSubscriptionStatus(
              subscription.status
            ),
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });

        // Log cancellation reason and feedback
        if (reason || feedback) {
          // TODO: Create subscriptionCancellation table if needed
          ctx.logger.info(
            {
              userId: user.id,
              reason,
              feedback,
            },
            "Subscription cancellation feedback"
          );
        }

        return {
          success: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
          },
          message: cancelImmediately
            ? "Subscription canceled immediately"
            : "Subscription will be canceled at the end of the current period",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error canceling subscription");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel subscription",
        });
      }
    }),

  /**
   * Renew subscription (PROTECTED - STRICT RATE LIMITED)
   */
  renewSubscription: strictRateLimitedProcedure
    .input(renewSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      const { plan, interval = "monthly" } = input;
      const { user } = ctx;

      try {
        if (!plan) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Plan is required",
          });
        }

        const checkoutSession = await StripeService.createCheckoutSession({
          userId: user.id,
          plan,
          billingInterval: interval,
          successUrl: `${config.FRONTEND_URL}/payment/success`,
          cancelUrl: `${config.FRONTEND_URL}/payment/cancelled`,
          customerEmail: user.email,
        });

        return { url: checkoutSession.url };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error renewing subscription");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to renew subscription",
        });
      }
    }),
});
