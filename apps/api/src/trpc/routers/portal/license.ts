import { TRPCError } from "@trpc/server";

import { prisma } from "@/core/prisma";
import { getUserDisplayName } from "@/core/utils";

import { licenseService } from "@/services/license/license.service";
import { stripe, StripeService } from "@/services/stripe/stripe.service";

import {
  purchaseLicenseSchema,
  regenerateLicenseSchema,
  validateLicenseSchema,
} from "@/schemas/portal";

import { emailConfig, stripeConfig } from "@/config";

import { LicenseMapper } from "@/mappers/license";

import {
  rateLimitedOrgAdminProcedure,
  rateLimitedProcedure,
  rateLimitedPublicProcedure,
  router,
} from "@/trpc/trpc";

import { UserPlan } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * License router
 * Handles license validation (called by self-hosted instances) and portal license management
 */
export const licenseRouter = router({
  /**
   * Validate a license key
   * Public endpoint - called by self-hosted instances (RATE LIMITED)
   */
  validate: rateLimitedPublicProcedure
    .input(validateLicenseSchema)
    .mutation(async ({ input, ctx }) => {
      const { licenseKey } = input;

      try {
        const validation = await licenseService.validateLicense({
          licenseKey,
        });

        if (!validation.valid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              validation.message || te(ctx.locale, "license.validationFailed"),
          });
        }

        return {
          valid: true,
          license: validation.license
            ? {
                ...validation.license,
                expiresAt: validation.license.expiresAt.toISOString(),
              }
            : null,
        };
      } catch (error) {
        ctx.logger.error({ error }, "License validation error");

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "license.validationFailed"),
        });
      }
    }),

  /**
   * Get all licenses for the authenticated user
   * Protected endpoint - portal only
   */
  getLicenses: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      const licenses = await licenseService.getLicensesForUser(
        user.email,
        user.workspaceId || undefined
      );

      return { licenses: LicenseMapper.toApiResponseArray(licenses) };
    } catch (error) {
      ctx.logger.error({ error }, "Error fetching licenses");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "license.failedToFetchLicenses"),
      });
    }
  }),

  /**
   * Regenerate (rotate) the signed license key for one of the caller's
   * licenses. Issues a fresh JWT for the same tier + expiry and bumps the
   * version so the portal surfaces the new key.
   *
   * Rotation, NOT revocation: license JWTs are validated offline, so the
   * previous key keeps working until it expires — the UI says so. Ownership
   * is enforced by customer email before any rotation happens.
   */
  regenerate: rateLimitedProcedure
    .input(regenerateLicenseSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;

      try {
        const license = await prisma.license.findUnique({
          where: { id: input.licenseId },
          select: { id: true, customerEmail: true },
        });

        // Same NOT_FOUND for missing and not-owned so we don't leak which
        // license ids exist for other customers.
        if (!license || license.customerEmail !== user.email) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "license.notFound"),
          });
        }

        const { jwt } = await licenseService.regenerateLicenseJwt(license.id);
        return { jwt };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error regenerating license");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "license.failedToRegenerate"),
        });
      }
    }),

  /**
   * Purchase a license
   * Protected endpoint - portal only
   */
  purchaseLicense: rateLimitedOrgAdminProcedure
    .input(purchaseLicenseSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { tier } = input;

      try {
        const org = await ctx.prisma.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { id: true, stripeCustomerId: true },
        });

        if (!org) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "billing.noOrganization"),
          });
        }

        let customerId = org.stripeCustomerId;
        if (!customerId) {
          const customer = await StripeService.createCustomer({
            email: user.email,
            name: getUserDisplayName(user),
            userId: user.id,
          });
          customerId = customer.id;

          await ctx.prisma.organization.update({
            where: { id: org.id },
            data: { stripeCustomerId: customerId },
          });
        }

        // Get yearly price ID (licenses are annual-only)
        const priceId =
          tier === UserPlan.DEVELOPER
            ? stripeConfig.priceIds.developer.yearly
            : stripeConfig.priceIds.enterprise.yearly;

        if (!priceId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: te(ctx.locale, "license.yearlyPriceNotConfigured", {
              tier,
            }),
          });
        }

        const portalUrl = emailConfig.portalFrontendUrl;
        if (!portalUrl) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: te(ctx.locale, "license.portalUrlNotConfigured"),
          });
        }

        // Create Stripe Checkout Session for annual subscription
        const session = await stripe.checkout.sessions.create({
          mode: "subscription", // Annual subscription (not one-time payment)
          payment_method_types: ["card"],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          billing_address_collection: "required",
          tax_id_collection: { enabled: true },
          customer_update: {
            address: "auto",
            name: "auto",
          },
          subscription_data: {
            // No trial period for self-hosted licenses
            metadata: {
              tier,
              licenseType: "annual",
            },
          },
          success_url: `${portalUrl}/licenses?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${portalUrl}/purchase`,
          customer: customerId,
          metadata: {
            userId: user.id,
            plan: tier,
            billingInterval: "yearly", // Always yearly for licenses
            type: "license", // Mark as license purchase
          },
        });

        return { checkoutUrl: session.url! }; // session.url is always present for checkout sessions
      } catch (error) {
        ctx.logger.error({ error }, "Error creating license purchase checkout");
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "billing.failedToCreateCheckoutSession"),
        });
      }
    }),
});
