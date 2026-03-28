import { TRPCError } from "@trpc/server";
import type Stripe from "stripe";

import type { logger as appLogger } from "@/core/logger";

import { getOrgResourceCounts } from "@/services/plan/plan.service";
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
        // Use pre-resolved organization from context
        if (!ctx.organizationId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "billing.noOrganization"),
          });
        }

        // Phase 1: Parallel DB queries — all scoped to the current organization
        const [
          orgSubscription,
          currentWorkspace,
          recentPayments,
          resourceCounts,
          org,
        ] = await Promise.all([
          prisma.subscription.findUnique({
            where: { organizationId: ctx.organizationId },
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
          getOrgResourceCounts(ctx.organizationId),
          prisma.organization.findUnique({
            where: { id: ctx.organizationId },
            select: {
              stripeCustomerId: true,
              stripeSubscriptionId: true,
            },
          }),
        ]);

        // Data integrity check: subscription exists but no workspace
        if (orgSubscription && !currentWorkspace) {
          ctx.logger.warn(
            {
              userId: user.id,
              organizationId: ctx.organizationId,
              subscriptionId: orgSubscription.id,
            },
            "Organization has subscription but user has no workspace"
          );
        }

        const orgStripeCustomerId = org?.stripeCustomerId ?? null;
        const orgStripeSubscriptionId = org?.stripeSubscriptionId ?? null;

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
          subscription: orgSubscription
            ? {
                id: orgSubscription.id,
                status: orgSubscription.status,
                stripeCustomerId: orgStripeCustomerId,
                stripeSubscriptionId: orgStripeSubscriptionId,
                plan: orgSubscription.plan,
                canceledAt: orgSubscription.canceledAt
                  ? orgSubscription.canceledAt.toISOString()
                  : null,
                isRenewalAfterCancel: orgSubscription.isRenewalAfterCancel,
                previousCancelDate: orgSubscription.previousCancelDate
                  ? orgSubscription.previousCancelDate.toISOString()
                  : null,
                trialStart: orgSubscription.trialStart
                  ? orgSubscription.trialStart.toISOString()
                  : null,
                trialEnd: orgSubscription.trialEnd
                  ? orgSubscription.trialEnd.toISOString()
                  : null,
                createdAt: orgSubscription.createdAt.toISOString(),
                updatedAt: orgSubscription.updatedAt.toISOString(),
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
              orgSubscription?.plan || "UNKNOWN",
              orgSubscription?.billingInterval || "MONTH"
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
      const { prisma } = ctx;

      try {
        if (!ctx.organizationId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "billing.noOrganization"),
          });
        }

        const org = await prisma.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { stripeCustomerId: true },
        });
        const stripeCustomerId = org?.stripeCustomerId ?? null;

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
    const { prisma } = ctx;

    try {
      if (!ctx.organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "billing.noOrganization"),
        });
      }

      const org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { stripeCustomerId: true },
      });
      const stripeCustomerId = org?.stripeCustomerId ?? null;

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
