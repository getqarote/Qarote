import { TRPCError } from "@trpc/server";

import { CoreStripeService } from "@/services/stripe/core.service";
import { StripeService } from "@/services/stripe/stripe.service";

import {
  cancelSubscriptionSchema,
  renewSubscriptionSchema,
} from "@/schemas/payment";

import { config } from "@/config";

import { router, strictRateLimitedAdminProcedure } from "@/trpc/trpc";

import { OrgRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Subscription router
 * Handles subscription cancellation and renewal
 */
export const subscriptionRouter = router({
  /**
   * Cancel subscription (PROTECTED - STRICT RATE LIMITED)
   */
  cancelSubscription: strictRateLimitedAdminProcedure
    .input(cancelSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      const { cancelImmediately = false, reason = "", feedback = "" } = input;
      const { user, prisma } = ctx;

      try {
        // Resolve subscription ID from Organization via active workspace
        const workspace = user.workspaceId
          ? await prisma.workspace.findUnique({
              where: { id: user.workspaceId },
              select: {
                organizationId: true,
                organization: {
                  select: { stripeSubscriptionId: true },
                },
              },
            })
          : null;
        const subscriptionId =
          workspace?.organization?.stripeSubscriptionId ?? null;

        if (!subscriptionId || !workspace?.organizationId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "billing.noActiveSubscription"),
          });
        }

        // Verify caller is OWNER or ADMIN of the organization
        const membership = await prisma.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: workspace.organizationId,
            },
          },
          select: { role: true },
        });

        if (
          !membership ||
          (membership.role !== OrgRole.OWNER &&
            membership.role !== OrgRole.ADMIN)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: te(ctx.locale, "auth.orgAdminRequired"),
          });
        }

        const subscription = await StripeService.cancelSubscription(
          subscriptionId,
          !cancelImmediately
        );

        // Update subscription in database
        await prisma.subscription.update({
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
  renewSubscription: strictRateLimitedAdminProcedure
    .input(renewSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      const { plan, interval = "monthly" } = input;
      const { user } = ctx;

      try {
        if (!plan) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "billing.planRequired"),
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
          message: te(ctx.locale, "billing.failedToRenewSubscription"),
        });
      }
    }),
});
