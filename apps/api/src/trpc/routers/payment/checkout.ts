import { TRPCError } from "@trpc/server";

import { getUserDisplayName } from "@/core/utils";

import { EmailService } from "@/services/email/email.service";
import { CoreStripeService } from "@/services/stripe/core.service";
import { StripeService } from "@/services/stripe/stripe.service";

import { createCheckoutSessionSchema } from "@/schemas/payment";

import { emailConfig } from "@/config";

import { router, strictRateLimitedProcedure } from "@/trpc/trpc";

import {
  BillingInterval,
  SubscriptionStatus,
  UserPlan,
} from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Checkout router
 * Handles Stripe checkout session creation and direct trial starts
 */
export const checkoutRouter = router({
  /**
   * Create checkout session for subscription (PROTECTED - STRICT RATE LIMITED)
   */
  createCheckoutSession: strictRateLimitedProcedure
    .input(createCheckoutSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const { plan, billingInterval } = input;
      const { user, prisma } = ctx;

      if (plan === UserPlan.FREE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "billing.cannotCheckoutFreePlan"),
        });
      }

      try {
        ctx.logger.info(
          {
            userId: user.id,
            plan,
            billingInterval,
          },
          "Creating checkout session with 14-day trial"
        );

        // Create Stripe customer if not exists
        let customerId = user.stripeCustomerId;
        if (!customerId) {
          const customer = await StripeService.createCustomer({
            email: user.email,
            name: getUserDisplayName(user),
            userId: user.id,
          });
          customerId = customer.id;

          // Update user with customer ID
          await prisma.user.update({
            where: { id: user.id },
            data: { stripeCustomerId: customerId },
          });
        }

        // Create checkout session with 14-day trial
        const session = await StripeService.createCheckoutSession({
          userId: user.id,
          plan,
          billingInterval,
          successUrl: `${emailConfig.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${emailConfig.frontendUrl}/payment/cancelled`,
          customerEmail: user.email,
          // Automatically give 14-day trial to all users during early access period
          trialDays: 14,
        });

        return { url: session.url };
      } catch (error) {
        ctx.logger.error({ error }, "Error creating checkout session");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "billing.failedToCreateCheckoutSession"),
        });
      }
    }),

  /**
   * Start a free trial directly — no Stripe Checkout page, no card required.
   * Creates a Stripe customer + subscription with trial, and saves to DB.
   */
  startTrial: strictRateLimitedProcedure.mutation(async ({ ctx }) => {
    const { user, prisma } = ctx;

    try {
      // Check for existing subscription before provisioning
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
      });

      if (existingSubscription) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "billing.alreadyHasSubscription"),
        });
      }

      ctx.logger.info({ userId: user.id }, "Starting free trial");

      const dbSubscription = await StripeService.provisionTrialForNewUser({
        userId: user.id,
        email: user.email,
        name: getUserDisplayName(user),
        prisma,
      });

      if (!dbSubscription) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "billing.failedToStartTrial"),
        });
      }

      // Send welcome email (non-critical)
      const emailResult = await EmailService.sendUpgradeConfirmationEmail({
        to: user.email,
        userName: getUserDisplayName(user),
        workspaceName: te(ctx.locale, "billing.allWorkspaces"),
        plan: UserPlan.ENTERPRISE,
        billingInterval: CoreStripeService.mapBillingIntervalToString(
          BillingInterval.MONTH
        ),
      });

      if (!emailResult.success) {
        ctx.logger.warn(
          {
            email: user.email,
            error: emailResult.error,
            method: "EmailService.sendUpgradeConfirmationEmail",
          },
          "Failed to send trial welcome email"
        );
      }

      ctx.logger.info(
        {
          userId: user.id,
          subscriptionId: dbSubscription.stripeSubscriptionId,
          trialEnd: dbSubscription.trialEnd,
        },
        "Free trial started successfully"
      );

      return { success: true };
    } catch (error) {
      // Re-throw TRPCErrors (e.g. alreadyHasSubscription) as-is
      if (error instanceof TRPCError) throw error;
      ctx.logger.error({ error }, "Error starting free trial");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "billing.failedToStartTrial"),
      });
    }
  }),
});
