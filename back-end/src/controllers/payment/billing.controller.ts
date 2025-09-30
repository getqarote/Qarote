import { Hono } from "hono";
import { authenticate } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { StripeService } from "@/services/stripe/stripe.service";
import { strictRateLimiter } from "@/middlewares/security";
import { getUserResourceCounts } from "@/services/plan/plan.service";
import { SubscriptionStatus } from "@prisma/client";
import {
  extractStringId,
  mapStripeStatusToSubscriptionStatus,
} from "./webhook-handlers";

const billingController = new Hono();

billingController.use("*", authenticate);
billingController.use("*", strictRateLimiter);

// Get comprehensive billing overview
billingController.get("/billing/overview", async (c) => {
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
    if (userWithSubscription.subscription?.stripeSubscriptionId) {
      try {
        stripeSubscription = await StripeService.getSubscription(
          userWithSubscription.subscription!.stripeSubscriptionId,
          ["latest_invoice"]
        );

        // Get upcoming invoice
        upcomingInvoice = await StripeService.getUpcomingInvoice(
          userWithSubscription.subscription!.stripeSubscriptionId
        );

        // Get payment method
        if (stripeSubscription.default_payment_method) {
          const paymentMethodId = extractStringId(
            stripeSubscription.default_payment_method
          );
          paymentMethod = await StripeService.getPaymentMethod(paymentMethodId);
        }
      } catch (error) {
        logger.error("Error fetching Stripe data:", error);
      }
    }

    // Get user's resource counts across all workspaces
    const resourceCounts = await getUserResourceCounts(user.id);

    // Get recent payments
    const recentPayments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        status: true,
        description: true,
        createdAt: true,
      },
    });

    return c.json({
      workspace: {
        id: currentWorkspace.id,
        name: currentWorkspace.name,
      },
      subscription: userWithSubscription.subscription,
      stripeSubscription,
      upcomingInvoice,
      paymentMethod,
      currentUsage: {
        servers: resourceCounts.servers,
        users: resourceCounts.users,
      },
      recentPayments,
    });
  } catch (error) {
    logger.error("Error fetching billing overview:", error);
    return c.json({ error: "Failed to fetch billing overview" }, 500);
  }
});

// Get subscription details
billingController.get("/subscription", async (c) => {
  const user = c.get("user");

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    return c.json({ subscription });
  } catch (error) {
    logger.error({ error }, "Error fetching subscription");
    return c.json({ error: "Failed to fetch subscription" }, 500);
  }
});

// Get payment history with pagination
billingController.get("/payments", async (c) => {
  const user = c.get("user");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({
        where: { userId: user.id },
      }),
    ]);

    return c.json({
      payments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error({ error }, "Error fetching payment history");
    return c.json({ error: "Failed to fetch payment history" }, 500);
  }
});

// Cancel subscription
billingController.post("/billing/cancel", async (c) => {
  const user = c.get("user");
  const { cancelImmediately, reason, feedback } = await c.req.json();

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return c.json({ error: "No active subscription found" }, 404);
    }

    // Cancel subscription in Stripe
    const canceledSubscription = await StripeService.cancelSubscriptionAdvanced(
      subscription.stripeSubscriptionId,
      {
        cancelImmediately,
        reason,
        feedback,
        canceledBy: user.email,
      }
    );

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: mapStripeStatusToSubscriptionStatus(
          canceledSubscription.status
        ),
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        canceledAt: canceledSubscription.canceled_at
          ? new Date(canceledSubscription.canceled_at * 1000)
          : null,
        cancelationReason: reason,
      },
    });

    return c.json({
      success: true,
      subscription: updatedSubscription,
      message: cancelImmediately
        ? "Subscription canceled immediately. All workspaces have been downgraded to FREE."
        : "Subscription will be canceled at the end of the current billing period.",
    });
  } catch (error) {
    logger.error({ error }, "Error canceling subscription");
    return c.json({ error: "Failed to cancel subscription" }, 500);
  }
});

// Reactivate subscription
billingController.post("/billing/reactivate", async (c) => {
  const user = c.get("user");

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return c.json({ error: "No subscription found" }, 404);
    }

    // Reactivate subscription in Stripe
    const reactivatedSubscription = await StripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      subscription.stripePriceId
    );

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: mapStripeStatusToSubscriptionStatus(
          reactivatedSubscription.status
        ),
        cancelAtPeriodEnd: false,
        isRenewalAfterCancel: true,
        previousCancelDate: subscription.canceledAt,
      },
    });

    return c.json({
      success: true,
      subscription: updatedSubscription,
      message: "Subscription reactivated successfully.",
    });
  } catch (error) {
    logger.error({ error }, "Error reactivating subscription");
    return c.json({ error: "Failed to reactivate subscription" }, 500);
  }
});

export default billingController;
