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
            message: validation.message || "License validation failed",
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
          message: "License validation failed",
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
        message: "Failed to fetch licenses",
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
            message: `Yearly price not configured for ${tier} tier`,
          });
        }

        const portalUrl = emailConfig.portalFrontendUrl;
        if (!portalUrl) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Portal URL not configured",
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
          message: "Failed to create checkout session",
        });
      }
    }),

  /**
   * Download license file
   * Protected endpoint - portal only
   * Returns file content and filename for client-side download
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
            message: "License not found",
          });
        }

        // Retrieve stored license file from database
        const fileVersions =
          await licenseService.getLicenseFileVersions(licenseId);

        // Get the latest version (should match license.currentVersion)
        const latestVersion = fileVersions[0];

        if (!latestVersion) {
          // Fallback: Generate file if not found (backwards compatibility)
          ctx.logger.warn(
            { licenseId },
            "No stored license file found, generating on-demand"
          );

          const features = getLicenseFeaturesForTier(license.tier);

          const licenseFile = await licenseService.generateLicenseFile({
            licenseKey: license.licenseKey,
            tier: license.tier,
            customerEmail: license.customerEmail,
            expiresAt: license.expiresAt,
            features,
          });

          return {
            content: JSON.stringify(licenseFile.licenseFile, null, 2),
            filename: `qarote-license-${licenseId}.json`,
            mimeType: "application/json",
          };
        }

        // Return stored license file
        ctx.logger.info(
          { licenseId, version: latestVersion.version },
          "Returning stored license file"
        );

        return {
          content: latestVersion.fileContent,
          filename: `qarote-license-${licenseId}.json`,
          mimeType: "application/json",
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error downloading license");
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to download license",
        });
      }
    }),
});
