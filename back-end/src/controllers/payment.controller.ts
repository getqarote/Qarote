import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { authMiddleware } from "@/middlewares/auth";
import { prisma } from "@/core/prisma";
import { StripeService } from "@/services/stripe.service";
import { sendUpgradeConfirmationEmail } from "@/services/email/email.service";
import { logger } from "@/core/logger";
import {
  WorkspacePlan,
  SubscriptionStatus,
  PaymentStatus,
  BillingInterval,
} from "@prisma/client";

const app = new Hono();

// Schema for creating checkout session
const CreateCheckoutSessionSchema = z.object({
  plan: z.enum(WorkspacePlan),
  billingInterval: z.enum(["monthly", "yearly"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// Schema for webhook verification
const StripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

// Create checkout session for subscription
app.post(
  "/checkout",
  authMiddleware,
  zValidator("json", CreateCheckoutSessionSchema),
  async (c) => {
    const { plan, billingInterval, successUrl, cancelUrl } =
      c.req.valid("json");
    const user = c.get("user");

    if (!user?.workspaceId) {
      return c.json({ error: "User workspace not found" }, 404);
    }

    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    if (plan === WorkspacePlan.FREE) {
      return c.json({ error: "Cannot create checkout for FREE plan" }, 400);
    }

    try {
      // Create Stripe customer if not exists
      let customerId = workspace.stripeCustomerId;
      if (!customerId) {
        const customer = await StripeService.createCustomer({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          workspaceId: workspace.id,
        });
        customerId = customer.id;

        // Update workspace with customer ID
        await prisma.workspace.update({
          where: { id: workspace.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Create checkout session
      const session = await StripeService.createCheckoutSession({
        workspaceId: workspace.id,
        plan,
        billingInterval,
        successUrl:
          successUrl ||
          `${process.env.FRONTEND_URL}/profile?tab=plans&success=true`,
        cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/plans`,
        customerEmail: user.email,
      });

      return c.json({ url: session.url });
    } catch (error) {
      logger.error("Error creating checkout session:", error);
      return c.json({ error: "Failed to create checkout session" }, 500);
    }
  }
);

// Create customer portal session
app.post("/portal", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user?.workspaceId) {
    return c.json({ error: "User workspace not found" }, 404);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
  });

  if (!workspace?.stripeCustomerId) {
    return c.json({ error: "No Stripe customer found" }, 404);
  }

  try {
    const session = await StripeService.createPortalSession(
      workspace.stripeCustomerId,
      `${process.env.FRONTEND_URL}/profile?tab=billing`
    );

    return c.json({ url: session.url });
  } catch (error) {
    logger.error("Error creating portal session:", error);
    return c.json({ error: "Failed to create portal session" }, 500);
  }
});

// Get subscription details
app.get("/subscription", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user?.workspaceId) {
    return c.json({ error: "User workspace not found" }, 404);
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: user.workspaceId },
    });

    if (!subscription) {
      return c.json({ subscription: null });
    }

    return c.json({ subscription });
  } catch (error) {
    logger.error("Error fetching subscription:", error);
    return c.json({ error: "Failed to fetch subscription" }, 500);
  }
});

// Get payment history
app.get("/payments", authMiddleware, async (c) => {
  const user = c.get("user");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = parseInt(c.req.query("offset") || "0");

  if (!user?.workspaceId) {
    return c.json({ error: "User workspace not found" }, 404);
  }

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
    logger.error("Error fetching payments:", error);
    return c.json({ error: "Failed to fetch payments" }, 500);
  }
});

// Stripe webhook handler
app.post("/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  try {
    const body = await c.req.text();
    const event = await StripeService.constructWebhookEvent(body, signature);

    // Store webhook event
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        data: event.data as any,
      },
    });

    // Process the event
    await processStripeWebhook(event);

    return c.json({ received: true });
  } catch (error) {
    logger.error("Webhook error:", error);
    return c.json({ error: "Webhook processing failed" }, 400);
  }
});

async function processStripeWebhook(event: any) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChange(event.data.object);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;

    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const workspaceId = session.metadata?.workspaceId;
  const plan = session.metadata?.plan as WorkspacePlan;
  const billingInterval = session.metadata?.billingInterval;

  if (!workspaceId || !plan) {
    logger.error("Missing metadata in checkout session");
    return;
  }

  try {
    // Update workspace plan and Stripe customer ID
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
      },
    });

    // Get workspace with user for email
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        users: {
          where: { role: "ADMIN" },
          take: 1,
        },
      },
    });

    if (workspace?.users[0]) {
      await sendUpgradeConfirmationEmail({
        to: workspace.users[0].email,
        userName:
          `${workspace.users[0].firstName} ${workspace.users[0].lastName}`.trim(),
        workspaceName: workspace.name,
        plan,
        billingInterval: billingInterval as "monthly" | "yearly",
      });
    }

    logger.info(`Workspace ${workspaceId} upgraded to ${plan}`);
  } catch (error) {
    logger.error("Error handling checkout session completed:", error);
  }
}

async function handleSubscriptionChange(subscription: any) {
  const customerId = subscription.customer;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!workspace) {
      logger.error(`Workspace not found for customer ${customerId}`);
      return;
    }

    const stripePriceId = subscription.items.data[0]?.price?.id;
    const plan = StripeService.mapStripePlanToWorkspacePlan(stripePriceId);
    const billingInterval = StripeService.getBillingInterval(stripePriceId);

    if (!plan || !billingInterval) {
      logger.error(
        `Could not map Stripe price ${stripePriceId} to workspace plan`
      );
      return;
    }

    // Update or create subscription record
    await prisma.subscription.upsert({
      where: { workspaceId: workspace.id },
      update: {
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        plan,
        billingInterval: billingInterval.toUpperCase() as BillingInterval,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      },
      create: {
        workspaceId: workspace.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId,
        stripeCustomerId: customerId,
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        plan,
        billingInterval: billingInterval.toUpperCase() as BillingInterval,
        pricePerMonth: subscription.items.data[0]?.price?.unit_amount || 0,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    // Update workspace plan if subscription is active
    if (subscription.status === "active") {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { plan },
      });
    }

    logger.info(
      `Subscription updated for workspace ${workspace.id}: ${plan} (${subscription.status})`
    );
  } catch (error) {
    logger.error("Error handling subscription change:", error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!workspace) {
      logger.error(`Workspace not found for customer ${customerId}`);
      return;
    }

    // Update subscription status and downgrade workspace to FREE
    await prisma.$transaction([
      prisma.subscription.update({
        where: { workspaceId: workspace.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
        },
      }),
      prisma.workspace.update({
        where: { id: workspace.id },
        data: { plan: WorkspacePlan.FREE },
      }),
    ]);

    logger.info(
      `Subscription canceled for workspace ${workspace.id}, downgraded to FREE`
    );
  } catch (error) {
    logger.error("Error handling subscription deletion:", error);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!workspace) {
      logger.error(`Workspace not found for customer ${customerId}`);
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: workspace.id },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        workspaceId: workspace.id,
        stripePaymentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: PaymentStatus.SUCCEEDED,
        description: invoice.description || `${subscription?.plan} Plan`,
        plan: subscription?.plan,
        billingInterval: subscription?.billingInterval,
        periodStart: subscription?.currentPeriodStart,
        periodEnd: subscription?.currentPeriodEnd,
        receiptUrl: invoice.hosted_invoice_url,
        invoiceUrl: invoice.invoice_pdf,
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
        metadata: invoice.metadata,
      },
    });

    logger.info(
      `Payment recorded for workspace ${workspace.id}: $${invoice.amount_paid / 100}`
    );
  } catch (error) {
    logger.error("Error handling payment succeeded:", error);
  }
}

async function handlePaymentFailed(invoice: any) {
  const customerId = invoice.customer;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!workspace) {
      logger.error(`Workspace not found for customer ${customerId}`);
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: workspace.id },
    });

    // Create failed payment record
    await prisma.payment.create({
      data: {
        workspaceId: workspace.id,
        stripePaymentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: PaymentStatus.FAILED,
        description: invoice.description || `${subscription?.plan} Plan`,
        plan: subscription?.plan,
        billingInterval: subscription?.billingInterval,
        failureCode: invoice.last_finalization_error?.code,
        failureMessage: invoice.last_finalization_error?.message,
        metadata: invoice.metadata,
      },
    });

    logger.info(
      `Payment failed for workspace ${workspace.id}: $${invoice.amount_due / 100}`
    );
  } catch (error) {
    logger.error("Error handling payment failed:", error);
  }
}

export default app;
