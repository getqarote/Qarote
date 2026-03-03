/**
 * Self-Hosted SSO Router
 * Allows self-hosted admins to configure, test, and manage SSO settings via the UI
 * Settings are stored in SystemSetting (key: "sso_config") and take priority over env vars
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { ssoService } from "@/services/auth/sso.service";

import { isSelfHostedMode } from "@/config/deployment";

import { rateLimitedAdminProcedure, router } from "@/trpc/trpc";

const REDACTED = "••••••••";

/** Admin procedure that only runs in self-hosted mode */
const selfHostedProcedure = rateLimitedAdminProcedure.use(async (opts) => {
  if (!isSelfHostedMode()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "SSO settings are only available for self-hosted instances",
    });
  }
  return opts.next();
});

const ssoSettingsSchema = z.object({
  enabled: z.boolean(),
  type: z.enum(["oidc", "saml"]),
  oidcDiscoveryUrl: z.string().optional(),
  oidcClientId: z.string().optional(),
  oidcClientSecret: z.string().optional(),
  samlMetadataUrl: z.string().optional(),
  apiUrl: z.string().optional(),
  frontendUrl: z.string().optional(),
  tenant: z.string().optional(),
  product: z.string().optional(),
  buttonLabel: z.string().optional(),
});

export const selfhostedSsoRouter = router({
  /**
   * Get current SSO settings
   * Returns DB settings if present, otherwise env-var derived settings
   * Client secret is always redacted
   */
  getSettings: selfHostedProcedure.query(async ({ ctx }) => {
    const setting = await ctx.prisma.systemSetting.findUnique({
      where: { key: "sso_config" },
    });

    if (setting) {
      const config = JSON.parse(setting.value) as z.infer<
        typeof ssoSettingsSchema
      >;
      return {
        source: "database" as const,
        ...config,
        oidcClientSecret: config.oidcClientSecret ? REDACTED : undefined,
      };
    }

    // Fall back to env-var config via the service
    const effective = ssoService.effectiveConfig;
    return {
      source: "environment" as const,
      enabled: effective.enabled,
      type: effective.type,
      oidcDiscoveryUrl: effective.oidc.discoveryUrl,
      oidcClientId: effective.oidc.clientId,
      oidcClientSecret: effective.oidc.clientSecret ? REDACTED : undefined,
      samlMetadataUrl: effective.saml.metadataUrl,
      apiUrl: effective.apiUrl,
      frontendUrl: effective.frontendUrl,
      tenant: effective.tenant,
      product: effective.product,
      buttonLabel: effective.buttonLabel,
    };
  }),

  /**
   * Update SSO settings
   * Stores in SystemSetting and reinitializes the SSO service
   * If oidcClientSecret is the redacted placeholder, preserve the existing secret
   */
  updateSettings: selfHostedProcedure
    .input(ssoSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      // Preserve existing secret if the redacted placeholder was sent
      let oidcClientSecret = input.oidcClientSecret;
      if (oidcClientSecret === REDACTED) {
        const existing = await ctx.prisma.systemSetting.findUnique({
          where: { key: "sso_config" },
        });
        if (existing) {
          const existingConfig = JSON.parse(existing.value) as z.infer<
            typeof ssoSettingsSchema
          >;
          oidcClientSecret = existingConfig.oidcClientSecret;
        }
      }

      const configToStore = {
        ...input,
        oidcClientSecret,
      };

      await ctx.prisma.systemSetting.upsert({
        where: { key: "sso_config" },
        update: { value: JSON.stringify(configToStore) },
        create: { key: "sso_config", value: JSON.stringify(configToStore) },
      });

      // Reinitialize SSO service with new config
      await ssoService.reinitialize();

      ctx.logger.info("SSO settings updated successfully");

      return { success: true };
    }),

  /**
   * Test OIDC connection by fetching the discovery URL
   * Returns the issuer on success, or an error message on failure
   */
  testConnection: selfHostedProcedure
    .input(z.object({ discoveryUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(input.discoveryUrl);
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        const data = (await response.json()) as { issuer?: string };
        if (!data.issuer) {
          return {
            success: false,
            error:
              "Response is not a valid OIDC discovery document (missing issuer)",
          };
        }

        return { success: true, issuer: data.issuer };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Connection test failed",
        };
      }
    }),
});
