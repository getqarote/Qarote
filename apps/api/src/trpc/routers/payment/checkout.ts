import { UserPlan } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { getUserDisplayName } from "@/core/utils";

import { StripeService } from "@/services/stripe/stripe.service";

import { createCheckoutSessionSchema } from "@/schemas/payment";

import { emailConfig } from "@/config";

import { router, strictRateLimitedProcedure } from "@/trpc/trpc";

/**
 * Checkout router
 * Handles Stripe checkout session creation
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
          message: "Cannot create checkout for FREE plan",
        });
      }

      try {
        ctx.logger.info(
          {
            userId: user.id,
            plan,
            billingInterval,
          },
          "Creating checkout session with 30-day trial"
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

        // Create checkout session with 30-day trial
        const session = await StripeService.createCheckoutSession({
          userId: user.id,
          plan,
          billingInterval,
          successUrl: `${emailConfig.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${emailConfig.frontendUrl}/payment/cancelled`,
          customerEmail: user.email,
          // Automatically give 30-day trial to all users during early access period
          trialDays: 30,
        });

        return { url: session.url };
      } catch (error) {
        ctx.logger.error({ error }, "Error creating checkout session");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }
    }),
});
