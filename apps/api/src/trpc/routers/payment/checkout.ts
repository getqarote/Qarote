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

        // Resolve Organization deterministically via the user's active workspace
        const workspace = user.workspaceId
          ? await prisma.workspace.findUnique({
              where: { id: user.workspaceId },
              select: {
                organization: {
                  select: { id: true, stripeCustomerId: true },
                },
              },
            })
          : null;

        const org = workspace?.organization ?? null;
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
        if (error instanceof TRPCError) throw error;
        ctx.logger.error({ error }, "Error creating checkout session");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "billing.failedToCreateCheckoutSession"),
        });
      }
    }),
});
