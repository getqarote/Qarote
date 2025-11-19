import {
  UserPlan,
  SubscriptionStatus,
  PaymentStatus,
  BillingInterval,
} from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { trackPaymentError } from "@/services/sentry";
import {
  StripeService,
  Session,
  Subscription,
  Invoice,
  Customer,
  PaymentIntent,
} from "@/services/stripe/stripe.service";
import { EmailService } from "@/services/email/email.service";
import { getUserDisplayName } from "../shared";
import { generatePaymentDescription } from "@/utils/payment-description.utils";

export async function handleCheckoutSessionCompleted(session: Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as UserPlan;
  const billingInterval = session.metadata?.billingInterval;

  if (!userId || !plan) {
    logger.error("Missing metadata in checkout session");
    return;
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
    const hasTrial =
      subscriptionData?.trial_start && subscriptionData?.trial_end;
    const subscriptionStatus = hasTrial
      ? SubscriptionStatus.TRIALING
      : SubscriptionStatus.ACTIVE;

    await prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscriptionId!,
        stripePriceId: subscriptionData?.items?.data?.[0]?.price?.id || "",
        stripeCustomerId: customerId!,
        plan,
        status: subscriptionStatus,
        billingInterval: billingInterval
          ? mapStripeBillingIntervalToBillingInterval(billingInterval)
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
      ? mapStripeBillingIntervalToBillingInterval(billingInterval)
      : BillingInterval.MONTH;

    await EmailService.sendUpgradeConfirmationEmail({
      to: user.email,
      userName: getUserDisplayName(user),
      workspaceName: "your workspaces", // Generic since it applies to all workspaces
      plan,
      billingInterval: mapBillingIntervalToString(billingIntervalEnum),
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

export async function handleSubscriptionChange(subscription: Subscription) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(subscription);

    if (!customerId) {
      logger.error("Missing customer ID in subscription");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    const stripePriceId = subscription.items.data[0]?.price?.id;
    const plan = StripeService.mapStripePlanToUserPlan(stripePriceId);
    const billingInterval = StripeService.getBillingInterval(stripePriceId);

    if (!plan || !billingInterval) {
      logger.error(`Could not map Stripe price ${stripePriceId} to user plan`);
      return;
    }

    // Check if this is a renewal after cancellation
    const existingSubscription = user.subscription;
    const isRenewalAfterCancel =
      existingSubscription &&
      existingSubscription.status === SubscriptionStatus.CANCELED &&
      existingSubscription.canceledAt &&
      subscription.status === "active";

    // Prepare subscription update data
    const subscriptionUpdateData = {
      status: mapStripeStatusToSubscriptionStatus(subscription.status),
      plan,
      billingInterval:
        mapStripeBillingIntervalToBillingInterval(billingInterval),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      // Set renewal tracking fields if this is a renewal after cancellation
      ...(isRenewalAfterCancel && {
        isRenewalAfterCancel: true,
        previousCancelDate: existingSubscription.canceledAt,
      }),
    };

    // Update or create subscription record
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: subscriptionUpdateData,
      create: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId,
        stripeCustomerId: customerId,
        status: mapStripeStatusToSubscriptionStatus(subscription.status),
        plan,
        billingInterval:
          mapStripeBillingIntervalToBillingInterval(billingInterval),
        pricePerMonth: subscription.items.data[0]?.price?.unit_amount || 0,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    if (subscription.status === "active") {
      // Send welcome back email if this is a renewal after cancellation
      if (isRenewalAfterCancel) {
        try {
          await EmailService.sendWelcomeBackEmail({
            to: user.email,
            userName: getUserDisplayName(user),
            workspaceName: "your workspaces",
            plan,
            billingInterval,
            previousCancelDate: existingSubscription.canceledAt?.toISOString(),
          });

          logger.info(
            `Welcome back email sent for user ${user.id} - user renewed after cancellation`
          );
        } catch (emailError) {
          logger.error(
            {
              userId: user.id,
              error: emailError,
            },
            "Failed to send welcome back email:"
          );
        }
      }
    }

    logger.info(
      `Subscription updated for user ${user.id}: ${plan} (${subscription.status})${
        isRenewalAfterCancel ? " - RENEWAL AFTER CANCELLATION" : ""
      }`
    );
  } catch (error) {
    logger.error({ error }, "Error handling subscription change");
    trackPaymentError("webhook", {
      handler: "handleSubscriptionChange",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handleSubscriptionDeleted(subscription: Subscription) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(subscription);

    if (!customerId) {
      logger.error("Missing customer ID in subscription deletion");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    logger.info(`User ${user.id} subscription deleted`);
  } catch (error) {
    logger.error({ error }, "Error handling subscription deletion");
    trackPaymentError("webhook", {
      handler: "handleSubscriptionDeleted",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handleInvoicePaymentSucceeded(invoice: Invoice) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(invoice);

    if (!customerId) {
      logger.error("Missing customer ID in invoice");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    // Create payment record
    // For $0 invoices (e.g., trial periods), payment_intent and charge can be null
    // Use invoice ID as fallback for stripePaymentId when payment_intent is null
    const paymentIntentId =
      extractStringIdOrNull(invoice.payment_intent) || invoice.id;
    const chargeId = extractStringIdOrNull(invoice.charge);
    const subscriptionId = extractStringId(invoice.subscription);

    await prisma.payment.create({
      data: {
        userId: user.id,
        stripePaymentId: paymentIntentId,
        stripeInvoiceId: invoice.id,
        stripeChargeId: chargeId,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: PaymentStatus.SUCCEEDED,
        description:
          invoice.description ||
          generatePaymentDescription(
            subscriptionId,
            (await getPlanFromSubscription(subscriptionId)) || "UNKNOWN",
            (await getBillingIntervalFromSubscription(subscriptionId)) ||
              "MONTH"
          ),
        plan: await getPlanFromSubscription(subscriptionId),
        billingInterval:
          await getBillingIntervalFromSubscription(subscriptionId),
        periodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : null,
        periodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null,
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
        receiptUrl: getInvoiceReceiptUrl(invoice),
        invoiceUrl: getInvoiceHostedUrl(invoice),
        metadata: invoice.metadata || undefined,
      },
    });

    logger.info(
      `Payment recorded for user ${user.id}: ${invoice.amount_paid} ${invoice.currency}`
    );
  } catch (error) {
    logger.error({ error }, "Error handling invoice payment succeeded");
    trackPaymentError("webhook", {
      handler: "handleInvoicePaymentSucceeded",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handleInvoicePaymentFailed(invoice: Invoice) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(invoice);

    if (!customerId) {
      logger.error("Missing customer ID in invoice");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    // Create payment record for failed payment
    // For $0 invoices, payment_intent and charge can be null
    // Use invoice ID as fallback for stripePaymentId when payment_intent is null
    const paymentIntentId =
      extractStringIdOrNull(invoice.payment_intent) || invoice.id;
    const chargeId = extractStringIdOrNull(invoice.charge);
    const subscriptionId = extractStringId(invoice.subscription);

    await prisma.payment.create({
      data: {
        userId: user.id,
        stripePaymentId: paymentIntentId,
        stripeInvoiceId: invoice.id,
        stripeChargeId: chargeId,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: PaymentStatus.FAILED,
        description:
          invoice.description ||
          generatePaymentDescription(
            subscriptionId,
            (await getPlanFromSubscription(subscriptionId)) || "UNKNOWN",
            (await getBillingIntervalFromSubscription(subscriptionId)) ||
              "MONTH",
            true
          ),
        plan: await getPlanFromSubscription(subscriptionId),
        billingInterval:
          await getBillingIntervalFromSubscription(subscriptionId),
        periodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : null,
        periodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null,
        failureCode:
          getInvoiceLastPaymentAttempt(invoice)?.payment_intent
            ?.last_payment_error?.code,
        failureMessage:
          getInvoiceLastPaymentAttempt(invoice)?.payment_intent
            ?.last_payment_error?.message,
        metadata: invoice.metadata || undefined,
      },
    });

    logger.info(
      `Failed payment recorded for user ${user.id}: ${invoice.amount_due} ${invoice.currency}`
    );

    // Track payment error metric
    const lastPaymentAttempt = getInvoiceLastPaymentAttempt(invoice);
    trackPaymentError("invoice_failed", {
      user_id: user.id,
      invoice_id: invoice.id,
      amount: String(invoice.amount_due),
      currency: invoice.currency || "unknown",
      failure_code:
        lastPaymentAttempt?.payment_intent?.last_payment_error?.code ||
        "unknown",
    });
  } catch (error) {
    logger.error({ error }, "Error handling invoice payment failed");
    trackPaymentError("webhook", {
      handler: "handleInvoicePaymentFailed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handleCustomerSubscriptionDeleted(
  subscription: Subscription
) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(subscription);

    if (!customerId) {
      logger.error("Missing customer ID in subscription deletion");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    // Update subscription status (plans are now user-level)
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    logger.info(`User ${user.id} subscription deleted`);
  } catch (error) {
    logger.error({ error }, "Error handling customer subscription deleted");
    trackPaymentError("webhook", {
      handler: "handleCustomerSubscriptionDeleted",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handleTrialWillEnd(subscription: Subscription) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(subscription);

    if (!customerId) {
      logger.error("Missing customer ID in trial will end event");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    await EmailService.sendTrialEndingEmail({
      to: user.email,
      name: getUserDisplayName(user),
      workspaceName: "your workspaces",
      plan: UserPlan.FREE,
      trialEndDate: new Date(subscription.trial_end! * 1000).toISOString(),
    });

    logger.info(`Trial ending notification sent for user ${user.id}`);
  } catch (error) {
    logger.error({ error }, "Error handling trial will end");
    trackPaymentError("webhook", {
      handler: "handleTrialWillEnd",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handlePaymentActionRequired(invoice: Invoice) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(invoice);

    if (!customerId) {
      logger.error("Missing customer ID in payment action required event");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    // Send payment action required email
    await EmailService.sendPaymentActionRequiredEmail({
      to: user.email,
      name: getUserDisplayName(user),
      workspaceName: "your workspaces",
      plan: UserPlan.FREE, // Default plan
      invoiceUrl: getInvoiceHostedUrl(invoice) || "",
      amount: (invoice.amount_due / 100).toFixed(2),
      currency: invoice.currency.toUpperCase(),
    });

    logger.info(
      `Payment action required notification sent for user ${user.id}`
    );
  } catch (error) {
    logger.error({ error }, "Error handling payment action required");
    trackPaymentError("webhook", {
      handler: "handlePaymentActionRequired",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handleUpcomingInvoice(invoice: Invoice) {
  try {
    const customerId = StripeService.extractCustomerIdFromObject(invoice);

    if (!customerId) {
      logger.error("Missing customer ID in upcoming invoice event");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    // Send upcoming invoice notification email
    await EmailService.sendUpcomingInvoiceEmail({
      to: user.email,
      name: getUserDisplayName(user),
      workspaceName: "your workspaces",
      plan: UserPlan.FREE, // Default plan
      amount: (invoice.amount_due / 100).toFixed(2),
      currency: invoice.currency.toUpperCase(),
      invoiceDate: new Date(invoice.period_start * 1000).toISOString(),
      nextBillingDate: new Date(invoice.period_end * 1000).toISOString(),
    });

    logger.info(`Upcoming invoice notification sent for user ${user.id}`);
  } catch (error) {
    logger.error({ error }, "Error handling upcoming invoice");
    trackPaymentError("webhook", {
      handler: "handleUpcomingInvoice",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handlePaymentIntentFailed(paymentIntent: PaymentIntent) {
  try {
    const customerId = extractStringId(paymentIntent.customer);

    if (!customerId) {
      logger.error("Missing customer ID in payment intent failed event");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    // Send payment failed notification email
    await EmailService.sendPaymentFailedEmail({
      to: user.email,
      userName: getUserDisplayName(user),
      amount: paymentIntent.amount / 100, // Convert from cents
      failureReason:
        paymentIntent.last_payment_error?.message || "Payment failed",
    });

    logger.info(`Payment failed notification sent for user ${user.id}`);

    // Track payment error metric
    trackPaymentError("payment_intent_failed", {
      user_id: user.id,
      payment_intent_id: paymentIntent.id,
      amount: String(paymentIntent.amount),
      currency: paymentIntent.currency || "unknown",
      failure_code: paymentIntent.last_payment_error?.code || "unknown",
    });
  } catch (error) {
    logger.error({ error }, "Error handling payment intent failed");
    trackPaymentError("webhook", {
      handler: "handlePaymentIntentFailed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handlePaymentIntentSucceeded(
  paymentIntent: PaymentIntent
) {
  try {
    const customerId = extractStringId(paymentIntent.customer);

    if (!customerId) {
      logger.error("Missing customer ID in payment intent succeeded event");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error(`User not found for customer ${customerId}`);
      return;
    }

    // Log successful payment
    logger.info(
      `Payment intent succeeded for user ${user.id}: ${paymentIntent.amount / 100} ${paymentIntent.currency}`
    );

    // Optional: Send payment confirmation email
    await EmailService.sendPaymentConfirmationEmail({
      to: user.email,
      userName: getUserDisplayName(user),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      paymentMethod:
        typeof paymentIntent.payment_method === "object" &&
        paymentIntent.payment_method?.type
          ? paymentIntent.payment_method.type
          : "card",
    });

    // Optional: Update any payment-related metrics or analytics
    // This could be useful for tracking successful payments
    logger.info(`Payment intent ${paymentIntent.id} processed successfully`);
  } catch (error) {
    logger.error({ error }, "Error handling payment intent succeeded");
    trackPaymentError("webhook", {
      handler: "handlePaymentIntentSucceeded",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handleCustomerUpdated(customer: Customer) {
  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customer.id },
    });

    if (!user) {
      logger.error(`User not found for customer ${customer.id}`);
      return;
    }

    // Update user information if needed (e.g., email changes)
    const updateData: any = {};

    if (customer.email && customer.email !== user.email) {
      updateData.email = customer.email;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      logger.info(`User ${user.id} updated from customer changes`);
    }

    logger.info(`Customer updated event processed for user ${user.id}`);
  } catch (error) {
    logger.error({ error }, "Error handling customer updated");
    trackPaymentError("webhook", {
      handler: "handleCustomerUpdated",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// Helper functions
export function extractStringId(value: string | object | null): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    return (value as any).id;
  }
  throw new Error(`Unable to extract ID from value: ${JSON.stringify(value)}`);
}

/**
 * Extracts a string ID from a value, returning null if the value is null.
 * Useful for optional fields like charge or payment_intent which can be null for $0 invoices.
 */
export function extractStringIdOrNull(
  value: string | object | null
): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && "id" in value) {
    return (value as any).id;
  }
  return null;
}

function getInvoiceReceiptUrl(invoice: Invoice): string | null {
  // receipt_url might be available on the invoice object but not in the main type definition
  return (invoice as any).receipt_url || null;
}

function getInvoiceHostedUrl(invoice: Invoice): string | null {
  return invoice.hosted_invoice_url || null;
}

function getInvoiceLastPaymentAttempt(invoice: Invoice): any | null {
  // last_payment_attempt might be available on the invoice object but not in the main type definition
  return (invoice as any).last_payment_attempt || null;
}

export function mapStripeStatusToSubscriptionStatus(
  stripeStatus: string
): SubscriptionStatus {
  switch (stripeStatus.toUpperCase()) {
    case "ACTIVE":
      return SubscriptionStatus.ACTIVE;
    case "PAST_DUE":
      return SubscriptionStatus.PAST_DUE;
    case "CANCELED":
    case "CANCELLED":
      return SubscriptionStatus.CANCELED;
    case "INCOMPLETE":
      return SubscriptionStatus.INCOMPLETE;
    case "INCOMPLETE_EXPIRED":
      return SubscriptionStatus.INCOMPLETE_EXPIRED;
    default:
      return SubscriptionStatus.ACTIVE; // Default fallback
  }
}

function mapStripeBillingIntervalToBillingInterval(
  interval: string
): BillingInterval {
  switch (interval.toUpperCase()) {
    case "MONTH":
    case "MONTHLY":
      return BillingInterval.MONTH;
    case "YEAR":
    case "YEARLY":
      return BillingInterval.YEAR;
    default:
      return BillingInterval.MONTH; // Default fallback
  }
}

function mapBillingIntervalToString(
  interval: BillingInterval
): "monthly" | "yearly" {
  switch (interval) {
    case BillingInterval.MONTH:
      return "monthly";
    case BillingInterval.YEAR:
      return "yearly";
    default:
      return "monthly"; // Default fallback
  }
}

async function getPlanFromSubscription(
  subscriptionId: string
): Promise<UserPlan | null> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { plan: true },
    });
    return subscription?.plan || null;
  } catch (error) {
    logger.error({ error }, "Error getting plan from subscription");
    return null;
  }
}

async function getBillingIntervalFromSubscription(
  subscriptionId: string
): Promise<BillingInterval | null> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { billingInterval: true },
    });
    return subscription?.billingInterval || null;
  } catch (error) {
    logger.error({ error }, "Error getting billing interval from subscription");
    return null;
  }
}
