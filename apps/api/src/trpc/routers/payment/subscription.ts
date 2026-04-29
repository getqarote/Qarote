import { TRPCError } from "@trpc/server";

import { getUserDisplayName } from "@/core/utils";

import { posthog } from "@/services/posthog";
import { CoreStripeService } from "@/services/stripe/core.service";
import { StripeService } from "@/services/stripe/stripe.service";

import {
  cancelSubscriptionSchema,
  renewSubscriptionSchema,
} from "@/schemas/payment";

import { config } from "@/config";

import { router, strictRateLimitedOrgAdminProcedure } from "@/trpc/trpc";

import { te } from "@/i18n";

/**
 * Subscription router
 * Handles subscription cancellation and renewal
 */
export const subscriptionRouter = router({
  /**
   * Cancel subscription (PROTECTED - STRICT RATE LIMITED)
   */
  cancelSubscription: strictRateLimitedOrgAdminProcedure
    .input(cancelSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      const { cancelImmediately = false, reason = "", feedback = "" } = input;
      const { user, prisma } = ctx;

      try {
        const org = await prisma.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { stripeSubscriptionId: true },
        });

        const subscriptionId = org?.stripeSubscriptionId ?? null;

        if (!subscriptionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "billing.noActiveSubscription"),
          });
        }

        const subscription = await StripeService.cancelSubscription(
          subscriptionId,
          !cancelImmediately
        );

        // Update subscription in database (use updateMany to avoid throwing
        // if the local row is missing — Stripe cancel already succeeded)
        const { count } = await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
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

        if (count === 0) {
          ctx.logger.warn(
            { stripeSubscriptionId: subscriptionId },
            "Local subscription row not found after Stripe cancel — will sync on next webhook"
          );
        }

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

        try {
          posthog?.capture({
            distinctId: user.id,
            event: "subscription_canceled",
            properties: {
              organization_id: ctx.organizationId,
              cancel_immediately: cancelImmediately,
              reason: reason || null,
              has_feedback: !!feedback,
            },
          });
        } catch (analyticsError) {
          ctx.logger.warn(
            { error: analyticsError, userId: user.id },
            "PostHog capture failed"
          );
        }

        return {
          success: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: subscription.items?.data?.[0]?.current_period_end
              ? new Date(
                  subscription.items.data[0].current_period_end * 1000
                ).toISOString()
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
          message: te(ctx.locale, "billing.failedToCancelSubscription"),
        });
      }
    }),

  /**
   * Renew subscription (PROTECTED - STRICT RATE LIMITED)
   */
  renewSubscription: strictRateLimitedOrgAdminProcedure
    .input(renewSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      const { plan, interval = "monthly" } = input;
      const { user, prisma } = ctx;

      try {
        if (!plan) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "billing.planRequired"),
          });
        }

        // Resolve (or create) the org's Stripe customer
        const org = await prisma.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { id: true, stripeCustomerId: true },
        });

        if (!org) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "billing.noOrganization"),
          });
        }

        let customerId = org.stripeCustomerId;
        if (!customerId) {
          const customer = await StripeService.createCustomer({
            email: user.email,
            name: getUserDisplayName(user),
            userId: user.id,
          });
          customerId = customer.id;

          await prisma.organization.update({
            where: { id: org.id },
            data: { stripeCustomerId: customerId },
          });
        }

        const checkoutSession = await StripeService.createCheckoutSession({
          userId: user.id,
          plan,
          billingInterval: interval,
          successUrl: `${config.FRONTEND_URL}/payment/success`,
          cancelUrl: `${config.FRONTEND_URL}/payment/cancelled`,
          customerId,
        });

        try {
          posthog?.capture({
            distinctId: user.id,
            event: "subscription_renewal_initiated",
            properties: {
              plan,
              billing_interval: interval,
              organization_id: ctx.organizationId,
            },
          });
        } catch (analyticsError) {
          ctx.logger.warn(
            { error: analyticsError, userId: user.id },
            "PostHog capture failed"
          );
        }

        return { url: checkoutSession.url };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error renewing subscription");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "billing.failedToRenewSubscription"),
        });
      }
    }),
});
