import { addDays, addMonths, addYears } from "date-fns";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import { getUserDisplayName } from "@/core/utils";

import { EmailService } from "@/services/email/email.service";
import { licenseService } from "@/services/license/license.service";
import { getLicenseFeaturesForTier } from "@/services/license/license-features.service";
import { posthog } from "@/services/posthog";
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

    // Resolve org — Organization is the billing authority
    const org = customerId
      ? await resolveOrgFromStripeCustomerId(customerId)
      : null;

    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        },
      });
    }

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

    // Get current period dates safely (moved to item level in Stripe API 2025-03-31+)
    const firstItem = subscriptionData?.items?.data?.[0];
    const currentPeriodStart = firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000)
      : new Date(); // Fallback to current time

    const currentPeriodEnd = firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000)
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
        organizationId: org?.id ?? null,
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

    posthog?.capture({
      distinctId: userId,
      event: "subscription_purchased",
      properties: {
        plan,
        billing_interval: billingInterval ?? null,
        organization_id: org?.id ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        is_trial: subscriptionStatus !== SubscriptionStatus.ACTIVE,
      },
    });

    logger.info(`User ${userId} upgraded to ${plan}`);
  } catch (error) {
    logger.error({ error }, "Error handling checkout session completed");
    trackPaymentError(
      "webhook",
      {
        handler: "handleCheckoutSessionCompleted",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
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
    const now = new Date();
    const expiresAt =
      billingInterval === "yearly" ? addYears(now, 1) : addMonths(now, 1);

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

    // Generate and save signed license JWT (version 1)
    const features = getLicenseFeaturesForTier(plan);
    const licenseJwt = await licenseService.generateLicenseJwt({
      licenseId,
      tier: plan,
      features,
      expiresAt,
    });

    // Save license JWT version for download
    await licenseService.saveLicenseFileVersion(
      licenseId,
      1, // Initial version
      licenseJwt,
      expiresAt
    );

    logger.info(
      {
        licenseId,
        version: 1,
        expiresAt: expiresAt.toISOString(),
      },
      "License JWT generated and saved for initial purchase"
    );

    // Send license delivery email
    await EmailService.sendLicenseDeliveryEmail({
      to: user.email,
      userName: getUserDisplayName(user),
      licenseKey,
      tier: plan,
      expiresAt,
    });

    try {
      posthog?.capture({
        distinctId: userId,
        event: "license_purchased",
        properties: {
          plan,
          billing_interval: billingInterval ?? null,
          license_id: licenseId,
          expires_at: expiresAt.toISOString(),
          stripe_subscription_id: subscriptionId,
        },
      });
    } catch (analyticsError) {
      logger.error(
        { error: analyticsError, userId, licenseId },
        "PostHog license_purchased tracking failed"
      );
    }
  } catch (error) {
    logger.error({ error }, "Error handling license purchase");
    trackPaymentError(
      "webhook",
      {
        handler: "handleLicensePurchase",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
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

    // Resolve org from Stripe customer — Organization is billing authority
    const org = await resolveOrgFromStripeCustomerId(customerId);

    const subscriptionFirstItem = subscription.items?.data?.[0];
    const priceId = subscriptionFirstItem?.price?.id || "";
    const priceAmount = subscriptionFirstItem?.price?.unit_amount || 0;

    const mappedPlan = CoreStripeService.mapStripePlanToUserPlan(priceId);
    if (!mappedPlan) {
      logger.warn(
        { priceId, subscriptionId },
        "Unmapped Stripe price ID — skipping plan field to avoid silent downgrade"
      );
    }

    const subscriptionData = {
      stripePriceId: priceId,
      stripeCustomerId: customerId,
      ...(mappedPlan ? { plan: mappedPlan } : {}),
      status: CoreStripeService.mapStripeStatusToSubscriptionStatus(
        subscription.status
      ),
      billingInterval: CoreStripeService.mapStripeBillingInterval(
        subscriptionFirstItem?.price?.recurring?.interval
      ),
      pricePerMonth: priceAmount,
      currentPeriodStart: subscriptionFirstItem?.current_period_start
        ? new Date(subscriptionFirstItem.current_period_start * 1000)
        : new Date(),
      currentPeriodEnd: subscriptionFirstItem?.current_period_end
        ? new Date(subscriptionFirstItem.current_period_end * 1000)
        : new Date(),
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    };

    // Check if a subscription record already exists (update-only path doesn't need userId)
    const existingSub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          ...subscriptionData,
          ...(org ? { organizationId: org.id } : {}),
        },
      });
    } else if (org) {
      // New subscription with org context — find owner for userId linkage
      const ownerMember = await prisma.organizationMember.findFirst({
        where: { organizationId: org.id, role: "OWNER" },
        select: { userId: true },
      });

      if (!ownerMember) {
        logger.error(
          { organizationId: org.id, subscriptionId },
          "Cannot create subscription: organization has no OWNER member"
        );
        return;
      }

      if (!mappedPlan) {
        logger.error(
          { priceId, subscriptionId },
          "Cannot create subscription: unmapped Stripe price ID"
        );
        throw new Error(
          `Unmapped Stripe price ID: ${priceId} — cannot create subscription`
        );
      }

      await prisma.subscription.create({
        data: {
          userId: ownerMember.userId,
          organizationId: org.id,
          stripeSubscriptionId: subscriptionId,
          ...subscriptionData,
          plan: mappedPlan,
        },
      });
    } else {
      // Legacy user-scoped customer with no org — look up user by stripeCustomerId
      const legacyUser = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
        select: { userId: true },
      });

      if (!legacyUser) {
        logger.warn(
          { customerId, subscriptionId },
          "No organization or legacy user found for subscription — skipping"
        );
        return;
      }

      if (!mappedPlan) {
        logger.error(
          { priceId, subscriptionId },
          "Cannot create subscription: unmapped Stripe price ID"
        );
        throw new Error(
          `Unmapped Stripe price ID: ${priceId} — cannot create subscription`
        );
      }

      await prisma.subscription.create({
        data: {
          userId: legacyUser.userId,
          stripeSubscriptionId: subscriptionId,
          ...subscriptionData,
          plan: mappedPlan,
        },
      });
    }

    // Update Organization stripe fields when org context is available
    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        },
      });
    }

    logger.info(
      {
        subscriptionId,
        ...(org ? { organizationId: org.id } : { customerId }),
      },
      "Subscription updated successfully"
    );
  } catch (error) {
    logger.error({ error }, "Error handling subscription change");
    trackPaymentError(
      "webhook",
      {
        handler: "handleSubscriptionChange",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
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

      try {
        posthog?.capture({
          distinctId: existingSubscription.userId,
          event: "subscription_churned",
          properties: {
            plan: existingSubscription.plan,
            billing_interval: existingSubscription.billingInterval,
            organization_id: existingSubscription.organizationId ?? null,
            stripe_subscription_id: subscriptionId,
          },
        });
      } catch (analyticsError) {
        logger.error(
          { error: analyticsError, subscriptionId },
          "PostHog subscription_churned tracking failed"
        );
      }

      logger.info({ subscriptionId }, "Subscription canceled successfully");

      posthog?.capture({
        distinctId: existingSubscription.userId,
        event: "subscription_churned",
        properties: {
          plan: existingSubscription.plan,
          stripe_subscription_id: subscriptionId,
          organization_id: existingSubscription.organizationId,
        },
      });

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
    trackPaymentError(
      "webhook",
      {
        handler: "handleCustomerSubscriptionDeleted",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
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

          // Calculate new expiration date (1 year from now)
          const newExpiresAt = addYears(new Date(), 1);

          // Renew license (updates expiresAt and increments version)
          const { newVersion } = await licenseService.renewLicense(
            license.id,
            newExpiresAt
          );

          // Generate new signed license JWT
          const features = getLicenseFeaturesForTier(license.tier);
          const licenseJwt = await licenseService.generateLicenseJwt({
            licenseId: license.id,
            tier: license.tier,
            features: features as string[],
            expiresAt: newExpiresAt,
          });

          // Save license JWT version for historical access with invoice ID for idempotency
          await licenseService.saveLicenseFileVersion(
            license.id,
            newVersion,
            licenseJwt,
            newExpiresAt,
            invoice.id
          );

          // Send license renewal email
          await EmailService.sendLicenseRenewalEmail({
            to: license.customerEmail,
            licenseKey: license.licenseKey,
            tier: license.tier,
            previousExpiresAt: license.expiresAt,
            newExpiresAt,
          });

          logger.info(
            {
              licenseId: license.id,
              invoiceId: invoice.id,
              newVersion,
              newExpiresAt: newExpiresAt.toISOString(),
              previousExpiresAt: license.expiresAt.toISOString(),
            },
            "License renewed, new JWT generated, and renewal email sent"
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

    // Send payment confirmation email (skip $0 invoices from trials/free signups)
    if (subscription.user && invoice.amount_paid > 0) {
      await EmailService.sendPaymentConfirmationEmail({
        to: subscription.user.email,
        userName: getUserDisplayName(subscription.user),
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency.toUpperCase(),
        // In Stripe API 2025-03-31+, payment_intent was removed from Invoice.
        // Default to "card" since payment method details require payments expansion.
        paymentMethod: "card",
      });
    }

    logger.info(
      { subscriptionId, invoiceId: invoice.id, licenseCount: licenses.length },
      "Invoice payment processed successfully"
    );
  } catch (error) {
    logger.error({ error }, "Error handling invoice payment succeeded");
    trackPaymentError(
      "webhook",
      {
        handler: "handleInvoicePaymentSucceeded",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
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
    const gracePeriodEnd = addDays(subscription.currentPeriodEnd, 14); // 14-day grace period

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
    trackPaymentError(
      "webhook",
      {
        handler: "handleInvoicePaymentFailed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
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

    // Resolve org from Stripe customer, then find owner for email
    const org = await prisma.organization.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true, name: true },
    });
    if (!org) {
      logger.warn(
        { customerId, subscriptionId },
        "Organization not found for trial will end notification"
      );
      return;
    }

    const ownerMember = await prisma.organizationMember.findFirst({
      where: { organizationId: org.id, role: "OWNER" },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    const user = ownerMember?.user;

    if (!user) {
      logger.warn(
        { customerId, subscriptionId, organizationId: org.id },
        "Owner not found for trial will end notification"
      );
      return;
    }

    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (dbSubscription) {
      await EmailService.sendTrialEndingEmail({
        to: user.email,
        name: getUserDisplayName(user),
        workspaceName: org.name,
        plan: dbSubscription.plan,
        trialEndDate: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : new Date().toISOString(),
      });
      logger.info(
        { subscriptionId, organizationId: org.id },
        "Trial ending email sent"
      );
    } else {
      logger.debug(
        {
          subscriptionId,
          organizationId: org.id,
          hasDbSubscription: false,
        },
        "Trial ending email skipped — subscription not found"
      );
    }
  } catch (error) {
    logger.error({ error }, "Error handling trial will end");
    trackPaymentError(
      "webhook",
      {
        handler: "handleTrialWillEnd",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
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
    trackPaymentError(
      "webhook",
      {
        handler: "handlePaymentActionRequired",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
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
    trackPaymentError(
      "webhook",
      {
        handler: "handleUpcomingInvoice",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
  }
}

export async function handlePaymentIntentFailed(paymentIntent: PaymentIntent) {
  try {
    logger.warn({ paymentIntentId: paymentIntent.id }, "Payment intent failed");
    // Add any custom logic for failed payment intents
  } catch (error) {
    logger.error({ error }, "Error handling payment intent failed");
    trackPaymentError(
      "webhook",
      {
        handler: "handlePaymentIntentFailed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
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
    trackPaymentError(
      "webhook",
      {
        handler: "handlePaymentIntentSucceeded",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      error
    );
  }
}

export async function handleCustomerUpdated(customer: Customer) {
  try {
    const customerId = customer.id;

    // Resolve org from Stripe customer
    const org = await resolveOrgFromStripeCustomerId(customerId);
    if (!org) {
      logger.warn({ customerId }, "Organization not found for customer update");
      return;
    }

    // Update org contact email if changed in Stripe
    if (customer.email) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { contactEmail: customer.email },
      });

      logger.info(
        { organizationId: org.id, newEmail: customer.email },
        "Organization contact email updated from Stripe customer"
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

/**
 * Resolve the Organization that owns a given Stripe customer ID.
 * Returns null if no org is found (backward compat for user-only customers).
 */
async function resolveOrgFromStripeCustomerId(
  customerId: string
): Promise<{ id: string } | null> {
  return prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
}
