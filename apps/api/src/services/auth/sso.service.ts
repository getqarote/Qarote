import crypto from "node:crypto";

import type { JacksonOption } from "@boxyhq/saml-jackson";
import { controllers } from "@boxyhq/saml-jackson";
import type { Prisma } from "@prisma/client";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { config, ssoConfig } from "@/config";

import type { SSOExchangeCodeResult } from "./sso.interfaces";

/**
 * SSO Service using Ory Polis (BoxyHQ Jackson)
 * Handles SAML and OIDC SSO authentication
 */
class SSOService {
  private jacksonInstance: Awaited<ReturnType<typeof controllers>> | null =
    null;

  /**
   * Initialize Jackson with the app's PostgreSQL database
   * and create/update the SSO connection from env vars
   */
  async initialize(): Promise<void> {
    if (!ssoConfig.enabled) {
      logger.info("SSO is disabled, skipping initialization");
      return;
    }

    const jacksonOptions: JacksonOption = {
      externalUrl: config.API_URL,
      samlAudience: `https://saml.${ssoConfig.product}.app`,
      samlPath: "/sso/acs",
      db: {
        engine: "sql",
        type: "postgres",
        url: config.DATABASE_URL,
      },
      openid: {},
    };

    this.jacksonInstance = await controllers(jacksonOptions);

    logger.info("Jackson SSO initialized successfully");

    // Auto-create SSO connection from env vars
    await this.ensureConnection();
  }

  /**
   * Create or update the SSO connection from environment variables
   */
  private async ensureConnection(): Promise<void> {
    if (!this.jacksonInstance) return;

    const { connectionAPIController } = this.jacksonInstance;
    const apiUrl = config.API_URL;
    const redirectUrl = `${apiUrl}/sso/callback`;

    try {
      if (ssoConfig.type === "oidc") {
        if (
          !ssoConfig.oidc.discoveryUrl ||
          !ssoConfig.oidc.clientId ||
          !ssoConfig.oidc.clientSecret
        ) {
          logger.warn(
            "SSO OIDC enabled but missing required env vars (SSO_OIDC_DISCOVERY_URL, SSO_OIDC_CLIENT_ID, SSO_OIDC_CLIENT_SECRET)"
          );
          return;
        }

        await connectionAPIController.createOIDCConnection({
          defaultRedirectUrl: redirectUrl,
          redirectUrl,
          tenant: ssoConfig.tenant,
          product: ssoConfig.product,
          oidcDiscoveryUrl: ssoConfig.oidc.discoveryUrl,
          oidcClientId: ssoConfig.oidc.clientId,
          oidcClientSecret: ssoConfig.oidc.clientSecret,
        });

        logger.info(
          { tenant: ssoConfig.tenant, product: ssoConfig.product },
          "SSO OIDC connection created/updated"
        );
      } else if (ssoConfig.type === "saml") {
        if (!ssoConfig.saml.metadataUrl && !ssoConfig.saml.metadataRaw) {
          logger.warn(
            "SSO SAML enabled but missing required env vars (SSO_SAML_METADATA_URL or SSO_SAML_METADATA_RAW)"
          );
          return;
        }

        await connectionAPIController.createSAMLConnection({
          defaultRedirectUrl: redirectUrl,
          redirectUrl,
          tenant: ssoConfig.tenant,
          product: ssoConfig.product,
          rawMetadata: ssoConfig.saml.metadataRaw || "",
          metadataUrl: ssoConfig.saml.metadataUrl || "",
        });

        logger.info(
          { tenant: ssoConfig.tenant, product: ssoConfig.product },
          "SSO SAML connection created/updated"
        );
      }
    } catch (error) {
      logger.error({ error }, "Failed to create SSO connection");
    }
  }

  get oauthController() {
    if (!this.jacksonInstance) {
      throw new Error("SSO Service not initialized");
    }
    return this.jacksonInstance.oauthController;
  }

  get connectionAPIController() {
    if (!this.jacksonInstance) {
      throw new Error("SSO Service not initialized");
    }
    return this.jacksonInstance.connectionAPIController;
  }

  /**
   * Generate a cryptographically random OAuth state token (CSRF protection)
   * Uses database storage to support multi-instance deployments
   * State tokens expire after 10 minutes
   */
  async generateStateToken(): Promise<string> {
    // Clean up expired state tokens (fire and forget)
    prisma.ssoState
      .deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      })
      .catch((error: Error) => {
        logger.warn({ error }, "Failed to clean up expired SSO state tokens");
      });

    const state = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.ssoState.create({
      data: {
        state,
        expiresAt,
      },
    });

    return state;
  }

  /**
   * Validate and consume an OAuth state token (single-use, CSRF protection)
   * Returns true if state is valid and not expired
   */
  async validateStateToken(state: string): Promise<boolean> {
    if (!state) return false;

    // Find and delete the state token in a single operation (atomic)
    const entry = await prisma.ssoState
      .delete({
        where: { state },
      })
      .catch(() => null); // State doesn't exist or already used

    if (!entry) return false;

    // Check expiry
    if (entry.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Store a JWT with a temporary single-use auth code (60s TTL)
   * Uses database storage to support multi-instance deployments
   */
  async storeAuthCode(
    jwt: string,
    user: Record<string, unknown>,
    isNewUser: boolean
  ): Promise<string> {
    // Clean up expired codes (fire and forget)
    prisma.ssoAuthCode
      .deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      })
      .catch((error: Error) => {
        logger.warn({ error }, "Failed to clean up expired SSO auth codes");
      });

    const code = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60_000); // 60 seconds

    await prisma.ssoAuthCode.create({
      data: {
        code,
        jwt,
        userData: user as Prisma.InputJsonValue,
        isNewUser,
        expiresAt,
      },
    });

    return code;
  }

  /**
   * Exchange a temporary auth code for the stored JWT (single-use)
   * Uses database storage to support multi-instance deployments
   */
  async exchangeAuthCode(code: string): Promise<SSOExchangeCodeResult | null> {
    // Find and delete the auth code in a single operation (atomic)
    const entry = await prisma.ssoAuthCode
      .delete({
        where: { code },
      })
      .catch(() => null); // Code doesn't exist or already used

    if (!entry) return null;

    // Check expiry
    if (entry.expiresAt < new Date()) {
      return null;
    }

    return {
      jwt: entry.jwt,
      user: entry.userData as Record<string, unknown>,
      isNewUser: entry.isNewUser,
    };
  }
}

export const ssoService = new SSOService();
