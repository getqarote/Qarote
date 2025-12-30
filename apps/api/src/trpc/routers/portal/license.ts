import { UserPlan } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { getUserDisplayName } from "@/core/utils";

import { licenseService } from "@/services/license/license.service";
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
      const { licenseKey, instanceId } = input;

      try {
        const validation = await licenseService.validateLicense({
          licenseKey,
          instanceId,
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
                expiresAt: validation.license.expiresAt?.toISOString() ?? null,
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
      const { tier, billingInterval } = input;

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

        // Get price ID based on tier and billing interval
        const priceId =
          billingInterval === "monthly"
            ? tier === UserPlan.DEVELOPER
              ? stripeConfig.priceIds.developer.monthly
              : stripeConfig.priceIds.enterprise.monthly
            : tier === UserPlan.DEVELOPER
              ? stripeConfig.priceIds.developer.yearly
              : stripeConfig.priceIds.enterprise.yearly;

        // For licenses, calculate expiration date based on billing interval
        const expiresAt = new Date();
        if (billingInterval === "monthly") {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        // Create Stripe Checkout Session for one-time license purchase (payment mode)
        const session = await stripe.checkout.sessions.create({
          mode: "payment", // One-time payment for licenses
          payment_method_types: ["card"],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${emailConfig.frontendUrl}/portal/licenses?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${emailConfig.frontendUrl}/portal/purchase`,
          customer: customerId,
          metadata: {
            userId: user.id,
            plan: tier,
            billingInterval,
            type: "license", // Mark as license purchase
            expiresAt: expiresAt.toISOString(),
          },
        });

        return { checkoutUrl: session.url };
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

        // Generate license file content
        const licenseContent = `Qarote License
================

License Key: ${license.licenseKey}
Tier: ${license.tier}
Customer Email: ${license.customerEmail}
Expires: ${license.expiresAt ? license.expiresAt.toISOString() : "Never"}
Issued: ${license.createdAt.toISOString()}

To activate this license in your self-hosted Qarote deployment:
1. Set the LICENSE_KEY environment variable to the license key above
2. Set LICENSE_VALIDATION_URL to your Qarote backend URL
3. Restart your application

For more information, visit: https://qarote.io/docs/standalone
`;

        return {
          content: licenseContent,
          filename: `qarote-license-${licenseId}.txt`,
          mimeType: "text/plain",
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
