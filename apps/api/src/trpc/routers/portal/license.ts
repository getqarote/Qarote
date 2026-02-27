import { TRPCError } from "@trpc/server";

import { getUserDisplayName } from "@/core/utils";

import { licenseService } from "@/services/license/license.service";
import { getLicenseFeaturesForTier } from "@/services/license/license-features.service";
import { stripe, StripeService } from "@/services/stripe/stripe.service";

import {
  downloadLicenseSchema,
  purchaseLicenseSchema,
  validateLicenseSchema,
} from "@/schemas/portal";

import { emailConfig, stripeConfig } from "@/config";

import { LicenseMapper } from "@/mappers/license";

import {
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
   * Purchase a license
   * Protected endpoint - portal only
   */
  purchaseLicense: rateLimitedProcedure
    .input(purchaseLicenseSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { tier } = input;

      try {
        // Create Stripe customer if not exists
        let customerId = user.stripeCustomerId;
        if (!customerId) {
          const customer = await StripeService.createCustomer({
            email: user.email,
            name: getUserDisplayName(user),
            userId: user.id,
          });
          customerId = customer.id;

          await ctx.prisma.user.update({
            where: { id: user.id },
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

  /**
   * Get license key (JWT string)
   * Protected endpoint - portal only
   * Returns the JWT that users paste into their self-hosted instance
   */
  downloadLicense: rateLimitedProcedure
    .input(downloadLicenseSchema)
    .query(async ({ input, ctx }) => {
      const user = ctx.user;
      const { licenseId } = input;

      try {
        const licenses = await licenseService.getLicensesForUser(
          user.email,
          user.workspaceId || undefined
        );

        const license = licenses.find((l) => l.id === licenseId);

        if (!license) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "license.notFound"),
          });
        }

        // Check stored versions first (JWT is stored in fileContent)
        const fileVersions =
          await licenseService.getLicenseFileVersions(licenseId);
        const latestVersion = fileVersions[0];

        if (latestVersion) {
          ctx.logger.info(
            { licenseId, version: latestVersion.version },
            "Returning stored license JWT"
          );

          return {
            content: latestVersion.fileContent,
            mimeType: "text/plain",
          };
        }

        // Fallback: Generate JWT on-demand if no stored version
        ctx.logger.warn(
          { licenseId },
          "No stored license JWT found, generating on-demand"
        );

        const features = getLicenseFeaturesForTier(license.tier);

        const jwt = await licenseService.generateLicenseJwt({
          licenseId: license.id,
          tier: license.tier,
          features,
          expiresAt: license.expiresAt,
        });

        return {
          content: jwt,
          mimeType: "text/plain",
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error fetching license key");
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "license.failedToDownload"),
        });
      }
    }),
});
