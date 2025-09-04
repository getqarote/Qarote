import { Hono } from "hono";
import { authenticate } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { StripeService } from "@/services/stripe/stripe.service";
import { strictRateLimiter } from "@/middlewares/security";

const billingController = new Hono();

billingController.use("*", authenticate);
billingController.use("*", strictRateLimiter);

// Get comprehensive billing overview
billingController.get("/billing/overview", async (c) => {
  const user = c.get("user");

  try {
    if (!user.workspaceId) {
      return c.json({ error: "No workspace assigned" }, 400);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
      include: {
        subscription: true,
        _count: {
          select: {
            users: true,
            servers: true,
          },
        },
      },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    let stripeSubscription = null;
    let upcomingInvoice = null;
    let paymentMethod = null;

    // Fetch Stripe subscription details if exists
    if (workspace.subscription?.stripeSubscriptionId) {
      try {
        stripeSubscription = await StripeService.getSubscription(
          workspace.subscription.stripeSubscriptionId,
          ["latest_invoice"]
        );

        // Get upcoming invoice
        upcomingInvoice = await StripeService.getUpcomingInvoice(
          workspace.subscription.stripeSubscriptionId
        );

        // Get payment method details
        if (stripeSubscription.default_payment_method) {
          paymentMethod = await StripeService.getPaymentMethod(
            stripeSubscription.default_payment_method as string
          );
        }
      } catch (error) {
        logger.warn(
          {
            error,
            subscriptionId: workspace.subscription.stripeSubscriptionId,
          },
          "Failed to fetch Stripe subscription details"
        );
      }
    }

    // Get recent payments
    const recentPayments = await prisma.payment.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Calculate current usage
    const currentUsage = {
      servers: workspace._count.servers,
      users: workspace._count.users,
      queues: await prisma.queue.count({
        where: {
          server: {
            workspaceId: user.workspaceId,
          },
        },
      }),
      messagesThisMonth: await prisma.queueMetric.count({
        where: {
          queue: {
            server: {
              workspaceId: user.workspaceId,
            },
          },
          timestamp: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    };

    return c.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
      },
      subscription: workspace.subscription,
      stripeSubscription,
      upcomingInvoice,
      paymentMethod,
      currentUsage,
      recentPayments,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching billing overview");
    return c.json({ error: "Failed to fetch billing overview" }, 500);
  }
});

// Get subscription details
billingController.get("/billing/subscription", async (c) => {
  const user = c.get("user");

  try {
    if (!user.workspaceId) {
      return c.json({ error: "No workspace assigned" }, 400);
    }

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: user.workspaceId },
    });

    if (!subscription) {
      return c.json({ subscription: null });
    }

    return c.json({ subscription });
  } catch (error) {
    logger.error({ error }, "Error fetching subscription");
    return c.json({ error: "Failed to fetch subscription" }, 500);
  }
});

// Get payment history
billingController.get("/billing/payments", async (c) => {
  const user = c.get("user");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
    if (!user.workspaceId) {
      return c.json({ error: "No workspace assigned" }, 400);
    }

    const payments = await prisma.payment.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.payment.count({
      where: { workspaceId: user.workspaceId },
    });

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
    logger.error({ error }, "Error fetching payments");
    return c.json({ error: "Failed to fetch payments" }, 500);
  }
});

// Update payment method
billingController.post("/billing/payment-method", async (c) => {
  const user = c.get("user");
  const { paymentMethodId } = await c.req.json();

  try {
    if (!user.workspaceId) {
      return c.json({ error: "No workspace assigned" }, 400);
    }

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: user.workspaceId },
    });

    if (!subscription?.stripeSubscriptionId) {
      return c.json({ error: "No active subscription found" }, 404);
    }

    // Update the payment method in Stripe
    await StripeService.updateSubscriptionPaymentMethod(
      subscription.stripeSubscriptionId,
      paymentMethodId
    );

    logger.info(
      { workspaceId: user.workspaceId, paymentMethodId },
      "Payment method updated successfully"
    );

    return c.json({ success: true });
  } catch (error) {
    logger.error(
      { error, workspaceId: user.workspaceId },
      "Error updating payment method"
    );
    return c.json({ error: "Failed to update payment method" }, 500);
  }
});

// Get billing portal URL
billingController.post("/billing/portal", async (c) => {
  const user = c.get("user");

  try {
    if (!user.workspaceId) {
      return c.json({ error: "No workspace assigned" }, 400);
    }

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: user.workspaceId },
    });

    if (!subscription?.stripeCustomerId) {
      return c.json({ error: "No customer found" }, 404);
    }

    const session = await StripeService.createPortalSession(
      subscription.stripeCustomerId,
      `${process.env.FRONTEND_URL}/payments/billing`
    );

    return c.json({ url: session.url });
  } catch (error) {
    logger.error(
      { error, workspaceId: user.workspaceId },
      "Error creating billing portal session"
    );
    return c.json({ error: "Failed to create billing portal session" }, 500);
  }
});

// Cancel subscription
billingController.post("/billing/cancel", strictRateLimiter, async (c) => {
  const user = c.get("user");
  const { cancelImmediately = false, reason, feedback } = await c.req.json();

  try {
    if (!user.workspaceId) {
      return c.json({ error: "No workspace assigned" }, 400);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
      include: {
        subscription: true,
      },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    if (!workspace.subscription?.stripeSubscriptionId) {
      return c.json({ error: "No active subscription found" }, 404);
    }

    // Cancel the subscription in Stripe
    const canceledSubscription = await StripeService.cancelSubscriptionAdvanced(
      workspace.subscription.stripeSubscriptionId,
      {
        cancelImmediately,
        reason: reason || "user_requested",
        feedback,
        canceledBy: user.email,
      }
    );

    // Update our database
    await prisma.subscription.update({
      where: { workspaceId: user.workspaceId! },
      data: {
        status: "CANCELED",
        cancelAtPeriodEnd: !cancelImmediately,
        canceledAt: cancelImmediately ? new Date() : null,
        cancelationReason: reason || "user_requested",
        updatedAt: new Date(),
      },
    });

    // Log the cancellation for audit purposes
    logger.info(
      {
        workspaceId: user.workspaceId,
        subscriptionId: workspace.subscription.stripeSubscriptionId,
        cancelImmediately,
        reason,
        feedback,
        userId: user.id,
      },
      "Subscription cancellation requested"
    );

    // If canceling immediately, downgrade workspace to FREE plan
    if (cancelImmediately) {
      await prisma.workspace.update({
        where: { id: user.workspaceId! },
        data: {
          plan: "FREE",
          updatedAt: new Date(),
        },
      });
    }

    return c.json({
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        currentPeriodEnd: new Date(
          canceledSubscription.current_period_end * 1000
        ),
        canceledAt: cancelImmediately ? new Date() : null,
      },
      message: cancelImmediately
        ? "Subscription canceled immediately. Your workspace has been downgraded to the Free plan."
        : `Subscription will be canceled at the end of your current billing period (${new Date(
            canceledSubscription.current_period_end * 1000
          ).toLocaleDateString()}).`,
    });
  } catch (error) {
    logger.error(
      { error, workspaceId: user.workspaceId },
      "Error canceling subscription"
    );
    return c.json({ error: "Failed to cancel subscription" }, 500);
  }
});

export default billingController;
