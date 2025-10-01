import { Hono } from "hono";
import { authenticate } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { StripeService } from "@/services/stripe/stripe.service";
import { strictRateLimiter, billingRateLimiter } from "@/middlewares/security";
import { getUserResourceCounts } from "@/services/plan/plan.service";
import { config } from "@/config";
import { mapStripeStatusToSubscriptionStatus } from "./webhook-handlers";
import { transformPaymentDescription } from "@/utils/payment-description.utils";

const billingController = new Hono();

billingController.use("*", authenticate);

// Get comprehensive billing overview - use more lenient rate limiting
billingController.get("/billing/overview", billingRateLimiter, async (c) => {
  const user = c.get("user");

  try {
    // Get user with subscription
    const userWithSubscription = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscription: true,
      },
    });

    if (!userWithSubscription) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get user's current workspace for display purposes
    const currentWorkspace = user.workspaceId
      ? await prisma.workspace.findUnique({
          where: { id: user.workspaceId },
        })
      : null;

    if (!currentWorkspace) {
      return c.json({ error: "No workspace assigned" }, 400);
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
          logger.info(
            {
              paymentMethodId: stripeSubscription.default_payment_method,
            },
            "Attempting to fetch payment method"
          );

          try {
            const fullPaymentMethod = await StripeService.getPaymentMethod(
              stripeSubscription.default_payment_method as string
            );

            logger.info(
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
            logger.error(
              {
                error: paymentMethodError,
                paymentMethodId: stripeSubscription.default_payment_method,
              },
              "Failed to fetch payment method"
            );
            // Continue without payment method data
          }
        } else {
          logger.warn(
            {
              subscriptionId: stripeSubscription?.id,
              hasDefaultPaymentMethod:
                !!stripeSubscription?.default_payment_method,
            },
            "No default_payment_method found in subscription"
          );
        }
      } catch (stripeError) {
        logger.warn({ stripeError }, "Failed to fetch Stripe data");
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

    const response = {
      workspace: {
        id: currentWorkspace.id,
        name: currentWorkspace.name,
      },
      subscription: userWithSubscription.subscription
        ? {
            id: userWithSubscription.subscription.id,
            status: userWithSubscription.subscription.status,
            stripeCustomerId: userWithSubscription.stripeCustomerId,
            stripeSubscriptionId: userWithSubscription.stripeSubscriptionId,
            plan: userWithSubscription.subscription.plan,
            canceledAt: userWithSubscription.subscription.canceledAt,
            isRenewalAfterCancel:
              userWithSubscription.subscription.isRenewalAfterCancel,
            previousCancelDate:
              userWithSubscription.subscription.previousCancelDate,
            createdAt: userWithSubscription.subscription.createdAt,
            updatedAt: userWithSubscription.subscription.updatedAt,
          }
        : null,
      stripeSubscription: stripeSubscription
        ? {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            current_period_start: stripeSubscription.current_period_start,
            current_period_end: stripeSubscription.current_period_end,
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
        description: transformPaymentDescription(
          payment.description,
          userWithSubscription.subscription?.plan || "UNKNOWN",
          userWithSubscription.subscription?.billingInterval || "MONTH"
        ),
        createdAt: payment.createdAt.toISOString(),
      })),
    };

    return c.json(response);
  } catch (error) {
    logger.error({ error }, "Error fetching billing overview");
    return c.json({ error: "Internal server error" }, 500);
  }
});

// All other billing endpoints use strict rate limiting
billingController.use("*", strictRateLimiter);

// Create billing portal session
billingController.post("/billing/portal", async (c) => {
  const user = c.get("user");

  try {
    if (!user.stripeCustomerId) {
      return c.json({ error: "No Stripe customer ID found" }, 400);
    }

    const session = await StripeService.createPortalSession(
      user.stripeCustomerId,
      `${config.FRONTEND_URL}/billing`
    );

    return c.json({ url: session.url });
  } catch (error) {
    logger.error({ error }, "Error creating billing portal session");
    return c.json({ error: "Failed to create billing portal session" }, 500);
  }
});

// Cancel subscription
billingController.post("/billing/cancel", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  try {
    const { cancelImmediately = false, reason = "", feedback = "" } = body;

    if (!user.stripeSubscriptionId) {
      return c.json({ error: "No active subscription found" }, 400);
    }

    const subscription = await StripeService.cancelSubscription(
      user.stripeSubscriptionId,
      cancelImmediately
    );

    // Update subscription in database
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: mapStripeStatusToSubscriptionStatus(subscription.status),
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    // Log cancellation reason and feedback
    if (reason || feedback) {
      // TODO: Create subscriptionCancellation table if needed
      logger.info(
        {
          userId: user.id,
          reason,
          feedback,
        },
        "Subscription cancellation feedback"
      );
    }

    return c.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
      },
      message: cancelImmediately
        ? "Subscription canceled immediately"
        : "Subscription will be canceled at the end of the current period",
    });
  } catch (error) {
    logger.error({ error }, "Error canceling subscription");
    return c.json({ error: "Failed to cancel subscription" }, 500);
  }
});

// Renew subscription
billingController.post("/billing/renew", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  try {
    const { plan, interval = "monthly" } = body;

    if (!plan) {
      return c.json({ error: "Plan is required" }, 400);
    }

    const checkoutSession = await StripeService.createCheckoutSession({
      userId: user.id,
      plan,
      billingInterval: interval,
      successUrl: `${config.FRONTEND_URL}/payment/success`,
      cancelUrl: `${config.FRONTEND_URL}/payment/cancel`,
      customerEmail: user.email,
    });

    return c.json({ url: checkoutSession.url });
  } catch (error) {
    logger.error({ error }, "Error renewing subscription");
    return c.json({ error: "Failed to renew subscription" }, 500);
  }
});

// Get payment history
billingController.get("/payments", async (c) => {
  const user = c.get("user");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        amount: true,
        status: true,
        description: true,
        createdAt: true,
        stripePaymentId: true,
      },
    });

    const total = await prisma.payment.count({
      where: { userId: user.id },
    });

    return c.json({
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        description: payment.description,
        createdAt: payment.createdAt.toISOString(),
        stripePaymentId: payment.stripePaymentId,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching payment history");
    return c.json({ error: "Failed to fetch payment history" }, 500);
  }
});

export default billingController;
