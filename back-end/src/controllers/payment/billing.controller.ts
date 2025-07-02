import { Hono } from "hono";
import { authMiddleware } from "@/middlewares/auth";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const app = new Hono();

// Get comprehensive billing overview
app.get("/billing/overview", authMiddleware, async (c) => {
  const user = c.get("user");

  try {
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
        stripeSubscription = await stripe.subscriptions.retrieve(
          workspace.subscription.stripeSubscriptionId,
          {
            expand: ["default_payment_method", "latest_invoice"],
          }
        );

        // Get upcoming invoice
        upcomingInvoice = await stripe.invoices.retrieveUpcoming({
          subscription: workspace.subscription.stripeSubscriptionId,
        });

        // Get payment method details
        if (stripeSubscription.default_payment_method) {
          paymentMethod = await stripe.paymentMethods.retrieve(
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
app.get("/billing/subscription", authMiddleware, async (c) => {
  const user = c.get("user");

  try {
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
app.get("/billing/payments", authMiddleware, async (c) => {
  const user = c.get("user");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
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
app.post("/billing/payment-method", authMiddleware, async (c) => {
  const user = c.get("user");
  const { paymentMethodId } = await c.req.json();

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: user.workspaceId },
    });

    if (!subscription?.stripeSubscriptionId) {
      return c.json({ error: "No active subscription found" }, 404);
    }

    // Update the payment method in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      default_payment_method: paymentMethodId,
    });

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
app.post("/billing/portal", authMiddleware, async (c) => {
  const user = c.get("user");

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: user.workspaceId },
    });

    if (!subscription?.stripeCustomerId) {
      return c.json({ error: "No customer found" }, 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/payments/billing`,
    });

    return c.json({ url: session.url });
  } catch (error) {
    logger.error(
      { error, workspaceId: user.workspaceId },
      "Error creating billing portal session"
    );
    return c.json({ error: "Failed to create billing portal session" }, 500);
  }
});

export default app;
