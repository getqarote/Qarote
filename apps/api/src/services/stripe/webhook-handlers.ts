import { addDays, addMonths, addYears } from "date-fns";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import { getUserDisplayName } from "@/core/utils";

import { licenseService } from "@/services/license/license.service";
import { getLicenseFeaturesForTier } from "@/services/license/license-features.service";
import { enqueueNotification } from "@/services/notification/notification-outbox.service";
import { trackEvent } from "@/services/posthog";
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
  OrgRole,
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

export async function handleCheckoutSessionCompleted(
  session: Session,
  stripeEventId?: string
) {
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
      subscriptionId,
      stripeEventId
    );
  }

  try {
    // Use static methods for extraction
    const customerId = StripeService.extractCustomerId(session);
    const subscriptionId = StripeService.extractSubscriptionId(session);

    // Resolve org — Organization is the billing authority. Without it we
    // cannot create an org-scoped Subscription row (Fail Fast — surface the
    // missing link instead of writing a headless subscription).
    const org = customerId
      ? await resolveOrgFromStripeCustomerId(customerId)
      : null;

    if (!org) {
      logger.error(
        { customerId, subscriptionId, userId },
        "No organization resolved for checkout session — cannot create subscription"
      );
      return;
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
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

    const billingIntervalEnum = billingInterval
      ? CoreStripeService.mapStripeBillingIntervalToBillingInterval(
          billingInterval
        )
      : BillingInterval.MONTH;

    // Outbox: subscription create + welcome email enqueue commit atomically.
    // If we crash between them, neither is persisted and Stripe's retry
    // re-runs the whole handler.
    await prisma.$transaction(async (tx) => {
      await tx.subscription.create({
        data: {
          organizationId: org.id,
          stripeSubscriptionId: subscriptionId!,
          stripePriceId: subscriptionData?.items?.data?.[0]?.price?.id || "",
          stripeCustomerId: customerId!,
          plan,
          status: subscriptionStatus,
          billingInterval: billingIntervalEnum,
          pricePerMonth:
            subscriptionData?.items?.data?.[0]?.price?.unit_amount || 0,
          currentPeriodStart,
          currentPeriodEnd,
          trialStart: subscriptionData?.trial_start
            ? new Date(subscriptionData.trial_start * 1000)
            : null,
          trialEnd: subscriptionData?.trial_end
            ? new Date(subscriptionData.trial_end * 1000)
            : null,
          cancelAtPeriodEnd: subscriptionData?.cancel_at_period_end || false,
        },
      });

      await enqueueNotification(
        {
          channel: "email",
          template: "upgrade_confirmation",
          target: user.email,
          idempotencyKey: `email:checkout_session:${session.id}:upgrade_confirmation`,
          payload: {
            userName: getUserDisplayName(user),
            workspaceName: "your workspaces",
            plan,
            billingInterval:
              CoreStripeService.mapBillingIntervalToString(billingIntervalEnum),
          },
        },
        tx
      );
    });

    trackEvent(
      {
        distinctId: userId,
        superProperties: {
          app: "api",
          organization_id: org.id,
        },
        insertId: stripeEventId,
      },
      "subscription_purchased",
      {
        plan,
        billing_interval: billingInterval ?? null,
        organization_id: org.id,
        stripe_subscription_id: subscriptionId ?? null,
        is_trial: subscriptionStatus !== SubscriptionStatus.ACTIVE,
      }
    );

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
  subscriptionId: string | null = null,
  stripeEventId?: string
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

    // Outbox: license create + JWT version save + delivery email enqueue
    // commit atomically. Without this, a crash between the license.create
    // and saveLicenseFileVersion would leave a License persisted with no
    // version and no email — and the existing-license idempotency check
    // on Stripe retry would short-circuit before recovering. Generating
    // the JWT itself has no DB write so it stays outside the transaction.
    const features = getLicenseFeaturesForTier(plan);
    const { licenseId } = await prisma.$transaction(async (tx) => {
      const created = await licenseService.generateLicense(
        {
          tier: plan,
          customerEmail: user.email,
          workspaceId: user.workspaceId || undefined,
          expiresAt,
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: subscriptionId || undefined,
        },
        tx
      );

      const licenseJwt = await licenseService.generateLicenseJwt({
        licenseId: created.licenseId,
        tier: plan,
        features,
        expiresAt,
      });

      await licenseService.saveLicenseFileVersion(
        created.licenseId,
        1,
        licenseJwt,
        expiresAt,
        undefined,
        tx
      );

      await enqueueNotification(
        {
          channel: "email",
          template: "license_delivery",
          target: user.email,
          idempotencyKey: `email:checkout_session:${session.id}:license_delivery:${created.licenseId}`,
          payload: {
            userName: getUserDisplayName(user),
            licenseKey: created.licenseKey,
            tier: plan,
            expiresAt: expiresAt.toISOString(),
          },
        },
        tx
      );

      return created;
    });

    logger.info(
      {
        licenseId,
        userId,
        plan,
        customerEmail: user.email,
        version: 1,
        expiresAt: expiresAt.toISOString(),
      },
      "License created + JWT saved + delivery email enqueued"
    );

    try {
      trackEvent(
        {
          distinctId: userId,
          superProperties: { app: "api" },
          insertId: stripeEventId,
        },
        "license_purchased",
        {
          plan,
          billing_interval: billingInterval ?? null,
          license_id: licenseId,
          expires_at: expiresAt.toISOString(),
          stripe_subscription_id: subscriptionId,
        }
      );
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

    // Check if a subscription record already exists
    const existingSub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (existingSub) {
      // organizationId is immutable once set — update only the mutable fields.
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: subscriptionData,
      });
    } else {
      // New subscription — Organization is the billing authority and is
      // required. No org resolvable from the Stripe customer → skip (Fail Fast).
      if (!org) {
        logger.warn(
          { customerId, subscriptionId },
          "No organization found for new subscription — skipping"
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
          organizationId: org.id,
          stripeSubscriptionId: subscriptionId,
          ...subscriptionData,
          plan: mappedPlan,
        },
      });
    }

    // Keep the org's Stripe customer id (the webhook lookup index) in sync.
    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
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
  subscription: Subscription,
  stripeEventId?: string
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

      // Attribute churn to the org OWNER — the same identity as the purchase.
      const owner = await resolveOrgOwnerUser(
        existingSubscription.organizationId
      );

      try {
        trackEvent(
          {
            distinctId: owner?.id ?? existingSubscription.organizationId,
            superProperties: {
              app: "api",
              organization_id: existingSubscription.organizationId,
            },
            insertId: stripeEventId,
          },
          "subscription_churned",
          {
            plan: existingSubscription.plan,
            billing_interval: existingSubscription.billingInterval,
            organization_id: existingSubscription.organizationId,
            stripe_subscription_id: subscriptionId,
          }
        );
      } catch (analyticsError) {
        logger.error(
          { error: analyticsError, subscriptionId },
          "PostHog subscription_churned tracking failed"
        );
      }

      logger.info({ subscriptionId }, "Subscription canceled successfully");

      // Deactivate associated licenses (if any)
      const licenses = await prisma.license.findMany({
        where: {
          stripeSubscriptionId: subscriptionId,
          isActive: true,
        },
      });

      if (licenses.length > 0) {
        // Outbox: deactivate + per-license cancellation enqueues commit
        // atomically. Stripe retries hit the unique idempotencyKey on the
        // outbox row and become enqueue no-ops.
        await prisma.$transaction(async (tx) => {
          await tx.license.updateMany({
            where: {
              stripeSubscriptionId: subscriptionId,
            },
            data: {
              isActive: false,
            },
          });

          for (const license of licenses) {
            const gracePeriodDays = calculateDaysUntilExpiration(
              license.expiresAt
            );
            await enqueueNotification(
              {
                channel: "email",
                template: "license_cancellation",
                target: license.customerEmail,
                idempotencyKey: `email:subscription:${subscriptionId}:license_cancellation:${license.id}`,
                payload: {
                  licenseKey: license.licenseKey,
                  tier: license.tier,
                  expiresAt: license.expiresAt.toISOString(),
                  gracePeriodDays,
                },
              },
              tx
            );
          }
        });

        logger.info(
          {
            subscriptionId,
            licenseCount: licenses.length,
            licenseIds: licenses.map((l) => l.id),
          },
          "Licenses deactivated + cancellation emails enqueued"
        );
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

          // Generate new signed license JWT (no DB write — safe outside tx)
          const features = getLicenseFeaturesForTier(license.tier);
          const licenseJwt = await licenseService.generateLicenseJwt({
            licenseId: license.id,
            tier: license.tier,
            features: features as string[],
            expiresAt: newExpiresAt,
          });

          // Outbox: license update + JWT version save + renewal email all
          // commit atomically. The licenseFileVersion row carries
          // stripeInvoiceId, which is the second-line idempotency guard.
          const newVersion = await prisma.$transaction(async (tx) => {
            const { newVersion: v } = await licenseService.renewLicense(
              license.id,
              newExpiresAt,
              tx
            );

            await licenseService.saveLicenseFileVersion(
              license.id,
              v,
              licenseJwt,
              newExpiresAt,
              invoice.id,
              tx
            );

            await enqueueNotification(
              {
                channel: "email",
                template: "license_renewal",
                target: license.customerEmail,
                idempotencyKey: `email:invoice:${invoice.id}:license_renewal:${license.id}`,
                payload: {
                  licenseKey: license.licenseKey,
                  tier: license.tier,
                  previousExpiresAt: license.expiresAt.toISOString(),
                  newExpiresAt: newExpiresAt.toISOString(),
                },
              },
              tx
            );

            return v;
          });

          logger.info(
            {
              licenseId: license.id,
              invoiceId: invoice.id,
              newVersion,
              newExpiresAt: newExpiresAt.toISOString(),
              previousExpiresAt: license.expiresAt.toISOString(),
            },
            "License renewed, new JWT generated, and renewal email enqueued"
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

    // Enqueue payment confirmation email (skip $0 invoices from trials/free signups).
    // Wrapped in its own try/catch so an enqueue failure here doesn't surface
    // as a webhook-handler crash after the renewal loop already committed.
    // Stripe retries are idempotent (the unique idempotencyKey makes the
    // re-attempt a no-op) so we keep observability via logs and let the
    // renewal commits stand.
    const owner = await resolveOrgOwnerUser(subscription.organizationId);
    if (owner && invoice.amount_paid > 0) {
      try {
        await enqueueNotification({
          channel: "email",
          template: "payment_confirmation",
          target: owner.email,
          idempotencyKey: `email:invoice:${invoice.id}:payment_confirmation`,
          payload: {
            userName: getUserDisplayName(owner),
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            // In Stripe API 2025-03-31+, payment_intent was removed from Invoice.
            // Default to "card" since payment method details require payments expansion.
            paymentMethod: "card",
          },
        });
      } catch (error) {
        logger.error(
          {
            error,
            invoiceId: invoice.id,
            subscriptionId,
            recipient: owner.email,
            idempotencyKey: `email:invoice:${invoice.id}:payment_confirmation`,
          },
          "Failed to enqueue payment confirmation email — renewal still committed; Stripe retry will re-attempt"
        );
      }
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

    // Resolve the billing contact for the failure emails. A missing OWNER
    // must NOT block license deactivation below — that is a billing-critical
    // mutation, not a notification.
    const owner = await resolveOrgOwnerUser(subscription.organizationId);

    // Outbox: deactivation (if applicable) + all email enqueues commit
    // atomically. Stripe retries hit unique idempotencyKeys -> no-op.
    await prisma.$transaction(async (tx) => {
      // Suspend licenses once the grace period has lapsed — unconditional on
      // owner resolution (a customer who stopped paying must not keep premium
      // just because we can't find someone to email).
      if (!isInGracePeriod && licenses.length > 0) {
        await tx.license.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { isActive: false },
        });
      }

      if (!owner) {
        // Deactivation still committed above; only the emails are skipped.
        logger.error(
          {
            subscriptionId,
            organizationId: subscription.organizationId,
            licenseCount: licenses.length,
          },
          "Payment failed but org has no OWNER member — notification emails skipped"
        );
        return;
      }

      const userEmail = owner.email;
      const userName = getUserDisplayName(owner);

      await enqueueNotification(
        {
          channel: "email",
          template: "payment_failed",
          target: userEmail,
          idempotencyKey: `email:invoice:${invoice.id}:payment_failed`,
          payload: {
            userName,
            amount: invoice.amount_due / 100,
            failureReason: CoreStripeService.mapInvoiceToFailureReason(invoice),
          },
        },
        tx
      );

      for (const license of licenses) {
        if (isInGracePeriod) {
          await enqueueNotification(
            {
              channel: "email",
              template: "license_payment_failed",
              target: userEmail,
              idempotencyKey: `email:invoice:${invoice.id}:license_payment_failed:${license.id}`,
              payload: {
                userName,
                licenseKey: license.licenseKey,
                tier: license.tier,
                gracePeriodDays: daysRemaining,
                isInGracePeriod: true,
                willDeactivate: true,
              },
            },
            tx
          );
        } else {
          await enqueueNotification(
            {
              channel: "email",
              template: "license_expired",
              target: userEmail,
              idempotencyKey: `email:invoice:${invoice.id}:license_expired:${license.id}`,
              payload: {
                userName,
                licenseKey: license.licenseKey,
                tier: license.tier,
                expiredAt: (license.expiresAt || now).toISOString(),
                renewalUrl: `${emailConfig.portalFrontendUrl}/licenses`,
              },
            },
            tx
          );
        }
      }
    });

    if (!isInGracePeriod && licenses.length > 0) {
      logger.info(
        { subscriptionId, licenseCount: licenses.length },
        "Licenses deactivated after grace period expired"
      );
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
      const trialEndIso = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : new Date().toISOString();
      // Key includes trial_end so a re-trialed subscription (rare but
      // possible via portal) gets its own enqueue rather than collapsing
      // into a previously-deduped key.
      await enqueueNotification({
        channel: "email",
        template: "trial_ending",
        target: user.email,
        idempotencyKey: `email:subscription:${subscriptionId}:trial_ending:${trialEndIso}`,
        payload: {
          name: getUserDisplayName(user),
          workspaceName: org.name,
          plan: dbSubscription.plan,
          trialEndDate: trialEndIso,
        },
      });
      logger.info(
        { subscriptionId, organizationId: org.id },
        "Trial ending email enqueued"
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
    });

    if (!subscription) {
      logger.warn(
        { subscriptionId },
        "Subscription not found for payment action required"
      );
      return;
    }

    const owner = await resolveOrgOwnerUser(subscription.organizationId);
    if (owner && owner.workspace && invoice.hosted_invoice_url) {
      await enqueueNotification({
        channel: "email",
        template: "payment_action_required",
        target: owner.email,
        idempotencyKey: `email:invoice:${invoice.id}:payment_action_required`,
        payload: {
          name: getUserDisplayName(owner),
          workspaceName: owner.workspace.name,
          plan: subscription.plan,
          invoiceUrl: invoice.hosted_invoice_url,
          amount: (invoice.amount_due / 100).toFixed(2),
          currency: invoice.currency.toUpperCase(),
        },
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
 * Returns null if no org is found — callers Fail Fast (log + skip) on null
 * rather than writing a headless subscription.
 */
async function resolveOrgFromStripeCustomerId(
  customerId: string
): Promise<{ id: string } | null> {
  return prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
}

/**
 * Resolve the OWNER user of an organization — the billing contact for
 * subscription-lifecycle emails and analytics attribution. Subscriptions are
 * org-scoped, so the recipient is reached through the org's OWNER membership
 * rather than a denormalized user link. Returns null when the org has no OWNER
 * (a data-integrity bug worth surfacing, not papering over).
 */
async function resolveOrgOwnerUser(organizationId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: { organizationId, role: OrgRole.OWNER },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          workspace: { select: { name: true } },
        },
      },
    },
  });
  return member?.user ?? null;
}
