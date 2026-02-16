import { TRPCError } from "@trpc/server";

import { getUserResourceCounts } from "@/services/plan/plan.service";
import { StripeService } from "@/services/stripe/stripe.service";

import { config } from "@/config";

import {
  billingRateLimitedProcedure,
  rateLimitedProcedure,
  router,
} from "@/trpc/trpc";

/**
 * Billing router
 * Handles billing overview and portal session creation
 */
export const billingRouter = router({
  /**
   * Get comprehensive billing overview (PROTECTED - BILLING RATE LIMITED)
   */
  getBillingOverview: billingRateLimitedProcedure.query(async ({ ctx }) => {
    const { user, prisma } = ctx;

    try {
      // Get user with subscription
      const userWithSubscription = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          subscription: true,
        },
      });

      if (!userWithSubscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Get workspace for display purposes (use user's current workspace)
      // Note: Users cannot have a subscription without a workspace per business rules.
      // However, we allow users without workspaces to access billing to see their status
      // (which will show no subscription) and to create a workspace.
      const currentWorkspace = user.workspaceId
        ? await prisma.workspace.findUnique({
            where: { id: user.workspaceId },
          })
        : null;

      // Data integrity check: If user has a subscription but no workspace, log a warning
      // This shouldn't happen per business rules, but we don't block the response
      if (userWithSubscription.subscription && !currentWorkspace) {
        ctx.logger.warn(
          {
            userId: user.id,
            subscriptionId: userWithSubscription.subscription.id,
          },
          "User has subscription but no workspace - data integrity issue"
        );
      }

      let stripeSubscription = null;
      let upcomingInvoice = null;
      let paymentMethod = null;

      // Fetch Stripe subscription details if exists
      if (userWithSubscription.stripeSubscriptionId) {
        try {
          stripeSubscription = await StripeService.getSubscription(
            userWithSubscription.stripeSubscriptionId
          );

          // Get upcoming invoice
          if (stripeSubscription && !stripeSubscription.canceled_at) {
            upcomingInvoice = await StripeService.getUpcomingInvoice(
              userWithSubscription.stripeSubscriptionId || ""
            );
          }

          // Get payment method from subscription's default_payment_method
          if (stripeSubscription?.default_payment_method) {
            ctx.logger.info(
              {
                paymentMethodId: stripeSubscription.default_payment_method,
              },
              "Attempting to fetch payment method"
            );

            try {
              const fullPaymentMethod = await StripeService.getPaymentMethod(
                stripeSubscription.default_payment_method as string
              );

              ctx.logger.info(
                {
                  id: fullPaymentMethod.id,
                  type: fullPaymentMethod.type,
                },
                "Payment method fetched successfully"
              );

              // Return only essential payment method data
              paymentMethod = {
                id: fullPaymentMethod.id,
                type: fullPaymentMethod.type,
                card: fullPaymentMethod.card
                  ? {
                      brand: fullPaymentMethod.card.brand,
                      last4: fullPaymentMethod.card.last4,
                      exp_month: fullPaymentMethod.card.exp_month,
                      exp_year: fullPaymentMethod.card.exp_year,
                    }
                  : null,
                billing_details: fullPaymentMethod.billing_details
                  ? {
                      name: fullPaymentMethod.billing_details.name,
                      email: fullPaymentMethod.billing_details.email,
                    }
                  : null,
              };
            } catch (paymentMethodError) {
              ctx.logger.error(
                {
                  error: paymentMethodError,
                  paymentMethodId: stripeSubscription.default_payment_method,
                },
                "Failed to fetch payment method"
              );
              // Continue without payment method data
            }
          } else {
            ctx.logger.warn(
              {
                subscriptionId: stripeSubscription?.id,
                hasDefaultPaymentMethod:
                  !!stripeSubscription?.default_payment_method,
              },
              "No default_payment_method found in subscription"
            );
          }
        } catch (stripeError) {
          ctx.logger.warn({ stripeError }, "Failed to fetch Stripe data");
          // Continue without Stripe data
        }
      }

      // Get recent payments
      const recentPayments = await prisma.payment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          status: true,
          description: true,
          createdAt: true,
        },
      });

      // Get current usage
      const resourceCounts = await getUserResourceCounts(user.id);

      return {
        workspace: currentWorkspace
          ? {
              id: currentWorkspace.id,
              name: currentWorkspace.name,
            }
          : null,
        subscription: userWithSubscription.subscription
          ? {
              id: userWithSubscription.subscription.id,
              status: userWithSubscription.subscription.status,
              stripeCustomerId: userWithSubscription.stripeCustomerId,
              stripeSubscriptionId: userWithSubscription.stripeSubscriptionId,
              plan: userWithSubscription.subscription.plan,
              canceledAt: userWithSubscription.subscription.canceledAt
                ? userWithSubscription.subscription.canceledAt.toISOString()
                : null,
              isRenewalAfterCancel:
                userWithSubscription.subscription.isRenewalAfterCancel,
              previousCancelDate: userWithSubscription.subscription
                .previousCancelDate
                ? userWithSubscription.subscription.previousCancelDate.toISOString()
                : null,
              createdAt:
                userWithSubscription.subscription.createdAt.toISOString(),
              updatedAt:
                userWithSubscription.subscription.updatedAt.toISOString(),
            }
          : null,
        stripeSubscription: stripeSubscription
          ? {
              id: stripeSubscription.id,
              status: stripeSubscription.status,
              current_period_start:
                stripeSubscription.items?.data?.[0]?.current_period_start,
              current_period_end:
                stripeSubscription.items?.data?.[0]?.current_period_end,
              cancel_at_period_end: stripeSubscription.cancel_at_period_end,
              canceled_at: stripeSubscription.canceled_at,
              default_payment_method: stripeSubscription.default_payment_method,
              currency: stripeSubscription.currency,
              // Maintain frontend compatibility with items structure
              items: stripeSubscription.items
                ? {
                    data: stripeSubscription.items.data.map((item) => ({
                      price: {
                        id: item.price.id,
                        unit_amount: item.price.unit_amount,
                        currency: item.price.currency,
                        recurring: item.price.recurring
                          ? {
                              interval: item.price.recurring.interval,
                            }
                          : null,
                      },
                    })),
                  }
                : null,
            }
          : null,
        upcomingInvoice,
        paymentMethod,
        currentUsage: {
          servers: resourceCounts.servers,
          users: resourceCounts.users,
          queues: 0, // TODO: Add queue counting when needed
          messagesThisMonth: 0, // TODO: Add message counting when needed
        },
        recentPayments: recentPayments.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          description: StripeService.transformPaymentDescription(
            payment.description,
            userWithSubscription.subscription?.plan || "UNKNOWN",
            userWithSubscription.subscription?.billingInterval || "MONTH"
          ),
          createdAt: payment.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error fetching billing overview");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch billing overview",
      });
    }
  }),

  /**
   * Create billing portal session (PROTECTED)
   */
  createBillingPortalSession: rateLimitedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    try {
      if (!user.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe customer ID found",
        });
      }

      const session = await StripeService.createPortalSession(
        user.stripeCustomerId,
        `${config.FRONTEND_URL}/billing`
      );

      return { url: session.url };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error creating billing portal session");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create billing portal session",
      });
    }
  }),

  /**
   * Create portal session (PROTECTED) - alias for createBillingPortalSession
   */
  createPortalSession: rateLimitedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    try {
      if (!user.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe customer found",
        });
      }

      const session = await StripeService.createPortalSession(
        user.stripeCustomerId,
        `${config.FRONTEND_URL}/billing`
      );

      return { url: session.url };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error creating portal session");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create portal session",
      });
    }
  }),
});
