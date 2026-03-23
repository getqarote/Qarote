import { TRPCError } from "@trpc/server";
import type Stripe from "stripe";

import type { logger as appLogger } from "@/core/logger";

import { getUserResourceCounts } from "@/services/plan/plan.service";
import { StripeService } from "@/services/stripe/stripe.service";

import { config } from "@/config";

import {
  billingRateLimitedAdminProcedure,
  rateLimitedAdminProcedure,
  router,
} from "@/trpc/trpc";

import { te } from "@/i18n";

/**
 * Extract a payment method ID from a field that may be a string ID or an expanded PaymentMethod object.
 */
function extractPaymentMethodId(
  field: string | Stripe.PaymentMethod | null | undefined
): string | null {
  if (!field) return null;
  if (typeof field === "string") return field;
  return field.id;
}

/**
 * Resolve payment method from Stripe subscription, falling back to customer default.
 * During trials, Stripe often sets the payment method on the customer, not the subscription.
 */
async function resolvePaymentMethod(
  stripeSubscription: Stripe.Subscription,
  stripeCustomerId: string | null,
  log: typeof appLogger
) {
  let paymentMethodId = extractPaymentMethodId(
    stripeSubscription.default_payment_method
  );

  if (!paymentMethodId && stripeCustomerId) {
    try {
      const customer = await StripeService.getCustomer(stripeCustomerId);
      if (
        customer &&
        !customer.deleted &&
        customer.invoice_settings?.default_payment_method
      ) {
        paymentMethodId = extractPaymentMethodId(
          customer.invoice_settings.default_payment_method
        );
      }
    } catch (customerError) {
      log.warn(
        { error: customerError },
        "Failed to fetch customer for payment method fallback"
      );
    }
  }

  if (!paymentMethodId) return null;

  try {
    const fullPaymentMethod =
      await StripeService.getPaymentMethod(paymentMethodId);

    return {
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
    log.error(
      { error: paymentMethodError, paymentMethodId },
      "Failed to fetch payment method"
    );
    return null;
  }
}

/**
 * Billing router
 * Handles billing overview and portal session creation
 */
export const billingRouter = router({
  /**
   * Get comprehensive billing overview (PROTECTED - ADMIN ONLY, BILLING RATE LIMITED)
   */
  getBillingOverview: billingRateLimitedAdminProcedure.query(
    async ({ ctx }) => {
      const { user, prisma } = ctx;

      try {
        // Phase 1: Parallel DB queries
        const [
          userWithSubscription,
          currentWorkspace,
          recentPayments,
          resourceCounts,
          membership,
        ] = await Promise.all([
          prisma.user.findUnique({
            where: { id: user.id },
            include: { subscription: true },
          }),
          user.workspaceId
            ? prisma.workspace.findUnique({ where: { id: user.workspaceId } })
            : Promise.resolve(null),
          prisma.payment.findMany({
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
          }),
          getUserResourceCounts(user.id),
          // Resolve Stripe IDs from Organization (billing authority)
          prisma.organizationMember.findFirst({
            where: { userId: user.id },
            select: {
              organization: {
                select: {
                  stripeCustomerId: true,
                  stripeSubscriptionId: true,
                },
              },
            },
          }),
        ]);

        if (!userWithSubscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.userNotFound"),
          });
        }

        // Data integrity check: If user has a subscription but no workspace, log a warning
        if (userWithSubscription.subscription && !currentWorkspace) {
          ctx.logger.warn(
            {
              userId: user.id,
              subscriptionId: userWithSubscription.subscription.id,
            },
            "User has subscription but no workspace - data integrity issue"
          );
        }

        const orgStripeCustomerId =
          membership?.organization?.stripeCustomerId ?? null;
        const orgStripeSubscriptionId =
          membership?.organization?.stripeSubscriptionId ?? null;

        let stripeSubscription: Stripe.Subscription | null = null;
        let upcomingInvoice = null;
        let paymentMethod: Awaited<ReturnType<typeof resolvePaymentMethod>> =
          null;

        // Phase 2: Fetch Stripe subscription (gateway to all other Stripe calls)
        if (orgStripeSubscriptionId) {
          try {
            stripeSubscription = await StripeService.getSubscription(
              orgStripeSubscriptionId
            );
          } catch (stripeError) {
            ctx.logger.warn(
              { error: stripeError },
              "Failed to fetch Stripe subscription"
            );
          }
          // Phase 3: Parallel Stripe calls — upcoming invoice + payment method resolution
          if (stripeSubscription) {
            const [invoiceResult, paymentMethodResult] =
              await Promise.allSettled([
                !stripeSubscription.canceled_at
                  ? StripeService.getUpcomingInvoice(orgStripeSubscriptionId!)
                  : Promise.resolve(null),
                resolvePaymentMethod(
                  stripeSubscription,
                  orgStripeCustomerId,
                  ctx.logger
                ),
              ]);

            if (invoiceResult.status === "fulfilled") {
              upcomingInvoice = invoiceResult.value;
            } else {
              ctx.logger.warn(
                { error: invoiceResult.reason },
                "Failed to fetch upcoming invoice"
              );
            }

            if (paymentMethodResult.status === "fulfilled") {
              paymentMethod = paymentMethodResult.value;
            } else {
              ctx.logger.warn(
                { error: paymentMethodResult.reason },
                "Failed to resolve payment method"
              );
            }
          }
        }

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
                stripeCustomerId: orgStripeCustomerId,
                stripeSubscriptionId: orgStripeSubscriptionId,
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
                trialStart: userWithSubscription.subscription.trialStart
                  ? userWithSubscription.subscription.trialStart.toISOString()
                  : null,
                trialEnd: userWithSubscription.subscription.trialEnd
                  ? userWithSubscription.subscription.trialEnd.toISOString()
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
                default_payment_method:
                  stripeSubscription.default_payment_method,
                currency: stripeSubscription.currency,
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
            queues: 0,
            messagesThisMonth: 0,
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
          message: te(ctx.locale, "billing.failedToFetchBillingOverview"),
        });
      }
    }
  ),

  /**
   * Create billing portal session (PROTECTED - ADMIN ONLY)
   */
  createBillingPortalSession: rateLimitedAdminProcedure.mutation(
    async ({ ctx }) => {
      const { user, prisma } = ctx;

      try {
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id },
          select: {
            organization: {
              select: { stripeCustomerId: true },
            },
          },
        });
        const stripeCustomerId =
          membership?.organization?.stripeCustomerId ?? null;

        if (!stripeCustomerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "billing.noStripeCustomerId"),
          });
        }

        const session = await StripeService.createPortalSession(
          stripeCustomerId,
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
          message: te(ctx.locale, "billing.failedToCreateBillingPortal"),
        });
      }
    }
  ),

  /**
   * Create portal session (PROTECTED - ADMIN ONLY) - alias for createBillingPortalSession
   */
  createPortalSession: rateLimitedAdminProcedure.mutation(async ({ ctx }) => {
    const { user, prisma } = ctx;

    try {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        select: {
          organization: {
            select: { stripeCustomerId: true },
          },
        },
      });
      const stripeCustomerId =
        membership?.organization?.stripeCustomerId ?? null;

      if (!stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "billing.noStripeCustomerFound"),
        });
      }

      const session = await StripeService.createPortalSession(
        stripeCustomerId,
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
        message: te(ctx.locale, "billing.failedToCreatePortalSession"),
      });
    }
  }),
});
