import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import {
  StripeService,
  Session,
  Subscription,
  Invoice,
  Customer,
  PaymentIntent,
} from "@/services/stripe.service";
import { EmailService } from "@/services/email/email.service";
import {
  getWorkspaceResourceCounts,
  getMonthlyMessageCount,
} from "@/middlewares/plan-validation";
import {
  WorkspacePlan,
  SubscriptionStatus,
  PaymentStatus,
  BillingInterval,
} from "@prisma/client";
import { getUserDisplayName } from "../shared";

export async function handleCheckoutSessionCompleted(session: Session) {
  const workspaceId = session.metadata?.workspaceId;
  const plan = session.metadata?.plan as WorkspacePlan;
  const billingInterval = session.metadata?.billingInterval;

  if (!workspaceId || !plan) {
    logger.error("Missing metadata in checkout session");
    return;
  }

  try {
    // Use static methods for extraction
    const customerId = StripeService.extractCustomerId(session);
    const subscriptionId = StripeService.extractSubscriptionId(session);

    // Update workspace plan and Stripe customer ID
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
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
      await EmailService.sendUpgradeConfirmationEmail({
        to: workspace.users[0].email,
        userName: getUserDisplayName(workspace.users[0]),
        workspaceName: workspace.name,
        plan,
        billingInterval: billingInterval as "monthly" | "yearly",
      });
    }

    logger.info(`Workspace ${workspaceId} upgraded to ${plan}`);
  } catch (error) {
    logger.error({ error }, "Error handling checkout session completed");
  }
}

export async function handleSubscriptionChange(subscription: Subscription) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(subscription);

    if (!customerId) {
      logger.error("Missing customer ID in subscription");
      return;
    }

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
    logger.error({ error }, "Error handling subscription change");
  }
}

export async function handleSubscriptionDeleted(subscription: Subscription) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(subscription);

    if (!customerId) {
      logger.error("Missing customer ID in subscription deletion");
      return;
    }

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
    logger.error({ error }, "Error handling subscription deletion");
  }
}

export async function handleTrialWillEnd(subscription: Subscription) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(subscription);

    if (!customerId) {
      logger.error("Missing customer ID in trial will end");
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customerId },
      include: {
        users: { where: { role: "ADMIN" }, take: 1 },
      },
    });

    if (!workspace?.users[0]) {
      logger.error(`Workspace not found for trial ending: ${customerId}`);
      return;
    }

    // Send trial ending email notification
    if (subscription.trial_end && workspace.plan !== WorkspacePlan.FREE) {
      const trialEndDate = new Date(
        subscription.trial_end * 1000
      ).toLocaleDateString();

      // Get current usage for more compelling email content
      const [resourceCounts, monthlyMessages] = await Promise.all([
        getWorkspaceResourceCounts(workspace.id),
        getMonthlyMessageCount(workspace.id),
      ]);

      const emailResult = await EmailService.sendTrialEndingEmail({
        to: workspace.users[0].email,
        name: getUserDisplayName(workspace.users[0]),
        workspaceName: workspace.name,
        plan: workspace.plan as "DEVELOPER" | "STARTUP" | "BUSINESS",
        trialEndDate,
        currentUsage: {
          servers: resourceCounts.servers,
          queues: resourceCounts.queues,
          monthlyMessages,
        },
      });

      if (!emailResult.success) {
        logger.error("Failed to send trial ending email", {
          workspaceId: workspace.id,
          error: emailResult.error,
        });
      }
    }

    logger.info(`Trial ending notification sent for workspace ${workspace.id}`);
  } catch (error) {
    logger.error({ error }, "Error handling trial will end");
  }
}

export async function handlePaymentSucceeded(invoice: Invoice) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(invoice);

    if (!customerId) {
      logger.error("Missing customer ID in payment succeeded");
      return;
    }

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
        stripePaymentId:
          typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : invoice.payment_intent?.id || `invoice_${invoice.id}`,
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
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(),
        metadata: invoice.metadata || undefined,
      },
    });

    logger.info(
      `Payment recorded for workspace ${workspace.id}: $${invoice.amount_paid / 100}`
    );
  } catch (error) {
    logger.error({ error }, "Error handling payment succeeded");
  }
}

export async function handlePaymentFailed(invoice: Invoice) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(invoice);

    if (!customerId) {
      logger.error("Missing customer ID in payment failed");
      return;
    }

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
        stripePaymentId:
          typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : invoice.payment_intent?.id || `invoice_${invoice.id}`,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: PaymentStatus.FAILED,
        description: invoice.description || `${subscription?.plan} Plan`,
        plan: subscription?.plan,
        billingInterval: subscription?.billingInterval,
        failureCode: invoice.last_finalization_error?.code || null,
        failureMessage: invoice.last_finalization_error?.message || null,
        metadata: invoice.metadata || undefined,
      },
    });

    logger.info(
      `Payment failed for workspace ${workspace.id}: $${invoice.amount_due / 100}`
    );
  } catch (error) {
    logger.error({ error }, "Error handling payment failed");
  }
}

export async function handlePaymentActionRequired(invoice: Invoice) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(invoice);

    if (!customerId) {
      logger.error("Missing customer ID in payment action required");
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customerId },
      include: {
        users: { where: { role: "ADMIN" }, take: 1 },
      },
    });

    if (!workspace?.users[0]) {
      logger.error(`Workspace not found for payment action: ${customerId}`);
      return;
    }

    // Create notification record
    // TODO: Implement notification system
    logger.warn(`Payment action required for workspace ${workspace.id}`, {
      invoiceId: invoice.id,
      invoiceUrl: invoice.hosted_invoice_url,
      amount: invoice.amount_due,
      userId: workspace.users[0].id,
    });

    // Send payment action required email
    if (invoice.hosted_invoice_url && workspace.plan !== WorkspacePlan.FREE) {
      const emailResult = await EmailService.sendPaymentActionRequiredEmail({
        to: workspace.users[0].email,
        name: getUserDisplayName(workspace.users[0]),
        workspaceName: workspace.name,
        plan: workspace.plan,
        invoiceUrl: invoice.hosted_invoice_url,
        amount: (invoice.amount_due / 100).toFixed(2),
        currency: invoice.currency,
      });

      if (!emailResult.success) {
        logger.error("Failed to send payment action required email", {
          workspaceId: workspace.id,
          error: emailResult.error,
        });
      }
    }

    logger.info(
      `Payment action required notification sent for workspace ${workspace.id}`
    );
  } catch (error) {
    logger.error({ error }, "Error handling payment action required");
  }
}

export async function handleUpcomingInvoice(invoice: Invoice) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(invoice);

    if (!customerId) {
      logger.error("Missing customer ID in upcoming invoice");
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customerId },
      include: {
        users: { where: { role: "ADMIN" }, take: 1 },
      },
    });

    if (!workspace?.users[0]) {
      logger.error(`Workspace not found for upcoming invoice: ${customerId}`);
      return;
    }

    // Only send notification for substantial amounts (> $10)
    if (invoice.amount_due > 1000) {
      // TODO: Implement notification system
      logger.info(`Upcoming invoice for workspace ${workspace.id}`, {
        invoiceId: invoice.id,
        amount: invoice.amount_due,
        dueDate: invoice.due_date,
        userId: workspace.users[0].id,
      });

      // Send upcoming invoice email
      if (workspace.plan !== WorkspacePlan.FREE) {
        const invoiceDate = new Date().toLocaleDateString();
        const nextBillingDate = invoice.due_date
          ? new Date(invoice.due_date * 1000).toLocaleDateString()
          : new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toLocaleDateString(); // Default to 30 days from now

        // Get usage data for business intelligence email
        const [resourceCounts, monthlyMessages] = await Promise.all([
          getWorkspaceResourceCounts(workspace.id),
          getMonthlyMessageCount(workspace.id),
        ]);

        const emailResult = await EmailService.sendUpcomingInvoiceEmail({
          to: workspace.users[0].email,
          name: getUserDisplayName(workspace.users[0]),
          workspaceName: workspace.name,
          plan: workspace.plan as "DEVELOPER" | "STARTUP" | "BUSINESS",
          amount: (invoice.amount_due / 100).toFixed(2),
          currency: invoice.currency,
          invoiceDate,
          nextBillingDate,
          usageReport: {
            servers: resourceCounts.servers,
            queues: resourceCounts.queues,
            monthlyMessages,
            totalMessages: monthlyMessages, // For now, same as monthly
          },
        });

        if (!emailResult.success) {
          logger.error("Failed to send upcoming invoice email", {
            workspaceId: workspace.id,
            error: emailResult.error,
          });
        }
      }
    }

    logger.info(
      `Upcoming invoice notification sent for workspace ${workspace.id}: $${invoice.amount_due / 100}`
    );
  } catch (error) {
    logger.error({ error }, "Error handling upcoming invoice");
  }
}

export async function handlePaymentIntentFailed(paymentIntent: PaymentIntent) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(paymentIntent);

    if (!customerId) {
      logger.error("Missing customer ID in payment intent failed");
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customerId },
      include: {
        users: { where: { role: "ADMIN" }, take: 1 },
      },
    });

    if (!workspace?.users[0]) {
      logger.error(
        `Workspace not found for payment intent failed: ${customerId}`
      );
      return;
    }

    // Create failed payment record
    await prisma.payment.create({
      data: {
        workspaceId: workspace.id,
        stripePaymentId: paymentIntent.id,
        stripeInvoiceId: null,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: PaymentStatus.FAILED,
        description: paymentIntent.description || "Payment attempt",
        failureCode: paymentIntent.last_payment_error?.code || null,
        failureMessage: paymentIntent.last_payment_error?.message || null,
        metadata: paymentIntent.metadata || undefined,
      },
    });

    // TODO: Implement notification system
    logger.error(`Payment intent failed for workspace ${workspace.id}`, {
      paymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
      userId: workspace.users[0].id,
      amount: paymentIntent.amount,
    });

    logger.info(
      `Payment intent failed for workspace ${workspace.id}: $${paymentIntent.amount / 100}`
    );
  } catch (error) {
    logger.error({ error }, "Error handling payment intent failed");
  }
}

export async function handleCustomerUpdated(customer: Customer) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customer.id },
    });

    if (!workspace) {
      logger.error(`Workspace not found for customer update: ${customer.id}`);
      return;
    }

    // Update any cached customer information if needed
    // This is mainly for keeping customer email/name in sync
    if (customer.email) {
      const adminUser = await prisma.user.findFirst({
        where: {
          workspaceId: workspace.id,
          role: "ADMIN",
        },
      });

      if (adminUser && adminUser.email !== customer.email) {
        logger.warn(
          `Customer email changed for workspace ${workspace.id}: ${adminUser.email} -> ${customer.email}`
        );
        // Optionally update the admin user's email or log the discrepancy
      }
    }

    logger.info(`Customer updated for workspace ${workspace.id}`);
  } catch (error) {
    logger.error({ error }, "Error handling customer updated");
  }
}
