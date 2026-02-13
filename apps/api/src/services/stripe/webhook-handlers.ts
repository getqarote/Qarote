import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import { getUserDisplayName } from "@/core/utils";

import { EmailService } from "@/services/email/email.service";
import { licenseService } from "@/services/license/license.service";
import { getLicenseFeaturesForTier } from "@/services/license/license-features.service";
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

import { emailConfig } from "@/config";

import {
  BillingInterval,
  SubscriptionStatus,
  UserPlan,
} from "@/generated/prisma/client";

// Note: This file contains webhook handlers that are used by the webhook controller
// These handlers process Stripe webhook events and update the database accordingly

/**
 * Calculate the number of days until a date expires
 * Returns 0 if the date has already passed (ensuring no negative values)
 */
function calculateDaysUntilExpiration(expiresAt: Date): number {
  const daysUntilExpiration = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysUntilExpiration);
}

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
    const subscriptionId = StripeService.extractSubscriptionId(session);
    return handleLicensePurchase(
      session,
      userId,
      plan,
      billingInterval,
      subscriptionId
    );
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
  billingInterval: string | undefined,
  subscriptionId: string | null = null
) {
  try {
    const customerId = StripeService.extractCustomerId(session);

    // Check if license already exists for this subscription (idempotency check)
    // For subscription-mode checkouts, we use subscriptionId instead of paymentIntentId
    // because payment_intent is null (payments happen via invoice)
    if (subscriptionId) {
      const existingLicense = await prisma.license.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });

      if (existingLicense) {
        logger.info(
          {
            licenseId: existingLicense.id,
            subscriptionId,
            userId,
          },
          "License already exists for this subscription, skipping duplicate generation"
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
      stripeSubscriptionId: subscriptionId || undefined, // Link to subscription for renewals and idempotency
    });

    logger.info(
      {
        licenseId,
        userId,
        plan,
        customerEmail: user.email,
      },
      "License created successfully"
    );

    // Generate and save signed license file (version 1)
    const features = getLicenseFeaturesForTier(plan);
    const licenseFileResult = await licenseService.generateLicenseFile({
      licenseKey,
      tier: plan,
      customerEmail: user.email,
      expiresAt,
      features,
    });

    // Save license file version for download
    await licenseService.saveLicenseFileVersion(
      licenseId,
      1, // Initial version
      JSON.stringify(licenseFileResult.licenseFile, null, 2),
      expiresAt
    );

    logger.info(
      {
        licenseId,
        version: 1,
        expiresAt: expiresAt.toISOString(),
      },
      "License file generated and saved for initial purchase"
    );

    // Send license delivery email
    const portalUrl = emailConfig.portalFrontendUrl;
    await EmailService.sendLicenseDeliveryEmail({
      to: user.email,
      userName: getUserDisplayName(user),
      licenseKey,
      tier: plan,
      expiresAt,
      downloadUrl: `${portalUrl}/licenses`,
    });
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
      include: { user: true },
    });

    if (existingSubscription) {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELED,
        },
      });

      logger.info({ subscriptionId }, "Subscription canceled successfully");

      // Deactivate associated licenses (if any)
      const licenses = await prisma.license.findMany({
        where: {
          stripeSubscriptionId: subscriptionId,
          isActive: true,
        },
      });

      if (licenses.length > 0) {
        await prisma.license.updateMany({
          where: {
            stripeSubscriptionId: subscriptionId,
          },
          data: {
            isActive: false,
          },
        });

        logger.info(
          {
            subscriptionId,
            licenseCount: licenses.length,
            licenseIds: licenses.map((l) => l.id),
          },
          "Licenses deactivated due to subscription cancellation"
        );

        // Send cancellation email for each license
        for (const license of licenses) {
          try {
            // Calculate grace period days (remaining time until expiration)
            const gracePeriodDays = calculateDaysUntilExpiration(
              license.expiresAt
            );

            // Send license cancellation email
            await EmailService.sendLicenseCancellationEmail({
              to: license.customerEmail,
              licenseKey: license.licenseKey,
              tier: license.tier,
              expiresAt: license.expiresAt,
              gracePeriodDays,
            });

            logger.info(
              {
                licenseId: license.id,
                gracePeriodDays,
                expiresAt: license.expiresAt.toISOString(),
              },
              "License cancellation email sent"
            );
          } catch (emailError) {
            logger.error(
              {
                error: emailError,
                licenseId: license.id,
                subscriptionId,
              },
              "Failed to send cancellation email for individual license"
            );
            // Continue processing other licenses even if one fails
          }
        }
      }
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

    // Check if this subscription has associated licenses (annual self-hosted licenses)
    const licenses = await prisma.license.findMany({
      where: {
        stripeSubscriptionId: subscriptionId,
        isActive: true,
      },
    });

    // Only process renewals if this is an actual renewal (subscription_cycle)
    // Not initial subscription payment (subscription_create)
    if (
      licenses.length > 0 &&
      invoice.billing_reason === "subscription_cycle"
    ) {
      logger.info(
        {
          subscriptionId,
          licenseCount: licenses.length,
          invoiceId: invoice.id,
          billingReason: invoice.billing_reason,
        },
        "Processing license renewal for subscription cycle"
      );

      for (const license of licenses) {
        try {
          // Idempotency check: Has this invoice already been processed for this license?
          const existingRenewal = await prisma.licenseFileVersion.findFirst({
            where: {
              licenseId: license.id,
              stripeInvoiceId: invoice.id,
            },
          });

          if (existingRenewal) {
            logger.info(
              {
                licenseId: license.id,
                invoiceId: invoice.id,
                existingVersion: existingRenewal.version,
              },
              "License renewal already processed for this invoice, skipping"
            );
            continue;
          }

          // Calculate new expiration date (365 days from now)
          const newExpiresAt = new Date();
          newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);

          // Renew license (updates expiresAt and increments version)
          const { newVersion } = await licenseService.renewLicense(
            license.id,
            newExpiresAt
          );

          // Generate new signed license file
          const features = getLicenseFeaturesForTier(license.tier);
          const licenseFileResult = await licenseService.generateLicenseFile({
            licenseKey: license.licenseKey,
            tier: license.tier,
            customerEmail: license.customerEmail,
            expiresAt: newExpiresAt,
            features: features as string[],
          });

          // Save license file version for historical access with invoice ID for idempotency
          await licenseService.saveLicenseFileVersion(
            license.id,
            newVersion,
            JSON.stringify(licenseFileResult.licenseFile, null, 2),
            newExpiresAt,
            invoice.id
          );

          // Send license renewal email with new file
          const portalUrl = emailConfig.portalFrontendUrl;
          await EmailService.sendLicenseRenewalEmail({
            to: license.customerEmail,
            licenseKey: license.licenseKey,
            tier: license.tier,
            previousExpiresAt: license.expiresAt,
            newExpiresAt,
            downloadUrl: `${portalUrl}/licenses`,
          });

          logger.info(
            {
              licenseId: license.id,
              invoiceId: invoice.id,
              newVersion,
              newExpiresAt: newExpiresAt.toISOString(),
              previousExpiresAt: license.expiresAt.toISOString(),
            },
            "License renewed, new file generated, and renewal email sent"
          );
        } catch (licenseError) {
          logger.error(
            {
              error: licenseError,
              licenseId: license.id,
              subscriptionId,
            },
            "Failed to renew individual license"
          );
          // Continue processing other licenses even if one fails
        }
      }
    } else if (licenses.length > 0) {
      // Licenses exist but this is not a renewal (likely initial subscription payment)
      logger.info(
        {
          subscriptionId,
          licenseCount: licenses.length,
          invoiceId: invoice.id,
          billingReason: invoice.billing_reason,
        },
        "Skipping renewal processing - not a subscription cycle (likely initial payment)"
      );
    }

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
      { subscriptionId, invoiceId: invoice.id, licenseCount: licenses.length },
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

    // Check if subscription has associated licenses
    const licenses = await prisma.license.findMany({
      where: {
        stripeSubscriptionId: subscriptionId,
        isActive: true,
      },
    });

    // Calculate days since first payment failure (for grace period tracking)
    // Stripe retries for 7 days, we allow 7 more = 14 days total
    const now = new Date();
    const gracePeriodEnd = new Date(subscription.currentPeriodEnd);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 14); // 14-day grace period

    const isInGracePeriod = now < gracePeriodEnd;
    const daysRemaining = Math.ceil(
      (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    logger.info(
      {
        subscriptionId,
        isInGracePeriod,
        daysRemaining,
        gracePeriodEnd: gracePeriodEnd.toISOString(),
      },
      "Payment failure - grace period status"
    );

    // If grace period expired, deactivate licenses
    if (!isInGracePeriod && licenses.length > 0) {
      await prisma.license.updateMany({
        where: {
          stripeSubscriptionId: subscriptionId,
        },
        data: {
          isActive: false,
        },
      });

      logger.info(
        {
          subscriptionId,
          licenseCount: licenses.length,
        },
        "Licenses deactivated after grace period expired"
      );
    }

    // Send payment failure email with grace period warning
    if (subscription.user) {
      await EmailService.sendPaymentFailedEmail({
        to: subscription.user.email,
        userName: getUserDisplayName(subscription.user),
        amount: invoice.amount_due / 100, // Convert from cents
        failureReason: CoreStripeService.mapInvoiceToFailureReason(invoice),
      });

      // Send license-specific emails based on grace period status
      if (licenses.length > 0) {
        for (const license of licenses) {
          try {
            if (isInGracePeriod) {
              // Still in grace period - send payment failed email with days remaining
              await EmailService.sendLicensePaymentFailedEmail({
                to: subscription.user.email,
                userName: getUserDisplayName(subscription.user),
                licenseKey: license.licenseKey,
                tier: license.tier,
                gracePeriodDays: daysRemaining,
                isInGracePeriod: true,
                willDeactivate: true,
              });

              logger.info(
                {
                  licenseId: license.id,
                  gracePeriodDays: daysRemaining,
                },
                "License payment failure email sent (in grace period)"
              );
            } else {
              // Grace period expired - send license expired email
              await EmailService.sendLicenseExpiredEmail({
                to: subscription.user.email,
                userName: getUserDisplayName(subscription.user),
                licenseKey: license.licenseKey,
                tier: license.tier,
                expiredAt: license.expiresAt || now,
                renewalUrl: `${emailConfig.portalFrontendUrl}/licenses`,
              });

              logger.info(
                {
                  licenseId: license.id,
                },
                "License expired email sent (grace period ended)"
              );
            }
          } catch (emailError) {
            logger.error(
              {
                error: emailError,
                licenseId: license.id,
                subscriptionId,
              },
              "Failed to send payment failure email for individual license"
            );
            // Continue processing other licenses even if one fails
          }
        }
      }
    }

    logger.info(
      { subscriptionId, invoiceId: invoice.id, licenseCount: licenses.length },
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
