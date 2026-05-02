/**
 * Self-Hosted License Router
 * Allows self-hosted admins to activate, check, and deactivate license JWTs via the UI
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { invalidateLicenseCache } from "@/services/feature-gate";
import { verifyLicenseJwt } from "@/services/license/license-crypto.service";
import { posthog } from "@/services/posthog";

import { isSelfHostedMode } from "@/config/deployment";

import { rateLimitedAdminProcedure, router } from "@/trpc/trpc";

/** Admin procedure that only runs in self-hosted mode */
const selfHostedProcedure = rateLimitedAdminProcedure.use(async (opts) => {
  if (!isSelfHostedMode()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "License activation is only available for self-hosted instances",
    });
  }
  return opts.next();
});

export const selfhostedLicenseRouter = router({
  /**
   * Activate a license by pasting a JWT
   * Verifies the JWT offline, then stores it in the database
   */
  activate: selfHostedProcedure
    .input(z.object({ licenseKey: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { licenseKey } = input;

      // Verify JWT signature + expiry with baked-in public key
      const payload = await verifyLicenseJwt(licenseKey);

      if (!payload) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid or expired license key. Please check the key and try again.",
        });
      }

      // Store in SystemSetting (upsert — replace if one already exists)
      await ctx.prisma.systemSetting.upsert({
        where: { key: "license_jwt" },
        update: { value: licenseKey },
        create: { key: "license_jwt", value: licenseKey },
      });

      // Invalidate cached license so feature checks reflect immediately
      invalidateLicenseCache();

      ctx.logger.info(
        { tier: payload.tier, exp: payload.exp },
        "License activated successfully"
      );

      try {
        posthog?.capture({
          distinctId: ctx.user.id,
          event: "selfhosted_license_activated",
          properties: {
            tier: payload.tier,
            expires_at: new Date(payload.exp * 1000).toISOString(),
          },
        });
      } catch (analyticsError) {
        ctx.logger.warn(
          { error: analyticsError, userId: ctx.user.id },
          "PostHog capture failed"
        );
      }

      return {
        tier: payload.tier,
        features: payload.features,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      };
    }),

  /**
   * Get current license status
   * Returns decoded license info if a valid JWT is stored, null otherwise
   */
  status: selfHostedProcedure.query(async ({ ctx }) => {
    const setting = await ctx.prisma.systemSetting.findUnique({
      where: { key: "license_jwt" },
    });

    if (!setting) {
      return { active: false, license: null };
    }

    const payload = await verifyLicenseJwt(setting.value);

    if (!payload) {
      return { active: false, license: null };
    }

    return {
      active: true,
      license: {
        tier: payload.tier,
        features: payload.features,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        issuedAt: new Date(payload.iat * 1000).toISOString(),
      },
    };
  }),

  /**
   * Deactivate the current license
   * Removes the JWT from the database — features revert to free tier
   */
  deactivate: selfHostedProcedure.mutation(async ({ ctx }) => {
    try {
      await ctx.prisma.systemSetting.delete({
        where: { key: "license_jwt" },
      });
    } catch (error: unknown) {
      // Prisma P2025 = record not found — already deleted or never existed
      const isNotFound =
        error != null &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2025";
      if (!isNotFound) throw error;
    }

    invalidateLicenseCache();
    ctx.logger.info("License deactivated");

    try {
      posthog?.capture({
        distinctId: ctx.user.id,
        event: "selfhosted_license_deactivated",
        properties: {},
      });
    } catch (analyticsError) {
      ctx.logger.warn(
        { error: analyticsError, userId: ctx.user.id },
        "PostHog capture failed"
      );
    }

    return { success: true };
  }),
});
