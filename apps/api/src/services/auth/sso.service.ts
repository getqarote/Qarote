import crypto from "node:crypto";

import type { JacksonOption } from "@boxyhq/saml-jackson";
import { controllers } from "@boxyhq/saml-jackson";

import { logger } from "@/core/logger";

import { config, ssoConfig } from "@/config";

import { AuthCodeEntry, SSOExchangeCodeResult } from "./sso.interfaces";

/**
 * SSO Service using Ory Polis (BoxyHQ Jackson)
 * Handles SAML and OIDC SSO authentication
 */
class SSOService {
  private jacksonInstance: Awaited<ReturnType<typeof controllers>> | null =
    null;

  // Temp auth code → JWT storage with 60s TTL
  private authCodes = new Map<string, AuthCodeEntry>();

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
      externalUrl: config.FRONTEND_URL,
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
    const frontendUrl = config.FRONTEND_URL;
    const redirectUrl = `${frontendUrl}/sso/callback`;

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
   * Store a JWT with a temporary single-use auth code (60s TTL)
   */
  storeAuthCode(
    jwt: string,
    user: Record<string, unknown>,
    isNewUser: boolean
  ): string {
    // Clean up expired codes
    const now = Date.now();
    for (const [code, entry] of this.authCodes) {
      if (entry.expiresAt < now) {
        this.authCodes.delete(code);
      }
    }

    const code = crypto.randomBytes(32).toString("hex");
    this.authCodes.set(code, {
      jwt,
      user,
      isNewUser,
      expiresAt: now + 60_000, // 60 seconds
    });

    return code;
  }

  /**
   * Exchange a temporary auth code for the stored JWT (single-use)
   */
  exchangeAuthCode(code: string): SSOExchangeCodeResult | null {
    const entry = this.authCodes.get(code);
    if (!entry) return null;

    // Delete immediately (single-use)
    this.authCodes.delete(code);

    // Check expiry
    if (entry.expiresAt < Date.now()) return null;

    return { jwt: entry.jwt, user: entry.user, isNewUser: entry.isNewUser };
  }
}

export const ssoService = new SSOService();
