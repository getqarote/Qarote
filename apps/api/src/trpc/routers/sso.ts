/**
 * Unified SSO Router
 * Manages SSO provider configuration for both cloud (per-org) and
 * self-hosted (instance-wide). Replaces the old workspace-scoped SSO router.
 *
 * Procedures:
 * - getConfig      (PUBLIC)  — Login page uses this to show/hide SSO button
 * - getProviderConfig (ADMIN) — Admin UI reads current config (secret redacted)
 * - registerProvider (ssoAdmin) — First-time setup
 * - updateProvider   (ssoAdmin) — Update config; preserves secret if REDACTED sent
 * - deleteProvider   (ssoAdmin) — Remove provider
 * - testConnection   (ssoAdmin) — SSRF-protected OIDC discovery probe
 */

import dns from "node:dns";

import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { isPrivateIP } from "@/core/network";

import { isFeatureEnabled } from "@/services/feature-gate";
import { getOrgPlan } from "@/services/plan/plan.service";

import { isDevelopment } from "@/config";
import { isCloudMode } from "@/config/deployment";
import { FEATURES } from "@/config/features";

import {
  rateLimitedOrgAdminProcedure,
  rateLimitedPublicProcedure,
  router,
} from "@/trpc/trpc";

import { UserPlan } from "@/generated/prisma/client";

const REDACTED = "••••••••";

/** providerId used for the instance-wide self-hosted provider */
const INSTANCE_PROVIDER_ID = "default";

/**
 * Admin procedure gated by enterprise entitlement.
 * - Cloud:       user must be org OWNER/ADMIN with ENTERPRISE plan
 * - Self-hosted: license must have "sso" feature or be ENTERPRISE tier
 */
const ssoAdminProcedure = rateLimitedOrgAdminProcedure.use(async (opts) => {
  if (isCloudMode()) {
    const plan = await getOrgPlan(opts.ctx.organizationId);
    if (plan !== UserPlan.ENTERPRISE) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "SSO requires Enterprise plan",
      });
    }
  } else {
    const enabled = await isFeatureEnabled(FEATURES.SSO);
    if (!enabled) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "SSO requires Enterprise license",
      });
    }
  }
  return opts.next();
});

export const ssoRouter = router({
  /**
   * Get SSO config for the login page (PUBLIC).
   * Self-hosted: returns instance-wide provider info if configured.
   * Cloud:       returns a fixed { enabled: true, cloudSso: true } so the
   *              login page shows the email-based SSO flow. Domain discovery
   *              happens inside better-auth when the user submits their email.
   */
  getConfig: rateLimitedPublicProcedure.query(async ({ ctx }) => {
    if (isCloudMode()) {
      return {
        enabled: true as const,
        cloudSso: true as const,
        buttonLabel: "Sign in with SSO",
        providerId: null as string | null,
        type: null as "oidc" | "saml" | null,
      };
    }

    const orgConfig = await ctx.prisma.orgSsoConfig.findFirst({
      where: { organizationId: null },
      include: { provider: true },
    });

    if (!orgConfig) return null;

    const type: "oidc" | "saml" = orgConfig.provider.oidcConfig
      ? "oidc"
      : "saml";

    return {
      enabled: true as const,
      cloudSso: false as const,
      buttonLabel: "Sign in with SSO",
      providerId: orgConfig.provider.providerId,
      type,
    };
  }),

  /**
   * Get current provider config for the admin UI (ADMIN).
   * Client secret is always redacted.
   */
  getProviderConfig: rateLimitedOrgAdminProcedure.query(async ({ ctx }) => {
    let orgConfig;

    if (isCloudMode()) {
      orgConfig = await ctx.prisma.orgSsoConfig.findFirst({
        where: { organizationId: ctx.organizationId },
        include: { provider: true },
      });
    } else {
      orgConfig = await ctx.prisma.orgSsoConfig.findFirst({
        where: { organizationId: null },
        include: { provider: true },
      });
    }

    if (!orgConfig) return null;

    const provider = orgConfig.provider;
    let oidcConfig: Record<string, unknown> | null = null;
    let samlConfig: Record<string, unknown> | null = null;

    if (provider.oidcConfig) {
      const parsed = JSON.parse(provider.oidcConfig) as Record<string, unknown>;
      oidcConfig = {
        ...parsed,
        clientSecret: parsed.clientSecret ? REDACTED : undefined,
      };
    }
    if (provider.samlConfig) {
      samlConfig = JSON.parse(provider.samlConfig) as Record<string, unknown>;
    }

    return {
      providerId: provider.providerId,
      domain: provider.domain,
      type: provider.oidcConfig ? ("oidc" as const) : ("saml" as const),
      oidcConfig,
      samlConfig,
    };
  }),

  /**
   * Register a new SSO provider (ADMIN + Enterprise gate).
   * Cloud:       scoped to the calling user's organization.
   * Self-hosted: instance-wide provider (providerId = "default").
   */
  registerProvider: ssoAdminProcedure
    .input(
      z.object({
        type: z.enum(["oidc", "saml"]),
        oidcDiscoveryUrl: z.string().optional(),
        oidcClientId: z.string().optional(),
        oidcClientSecret: z.string().optional(),
        samlMetadataUrl: z.string().optional(),
        domain: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let organizationId: string | null = null;
      let providerId: string;

      // Cloud: domain is required for email-based signIn.sso({ email }) discovery
      if (isCloudMode() && !input.domain) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Domain is required for cloud SSO (e.g. acme.com)",
        });
      }
      const domain = input.domain ?? "";

      if (isCloudMode()) {
        organizationId = ctx.organizationId;
        providerId = `org-${ctx.organizationId}`;
      } else {
        providerId = INSTANCE_PROVIDER_ID;
      }

      let oidcConfigJson: string | null = null;
      let samlConfigJson: string | null = null;
      let issuer = "unknown";

      if (input.type === "oidc" && input.oidcDiscoveryUrl) {
        // The OIDC issuer is the base URL, not the discovery endpoint
        issuer = input.oidcDiscoveryUrl.replace(
          /\/\.well-known\/openid-configuration$/,
          ""
        );
        oidcConfigJson = JSON.stringify({
          issuer,
          discoveryEndpoint: input.oidcDiscoveryUrl,
          clientId: input.oidcClientId ?? "",
          clientSecret: input.oidcClientSecret ?? "",
          pkce: false,
        });
      } else if (input.type === "saml" && input.samlMetadataUrl) {
        issuer = input.samlMetadataUrl;
        samlConfigJson = JSON.stringify({
          metadataUrl: input.samlMetadataUrl,
        });
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            input.type === "oidc"
              ? "OIDC requires a discovery URL"
              : "SAML requires a metadata URL",
        });
      }

      await ctx.prisma.$transaction(async (tx) => {
        const provider = await tx.ssoProvider.upsert({
          where: { providerId },
          update: {
            issuer,
            domain,
            oidcConfig: oidcConfigJson,
            samlConfig: samlConfigJson,
          },
          create: {
            providerId,
            issuer,
            domain,
            oidcConfig: oidcConfigJson,
            samlConfig: samlConfigJson,
            domainVerified: false,
          },
        });

        await tx.orgSsoConfig.upsert({
          where: { providerId: provider.id },
          update: {
            autoProvision: true,
          },
          create: {
            organizationId,
            providerId: provider.id,
            autoProvision: true,
          },
        });
      });

      ctx.logger.info(
        { providerId, type: input.type },
        "SSO provider registered"
      );
      return { success: true, providerId };
    }),

  /**
   * Update existing SSO provider config (ADMIN + Enterprise gate).
   * Preserves client secret if the REDACTED placeholder is sent.
   */
  updateProvider: ssoAdminProcedure
    .input(
      z.object({
        type: z.enum(["oidc", "saml"]),
        oidcDiscoveryUrl: z.string().optional(),
        oidcClientId: z.string().optional(),
        oidcClientSecret: z.string().optional(),
        samlMetadataUrl: z.string().optional(),
        enabled: z.boolean().optional(),
        domain: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const providerId = isCloudMode()
        ? `org-${ctx.organizationId}`
        : INSTANCE_PROVIDER_ID;

      const existing = await ctx.prisma.ssoProvider.findUnique({
        where: { providerId },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "SSO provider not configured",
        });
      }

      // Preserve real secret if client sent back the redacted placeholder
      let clientSecret = input.oidcClientSecret;
      if (clientSecret === REDACTED && existing.oidcConfig) {
        const parsed = JSON.parse(existing.oidcConfig) as Record<
          string,
          unknown
        >;
        clientSecret = parsed.clientSecret as string | undefined;
      }

      if (input.type === "oidc" && !input.oidcDiscoveryUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "OIDC requires a discovery URL",
        });
      }
      if (input.type === "saml" && !input.samlMetadataUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "SAML requires a metadata URL",
        });
      }

      let oidcConfigJson: string | null = null;
      let samlConfigJson: string | null = null;
      let issuer = existing.issuer;

      if (input.type === "oidc" && input.oidcDiscoveryUrl) {
        // The OIDC issuer is the base URL, not the discovery endpoint
        issuer = input.oidcDiscoveryUrl.replace(
          /\/\.well-known\/openid-configuration$/,
          ""
        );
        oidcConfigJson = JSON.stringify({
          issuer,
          discoveryEndpoint: input.oidcDiscoveryUrl,
          clientId: input.oidcClientId ?? "",
          clientSecret: clientSecret ?? "",
          pkce: false,
        });
      } else if (input.type === "saml" && input.samlMetadataUrl) {
        issuer = input.samlMetadataUrl;
        samlConfigJson = JSON.stringify({
          metadataUrl: input.samlMetadataUrl,
        });
      }

      await ctx.prisma.ssoProvider.update({
        where: { providerId },
        data: {
          issuer,
          oidcConfig: oidcConfigJson,
          samlConfig: samlConfigJson,
          ...(input.domain !== undefined && { domain: input.domain }),
        },
      });

      ctx.logger.info({ providerId }, "SSO provider updated");
      return { success: true };
    }),

  /**
   * Delete SSO provider (ADMIN + Enterprise gate).
   */
  deleteProvider: ssoAdminProcedure.mutation(async ({ ctx }) => {
    const providerId = isCloudMode()
      ? `org-${ctx.organizationId}`
      : INSTANCE_PROVIDER_ID;

    // OrgSsoConfig is deleted via cascade on SsoProvider
    await ctx.prisma.ssoProvider.deleteMany({ where: { providerId } });

    ctx.logger.info({ providerId }, "SSO provider deleted");
    return { success: true };
  }),

  /**
   * Test OIDC connection by fetching the discovery document (ADMIN).
   * SSRF-protected: blocks private IPs, local hostnames, and non-HTTPS.
   * In development, SSRF checks are relaxed to allow localhost HTTP IdPs.
   */
  testConnection: ssoAdminProcedure
    .input(z.object({ discoveryUrl: z.string().check(z.url()) }))
    .mutation(async ({ input }) => {
      const url = new URL(input.discoveryUrl);
      const isDev = isDevelopment();

      if (!isDev && url.protocol !== "https:") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Discovery URL must use HTTPS",
        });
      }

      const hostname = url.hostname;
      if (
        !isDev &&
        (hostname === "localhost" ||
          hostname.endsWith(".local") ||
          hostname.endsWith(".internal"))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Discovery URL must not point to a local or internal host",
        });
      }

      // Skip IP resolution checks in dev (localhost is private by definition)
      let fetchUrl = new URL(input.discoveryUrl);
      if (!isDev) {
        const { address, family } = await dns.promises.lookup(hostname);
        if (isPrivateIP(address)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Discovery URL must not resolve to a private or internal IP",
          });
        }

        // Use the pre-resolved IP to avoid TOCTOU re-resolution by fetch.
        // IPv6 addresses must be wrapped in brackets in URLs.
        const resolvedHost = family === 6 ? `[${address}]` : address;
        fetchUrl = new URL(input.discoveryUrl);
        fetchUrl.hostname = resolvedHost;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        let response: Response;
        try {
          response = await fetch(fetchUrl.toString(), {
            signal: controller.signal,
            redirect: "error",
            headers: { Host: hostname },
          });
        } finally {
          clearTimeout(timeout);
        }

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
