import { TRPCError } from "@trpc/server";

import { getUserDisplayName } from "@/core/utils";

import { StripeService } from "@/services/stripe/stripe.service";

import { createCheckoutSessionSchema } from "@/schemas/payment";

import { emailConfig } from "@/config";

import { router, strictRateLimitedProcedure } from "@/trpc/trpc";

import { UserPlan } from "@/generated/prisma/client";
import { te } from "@/i18n";

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
          "Creating checkout session"
        );

        // Resolve Stripe customer from Organization (billing authority)
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id },
          select: {
            organization: {
              select: { id: true, stripeCustomerId: true },
            },
          },
        });
        let customerId = membership?.organization?.stripeCustomerId ?? null;
        if (!customerId) {
          const customer = await StripeService.createCustomer({
            email: user.email,
            name: getUserDisplayName(user),
            userId: user.id,
          });
          customerId = customer.id;

          if (membership?.organization) {
            await prisma.organization.update({
              where: { id: membership.organization.id },
              data: { stripeCustomerId: customerId },
            });
          }
        }

        const session = await StripeService.createCheckoutSession({
          userId: user.id,
          plan,
          billingInterval,
          successUrl: `${emailConfig.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${emailConfig.frontendUrl}/payment/cancelled`,
          customerEmail: user.email,
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
});
