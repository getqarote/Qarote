import { BillingInterval, SubscriptionStatus, UserPlan } from "@prisma/client";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import { getUserDisplayName } from "@/core/utils";

import { EmailService } from "@/services/email/email.service";
import { licenseService } from "@/services/license/license.service";
import { trackPaymentError } from "@/services/sentry";
import { CoreStripeService } from "@/services/stripe/core.service";
import {
  Customer,
  Invoice,
  PaymentIntent,
  Session,
  StripeService,
  Subscription,
} from "@/services/stripe/stripe.service";

// Note: This file contains webhook handlers that are used by the webhook controller
// These handlers process Stripe webhook events and update the database accordingly

export async function handleCheckoutSessionCompleted(session: Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as UserPlan;
  const billingInterval = session.metadata?.billingInterval;
  const purchaseType = session.metadata?.type; // "license" or "subscription"

  if (!userId || !plan) {
    logger.error("Missing metadata in checkout session");
    return;
  }

  // Handle license purchases differently from subscriptions
  if (purchaseType === "license") {
    return handleLicensePurchase(session, userId, plan, billingInterval);
  }

  try {
    // Use static methods for extraction
    const customerId = StripeService.extractCustomerId(session);
    const subscriptionId = StripeService.extractSubscriptionId(session);

    // Update user with Stripe customer ID and subscription ID
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
      },
    });

    // Get user for email
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.error("User not found for checkout session completion");
      return;
    }

    // Check if subscription already exists (idempotency check)
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId! },
    });

    if (existingSubscription) {
      logger.info(
        {
          stripeSubscriptionId: subscriptionId,
          subscriptionId: existingSubscription.id,
          userId,
        },
        "Subscription already exists for this checkout session, skipping duplicate creation"
      );
      return;
    }

    // Create subscription record
    const subscription = session.subscription;
    const subscriptionData =
      typeof subscription === "object" && subscription !== null
        ? subscription
        : null;

    logger.info(
      { subscriptionData },
      "Subscription data from checkout session"
    );

    // Get current period dates safely
    const currentPeriodStart = subscriptionData?.current_period_start
      ? new Date(subscriptionData.current_period_start * 1000)
      : new Date(); // Fallback to current time

    const currentPeriodEnd = subscriptionData?.current_period_end
      ? new Date(subscriptionData.current_period_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Fallback to 30 days from now

    logger.debug(
      {
        currentPeriodStart: currentPeriodStart.toISOString(),
        currentPeriodEnd: currentPeriodEnd.toISOString(),
      },
      "Parsed subscription period dates"
    );

    // Determine subscription status based on trial
    const subscriptionStatus = CoreStripeService.mapSubscriptionStatusFromTrial(
      subscriptionData?.trial_start,
      subscriptionData?.trial_end
    );

    await prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscriptionId!,
        stripePriceId: subscriptionData?.items?.data?.[0]?.price?.id || "",
        stripeCustomerId: customerId!,
        plan,
        status: subscriptionStatus,
        billingInterval: billingInterval
          ? CoreStripeService.mapStripeBillingIntervalToBillingInterval(
              billingInterval
            )
          : BillingInterval.MONTH,
        pricePerMonth:
          subscriptionData?.items?.data?.[0]?.price?.unit_amount || 0,
        currentPeriodStart,
        currentPeriodEnd,
        // Add trial information
        trialStart: subscriptionData?.trial_start
          ? new Date(subscriptionData.trial_start * 1000)
          : null,
        trialEnd: subscriptionData?.trial_end
          ? new Date(subscriptionData.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscriptionData?.cancel_at_period_end || false,
      },
    });

    // Send welcome email
    const billingIntervalEnum = billingInterval
      ? CoreStripeService.mapStripeBillingIntervalToBillingInterval(
          billingInterval
        )
      : BillingInterval.MONTH;

    await EmailService.sendUpgradeConfirmationEmail({
      to: user.email,
      userName: getUserDisplayName(user),
      workspaceName: "your workspaces", // Generic since it applies to all workspaces
      plan,
      billingInterval:
        CoreStripeService.mapBillingIntervalToString(billingIntervalEnum),
    });

    logger.info(`User ${userId} upgraded to ${plan}`);
  } catch (error) {
    logger.error({ error }, "Error handling checkout session completed");
    trackPaymentError("webhook", {
      handler: "handleCheckoutSessionCompleted",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Handle license purchase from Stripe checkout
 */
async function handleLicensePurchase(
  session: Session,
  userId: string,
  plan: UserPlan,
  billingInterval: string | undefined
) {
  try {
    const customerId = StripeService.extractCustomerId(session);
    const paymentIntentId =
      CoreStripeService.extractPaymentIntentIdFromSession(session);

    // Check if license already exists for this payment (idempotency check)
    if (paymentIntentId) {
      const existingLicense = await prisma.license.findFirst({
        where: { stripePaymentId: paymentIntentId },
      });

      if (existingLicense) {
        logger.info(
          {
            licenseId: existingLicense.id,
            paymentIntentId,
            userId,
          },
          "License already exists for this payment, skipping duplicate generation"
        );
        return;
      }
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { workspace: true },
    });

    if (!user) {
      logger.error("User not found for license purchase");
      return;
    }

    // Calculate expiration date
    const expiresAt = new Date();
    if (billingInterval === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Generate license
    const { licenseKey, licenseId } = await licenseService.generateLicense({
      tier: plan,
      customerEmail: user.email,
      workspaceId: user.workspaceId || undefined,
      expiresAt,
      stripeCustomerId: customerId || undefined,
      stripePaymentId: paymentIntentId || undefined,
    });

    logger.info(
      {
        licenseId,
        userId,
        plan,
        customerEmail: user.email,
      },
      "License generated for user"
    );

    // Send license email
    // TODO: Implement license purchase confirmation email
    logger.info(
      {
        to: user.email,
        userName: getUserDisplayName(user),
        licenseKey,
        plan,
        expiresAt,
      },
      "License purchase completed - email should be sent"
    );
  } catch (error) {
    logger.error({ error }, "Error handling license purchase");
    trackPaymentError("webhook", {
      handler: "handleLicensePurchase",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleSubscriptionChange(subscription: Subscription) {
  try {
    const subscriptionId = subscription.id;
    const customerId =
      CoreStripeService.extractCustomerIdFromSubscription(subscription);

    if (!customerId) {
      logger.error("Missing customer ID in subscription");
      return;
    }

    // Find user by Stripe customer ID
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.warn(
        { customerId, subscriptionId },
        "User not found for subscription change"
      );
      return;
    }

    // Get or create subscription record
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    const priceId = subscription.items?.data?.[0]?.price?.id || "";
    const priceAmount = subscription.items?.data?.[0]?.price?.unit_amount || 0;

    const subscriptionData = {
      stripePriceId: priceId,
      stripeCustomerId: customerId,
      plan:
        CoreStripeService.mapStripePlanToUserPlan(priceId) ||
        existingSubscription?.plan ||
        UserPlan.FREE,
      status: CoreStripeService.mapStripeStatusToSubscriptionStatus(
        subscription.status
      ),
      billingInterval: CoreStripeService.mapStripeBillingInterval(
        subscription.items?.data?.[0]?.price?.recurring?.interval
      ),
      pricePerMonth: priceAmount,
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : new Date(),
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : new Date(),
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    };

    if (existingSubscription) {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: subscriptionData,
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeSubscriptionId: subscriptionId,
          ...subscriptionData,
        },
      });
    }

    logger.info(
      { subscriptionId, userId: user.id },
      "Subscription updated successfully"
    );
  } catch (error) {
    logger.error({ error }, "Error handling subscription change");
    trackPaymentError("webhook", {
      handler: "handleSubscriptionChange",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleCustomerSubscriptionDeleted(
  subscription: Subscription
) {
  try {
    const subscriptionId = subscription.id;

    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (existingSubscription) {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELED,
        },
      });

      logger.info({ subscriptionId }, "Subscription canceled successfully");
    }
  } catch (error) {
    logger.error({ error }, "Error handling subscription deletion");
    trackPaymentError("webhook", {
      handler: "handleCustomerSubscriptionDeleted",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleInvoicePaymentSucceeded(invoice: Invoice) {
  try {
    const subscriptionId =
      CoreStripeService.extractSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      logger.warn("No subscription ID in invoice");
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { user: true },
    });

    if (!subscription) {
      logger.warn(
        { subscriptionId },
        "Subscription not found for invoice payment"
      );
      return;
    }

    // Update subscription status to active
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // Send payment confirmation email
    if (subscription.user) {
      await EmailService.sendPaymentConfirmationEmail({
        to: subscription.user.email,
        userName: getUserDisplayName(subscription.user),
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency.toUpperCase(),
        paymentMethod: invoice.payment_intent
          ? typeof invoice.payment_intent === "string"
            ? "card"
            : invoice.payment_intent.payment_method_types?.[0] || "card"
          : "card",
      });
    }

    logger.info(
      { subscriptionId, invoiceId: invoice.id },
      "Invoice payment processed successfully"
    );
  } catch (error) {
    logger.error({ error }, "Error handling invoice payment succeeded");
    trackPaymentError("webhook", {
      handler: "handleInvoicePaymentSucceeded",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleInvoicePaymentFailed(invoice: Invoice) {
  try {
    const subscriptionId =
      CoreStripeService.extractSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      logger.warn("No subscription ID in invoice");
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { user: true },
    });

    if (!subscription) {
      logger.warn(
        { subscriptionId },
        "Subscription not found for invoice payment failure"
      );
      return;
    }

    // Update subscription status to past due
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });

    // Send payment failure email
    if (subscription.user) {
      await EmailService.sendPaymentFailedEmail({
        to: subscription.user.email,
        userName: getUserDisplayName(subscription.user),
        amount: invoice.amount_due / 100, // Convert from cents
        failureReason: CoreStripeService.mapInvoiceToFailureReason(invoice),
      });
    }

    logger.info(
      { subscriptionId, invoiceId: invoice.id },
      "Invoice payment failure processed"
    );
  } catch (error) {
    logger.error({ error }, "Error handling invoice payment failed");
    trackPaymentError("webhook", {
      handler: "handleInvoicePaymentFailed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleTrialWillEnd(subscription: Subscription) {
  try {
    const subscriptionId = subscription.id;
    const customerId =
      CoreStripeService.extractCustomerIdFromSubscription(subscription);

    if (!customerId) {
      logger.error("Missing customer ID in subscription");
      return;
    }

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      include: {
        workspace: true,
      },
    });

    if (!user) {
      logger.warn(
        { customerId, subscriptionId },
        "User not found for trial will end notification"
      );
      return;
    }

    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (user.workspace && dbSubscription) {
      await EmailService.sendTrialEndingEmail({
        to: user.email,
        name: getUserDisplayName(user),
        workspaceName: user.workspace.name,
        plan: dbSubscription.plan,
        trialEndDate: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : new Date().toISOString(),
      });
    }

    logger.info({ subscriptionId, userId: user.id }, "Trial ending email sent");
  } catch (error) {
    logger.error({ error }, "Error handling trial will end");
    trackPaymentError("webhook", {
      handler: "handleTrialWillEnd",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handlePaymentActionRequired(invoice: Invoice) {
  try {
    const subscriptionId =
      CoreStripeService.extractSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      logger.warn("No subscription ID in invoice");
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: {
        user: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!subscription) {
      logger.warn(
        { subscriptionId },
        "Subscription not found for payment action required"
      );
      return;
    }

    if (
      subscription.user &&
      subscription.user.workspace &&
      invoice.hosted_invoice_url
    ) {
      await EmailService.sendPaymentActionRequiredEmail({
        to: subscription.user.email,
        name: getUserDisplayName(subscription.user),
        workspaceName: subscription.user.workspace.name,
        plan: subscription.plan,
        invoiceUrl: invoice.hosted_invoice_url,
        amount: (invoice.amount_due / 100).toFixed(2),
        currency: invoice.currency.toUpperCase(),
      });
    }

    logger.info(
      { subscriptionId, invoiceId: invoice.id },
      "Payment action required email sent"
    );
  } catch (error) {
    logger.error({ error }, "Error handling payment action required");
    trackPaymentError("webhook", {
      handler: "handlePaymentActionRequired",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleUpcomingInvoice(invoice: Invoice) {
  try {
    const subscriptionId =
      CoreStripeService.extractSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      logger.warn("No subscription ID in invoice");
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { user: true },
    });

    if (!subscription) {
      logger.warn(
        { subscriptionId },
        "Subscription not found for upcoming invoice"
      );
      return;
    }

    // Optionally send email notification about upcoming invoice
    // This is typically handled by Stripe, but we can add custom logic here if needed
    logger.info(
      { subscriptionId, invoiceId: invoice.id },
      "Upcoming invoice processed"
    );
  } catch (error) {
    logger.error({ error }, "Error handling upcoming invoice");
    trackPaymentError("webhook", {
      handler: "handleUpcomingInvoice",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handlePaymentIntentFailed(paymentIntent: PaymentIntent) {
  try {
    logger.warn({ paymentIntentId: paymentIntent.id }, "Payment intent failed");
    // Add any custom logic for failed payment intents
  } catch (error) {
    logger.error({ error }, "Error handling payment intent failed");
    trackPaymentError("webhook", {
      handler: "handlePaymentIntentFailed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handlePaymentIntentSucceeded(
  paymentIntent: PaymentIntent
) {
  try {
    logger.info(
      { paymentIntentId: paymentIntent.id },
      "Payment intent succeeded"
    );
    // Add any custom logic for succeeded payment intents
  } catch (error) {
    logger.error({ error }, "Error handling payment intent succeeded");
    trackPaymentError("webhook", {
      handler: "handlePaymentIntentSucceeded",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleCustomerUpdated(customer: Customer) {
  try {
    const customerId = customer.id;

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.warn({ customerId }, "User not found for customer update");
      return;
    }

    // Update user email if it changed in Stripe
    if (customer.email && customer.email !== user.email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: customer.email },
      });

      logger.info(
        { userId: user.id, oldEmail: user.email, newEmail: customer.email },
        "User email updated from Stripe customer"
      );
    }
  } catch (error) {
    logger.error({ error }, "Error handling customer updated");
    trackPaymentError("webhook", {
      handler: "handleCustomerUpdated",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Helper functions
