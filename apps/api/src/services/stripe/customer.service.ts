import Stripe from "stripe";

import { logger } from "@/core/logger";
import { retryWithBackoff } from "@/core/retry";

import {
  CoreStripeService,
  CreateCheckoutSessionParams,
  CreateCustomerParams,
  stripe,
  STRIPE_PRICE_IDS,
} from "./core.service";

import {
  OrgRole,
  PrismaClient,
  SubscriptionStatus,
  UserPlan,
} from "@/generated/prisma/client";

export class StripeCustomerService {
  /**
   * Create a new Stripe customer
   */
  static async createCustomer({ email, name, userId }: CreateCustomerParams) {
    try {
      logger.info({ email, userId }, "Creating Stripe customer");

      const customer = await retryWithBackoff(
        () =>
          stripe.customers.create({
            email,
            name,
            metadata: {
              userId,
            },
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      // Set Sentry context for payment tracking
      CoreStripeService.setSentryContext("stripe_customer", {
        customerId: customer.id,
        email: customer.email,
        userId,
      });

      logger.info(
        {
          customerId: customer.id,
          userId,
        },
        "Stripe customer created successfully"
      );

      return customer;
    } catch (error) {
      CoreStripeService.logStripeError(error, "create_customer", {
        email,
        userId,
      });
      throw error;
    }
  }

  /**
   * Retrieve a Stripe customer
   */
  static async getCustomer(customerId: string) {
    try {
      const customer = await retryWithBackoff(
        () => stripe.customers.retrieve(customerId),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );
      return customer;
    } catch (error) {
      CoreStripeService.logStripeError(error, "get_customer", { customerId });
      throw error;
    }
  }

  /**
   * Create a billing portal session
   */
  static async createPortalSession(customerId: string, returnUrl: string) {
    try {
      logger.info({ customerId }, "Creating Stripe portal session");

      const session = await retryWithBackoff(
        () =>
          stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
          }),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      logger.info(
        {
          sessionId: session.id,
          customerId,
        },
        "Stripe portal session created successfully"
      );

      return session;
    } catch (error) {
      CoreStripeService.logStripeError(error, "create_portal_session", {
        customerId,
      });
      throw error;
    }
  }

  /**
   * Create a trial subscription directly without Stripe Checkout.
   * No payment method is required — the subscription starts in "trialing" status.
   * If no card is added before trial ends, Stripe auto-cancels the subscription.
   */
  static async createTrialSubscription({
    customerId,
    plan,
    billingInterval,
    trialDays,
    userId,
    idempotencyKey,
  }: {
    customerId: string;
    plan: UserPlan;
    billingInterval: "monthly" | "yearly";
    trialDays: number;
    userId: string;
    idempotencyKey?: string;
  }) {
    try {
      if (plan === UserPlan.FREE) {
        throw new Error("Cannot create trial subscription for FREE plan");
      }

      if (!STRIPE_PRICE_IDS) {
        throw new Error(
          "Stripe is not configured. STRIPE_PRICE_IDS are required."
        );
      }

      const priceId = STRIPE_PRICE_IDS[plan][billingInterval];

      logger.info(
        { customerId, plan, billingInterval, trialDays, userId },
        "Creating Stripe trial subscription directly"
      );

      const subscription = await retryWithBackoff(
        () =>
          stripe.subscriptions.create(
            {
              customer: customerId,
              items: [{ price: priceId }],
              trial_period_days: trialDays,
              trial_settings: {
                end_behavior: {
                  missing_payment_method: "cancel",
                },
              },
              payment_behavior: "default_incomplete",
              metadata: {
                userId,
                plan,
                billingInterval,
                trialDays: trialDays.toString(),
              },
            },
            idempotencyKey ? { idempotencyKey } : undefined
          ),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      CoreStripeService.setSentryContext("stripe_trial_subscription", {
        subscriptionId: subscription.id,
        customerId,
        userId,
        plan,
      });

      logger.info(
        {
          subscriptionId: subscription.id,
          customerId,
          userId,
          plan,
          trialEnd: subscription.trial_end,
        },
        "Stripe trial subscription created successfully"
      );

      return subscription;
    } catch (error) {
      CoreStripeService.logStripeError(error, "create_trial_subscription", {
        customerId,
        userId,
        plan,
      });
      throw error;
    }
  }

  /**
   * Create a checkout session
   */
  static async createCheckoutSession({
    userId,
    plan,
    billingInterval,
    successUrl,
    cancelUrl,
    customerEmail,
    trialDays,
  }: CreateCheckoutSessionParams) {
    try {
      if (plan === UserPlan.FREE) {
        throw new Error("Cannot create checkout session for FREE plan");
      }

      logger.info(
        {
          userId,
          plan,
          billingInterval,
          customerEmail,
        },
        "Creating Stripe checkout session"
      );

      if (!STRIPE_PRICE_IDS) {
        throw new Error(
          "Stripe is not configured. STRIPE_PRICE_IDS are required for creating checkout sessions."
        );
      }

      const priceId = STRIPE_PRICE_IDS[plan][billingInterval];

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          plan,
          billingInterval,
          ...(trialDays && { trialDays: trialDays.toString() }),
        },
        subscription_data: {
          metadata: {
            userId,
            plan,
            billingInterval,
            ...(trialDays && { trialDays: trialDays.toString() }),
          },
          // Add trial period for early access users
          ...(trialDays && {
            trial_period_days: trialDays,
            trial_settings: {
              end_behavior: {
                missing_payment_method: "cancel",
              },
            },
          }),
        },
        allow_promotion_codes: true,
        // Allow users to start trial without entering a card
        ...(trialDays && {
          payment_method_collection: "if_required" as const,
        }),
      };

      // Add customer email if provided
      if (customerEmail) {
        sessionParams.customer_email = customerEmail;
      }

      const session = await retryWithBackoff(
        () => stripe.checkout.sessions.create(sessionParams),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );

      // Set Sentry context for checkout tracking
      CoreStripeService.setSentryContext("stripe_checkout", {
        sessionId: session.id,
        userId,
        plan,
        billingInterval,
        priceId,
      });

      logger.info(
        {
          sessionId: session.id,
          userId,
          plan,
        },
        "Stripe checkout session created successfully"
      );

      return session;
    } catch (error) {
      CoreStripeService.logStripeError(error, "create_checkout_session", {
        userId,
        plan,
        billingInterval,
        customerEmail,
      });
      throw error;
    }
  }

  /**
   * Provision a trial subscription on an Organization.
   * Creates Stripe customer on the org, a trial subscription, and the DB
   * Subscription record linked to the org. Returns null if Stripe is not
   * configured (self-hosted mode).
   */
  static async provisionTrialForOrg({
    organizationId,
    email,
    name,
    userId,
    prisma,
  }: {
    organizationId: string;
    email: string;
    name: string;
    userId: string;
    prisma: PrismaClient;
  }) {
    if (!STRIPE_PRICE_IDS) {
      return null;
    }

    const plan = UserPlan.ENTERPRISE;
    const billingInterval = "monthly" as const;
    const trialDays = 14;

    logger.info(
      { organizationId, userId, plan, trialDays },
      "Provisioning trial for organization"
    );

    // Reuse existing Stripe customer on the org (race condition guard)
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { stripeCustomerId: true },
    });

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      // Use idempotency key derived from org ID to prevent duplicate Stripe customers
      const customer = await retryWithBackoff(
        () =>
          stripe.customers.create(
            {
              email,
              name,
              metadata: { userId },
            },
            { idempotencyKey: `org-customer-${organizationId}` }
          ),
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "stripe"
      );
      customerId = customer.id;

      // Conditional write: only set if still null (race-safe)
      await prisma.organization.updateMany({
        where: { id: organizationId, stripeCustomerId: null },
        data: { stripeCustomerId: customerId },
      });

      // Re-read to use whichever customer ID won the race
      const updatedOrg = await prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { stripeCustomerId: true },
      });

      if (
        updatedOrg.stripeCustomerId &&
        updatedOrg.stripeCustomerId !== customerId
      ) {
        // Another request's customer won the race — delete the orphaned one
        try {
          await stripe.customers.del(customerId);
          logger.info(
            {
              orphanedCustomerId: customerId,
              winningCustomerId: updatedOrg.stripeCustomerId,
            },
            "Deleted orphaned Stripe customer from race condition"
          );
        } catch (delError) {
          logger.warn(
            { error: delError, orphanedCustomerId: customerId },
            "Failed to delete orphaned Stripe customer"
          );
        }
        customerId = updatedOrg.stripeCustomerId;
      }
    }

    // Create trial subscription via Stripe API
    const idempotencyKey = `auto_trial_org_${organizationId}`;
    const subscription = await StripeCustomerService.createTrialSubscription({
      customerId,
      plan,
      billingInterval,
      trialDays,
      userId,
      idempotencyKey,
    });

    // Also store on the org for quick lookup
    await prisma.organization.update({
      where: { id: organizationId },
      data: { stripeSubscriptionId: subscription.id },
    });

    // Upsert subscription record linked to both user and org
    const firstItem = subscription.items?.data?.[0];
    const currentPeriodStart = firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000)
      : new Date();
    const currentPeriodEnd = firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000)
      : new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const subscriptionData = {
      userId,
      organizationId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: firstItem?.price?.id || "",
      stripeCustomerId: customerId,
      plan,
      status: SubscriptionStatus.TRIALING,
      billingInterval:
        CoreStripeService.mapStripeBillingIntervalToBillingInterval(
          billingInterval
        ),
      pricePerMonth: firstItem?.price?.unit_amount || 0,
      currentPeriodStart,
      currentPeriodEnd,
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : new Date(),
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    };

    const dbSubscription = await prisma.subscription.upsert({
      where: { userId },
      create: subscriptionData,
      update: {
        organizationId,
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
        stripePriceId: subscriptionData.stripePriceId,
        stripeCustomerId: subscriptionData.stripeCustomerId,
        status: subscriptionData.status,
        trialStart: subscriptionData.trialStart,
        trialEnd: subscriptionData.trialEnd,
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
      },
    });

    logger.info(
      {
        organizationId,
        userId,
        subscriptionId: dbSubscription.stripeSubscriptionId,
        plan,
        trialEnd: dbSubscription.trialEnd,
      },
      "Trial provisioned for organization"
    );

    return dbSubscription;
  }

  /**
   * Provision a full trial for a newly registered user.
   * Creates an Organization, provisions the trial on the org, and dual-writes
   * Stripe IDs to User.
   * Returns null if Stripe is not configured (self-hosted mode).
   * Does NOT send emails -- caller decides.
   */
  static async provisionTrialForNewUser({
    userId,
    email,
    name,
    prisma,
  }: {
    userId: string;
    email: string;
    name: string;
    prisma: PrismaClient;
  }) {
    // Skip if Stripe is not configured (self-hosted deployments)
    if (!STRIPE_PRICE_IDS) {
      return null;
    }

    logger.info({ userId }, "Provisioning trial for new user (org-based)");

    // Create an Organization for this user and make them the OWNER
    const orgSlug = `user-${userId.slice(0, 8)}-${Date.now()}`;
    const orgName = name ? `${name}'s Organization` : "My Organization";

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
        contactEmail: email,
        members: {
          create: {
            userId,
            role: OrgRole.OWNER,
          },
        },
      },
    });

    // Provision trial on the organization
    const dbSubscription = await StripeCustomerService.provisionTrialForOrg({
      organizationId: org.id,
      email,
      name,
      userId,
      prisma,
    });

    if (!dbSubscription) {
      return null;
    }

    // Dual-write Stripe IDs to User for backward compatibility
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: dbSubscription.stripeCustomerId,
        stripeSubscriptionId: dbSubscription.stripeSubscriptionId,
      },
    });

    logger.info(
      {
        userId,
        organizationId: org.id,
        subscriptionId: dbSubscription.stripeSubscriptionId,
      },
      "Trial provisioned for new user via organization"
    );

    return dbSubscription;
  }
}
