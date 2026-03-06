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
    const billingInterval = "monthly" as const;
    const trialDays = 14;

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

      // Use a transaction to prevent race conditions:
      // Re-check subscription inside the transaction before creating
      const dbSubscription = await prisma.$transaction(async (tx) => {
        const existingSubscription = await tx.subscription.findFirst({
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

        // Create subscription via Stripe API with idempotency key
        const idempotencyKey = `start_trial_${user.id}`;
        const subscription = await StripeService.createTrialSubscription({
          customerId: customerId!,
          plan,
          billingInterval,
          trialDays,
          userId: user.id,
          idempotencyKey,
        });

        // Update user with subscription ID
        await tx.user.update({
          where: { id: user.id },
          data: { stripeSubscriptionId: subscription.id },
        });

        // Get period dates from subscription items
        const firstItem = subscription.items?.data?.[0];
        const currentPeriodStart = firstItem?.current_period_start
          ? new Date(firstItem.current_period_start * 1000)
          : new Date();
        const currentPeriodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000)
          : new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

        // Create subscription record in DB
        return tx.subscription.create({
          data: {
            userId: user.id,
            stripeSubscriptionId: subscription.id,
            stripePriceId: firstItem?.price?.id || "",
            stripeCustomerId: customerId!,
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
      });

      // Send welcome email (outside transaction — non-critical)
      const emailResult = await EmailService.sendUpgradeConfirmationEmail({
        to: user.email,
        userName: getUserDisplayName(user),
        workspaceName: te(ctx.locale, "billing.allWorkspaces"),
        plan,
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
          plan,
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
