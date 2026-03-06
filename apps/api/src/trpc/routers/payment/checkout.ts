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
    const plan = UserPlan.ENTERPRISE;
    const billingInterval = "monthly";
    const trialDays = 14;

    // Check if user already has an active subscription
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

    try {
      ctx.logger.info(
        { userId: user.id, plan, trialDays },
        "Starting free trial"
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

        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Create subscription directly via Stripe API (no checkout page)
      const subscription = await StripeService.createTrialSubscription({
        customerId,
        plan,
        billingInterval,
        trialDays,
        userId: user.id,
      });

      // Update user with subscription ID
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeSubscriptionId: subscription.id,
        },
      });

      // Get period dates from subscription items
      const firstItem = subscription.items?.data?.[0];
      const currentPeriodStart = firstItem?.current_period_start
        ? new Date(firstItem.current_period_start * 1000)
        : new Date();
      const currentPeriodEnd = firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Create subscription record in DB
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeSubscriptionId: subscription.id,
          stripePriceId: firstItem?.price?.id || "",
          stripeCustomerId: customerId,
          plan,
          status: SubscriptionStatus.TRIALING,
          billingInterval:
            CoreStripeService.mapStripeBillingIntervalToBillingInterval(
              billingInterval
            ),
          pricePerMonth: firstItem?.price?.unit_amount || 0,
          currentPeriodStart,
          currentPeriodEnd,
          trialStart: subscription.trial_start
            ? new Date(subscription.trial_start * 1000)
            : new Date(),
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
        },
      });

      // Send welcome email
      await EmailService.sendUpgradeConfirmationEmail({
        to: user.email,
        userName: getUserDisplayName(user),
        workspaceName: "your workspaces",
        plan,
        billingInterval: CoreStripeService.mapBillingIntervalToString(
          BillingInterval.MONTH
        ),
      });

      ctx.logger.info(
        {
          userId: user.id,
          subscriptionId: subscription.id,
          plan,
          trialEnd: subscription.trial_end,
        },
        "Free trial started successfully"
      );

      return { success: true };
    } catch (error) {
      ctx.logger.error({ error }, "Error starting free trial");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "billing.failedToStartTrial"),
      });
    }
  }),
});
