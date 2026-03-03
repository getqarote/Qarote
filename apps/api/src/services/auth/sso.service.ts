import crypto from "node:crypto";

import type { JacksonOption } from "@boxyhq/saml-jackson";
import { controllers } from "@boxyhq/saml-jackson";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { config, ssoConfig } from "@/config";

import type { SSOExchangeCodeResult } from "./sso.interfaces";

import type { Prisma } from "@/generated/prisma/client";

/** Shape of the effective SSO config (DB or env-var derived) */
interface SSOEffectiveConfig {
  enabled: boolean;
  type: "oidc" | "saml";
  oidc: {
    discoveryUrl?: string;
    clientId?: string;
    clientSecret?: string;
  };
  saml: {
    metadataUrl?: string;
    metadataRaw?: string;
  };
  apiUrl: string;
  frontendUrl: string;
  tenant: string;
  product: string;
  buttonLabel: string;
}

/**
 * SSO Service using Ory Polis (BoxyHQ Jackson)
 * Handles SAML and OIDC SSO authentication
 *
 * Config resolution: DB (SystemSetting key "sso_config") takes priority over env vars.
 * This allows runtime reconfiguration from the admin UI without restart.
 */
class SSOService {
  private jacksonInstance: Awaited<ReturnType<typeof controllers>> | null =
    null;
  private _effectiveConfig: SSOEffectiveConfig | null = null;

  /** Current effective config (DB-first, env fallback) */
  get effectiveConfig(): SSOEffectiveConfig {
    if (!this._effectiveConfig) {
      return {
        enabled: ssoConfig.enabled,
        type: ssoConfig.type,
        oidc: { ...ssoConfig.oidc },
        saml: { ...ssoConfig.saml },
        apiUrl: config.API_URL,
        frontendUrl: config.FRONTEND_URL,
        tenant: ssoConfig.tenant,
        product: ssoConfig.product,
        buttonLabel: ssoConfig.buttonLabel,
      };
    }
    return this._effectiveConfig;
  }

  /**
   * Load effective config: check DB first, fall back to env vars
   */
  private async loadEffectiveConfig(): Promise<SSOEffectiveConfig> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "sso_config" },
      });

      if (setting) {
        const dbConfig = JSON.parse(setting.value) as Record<string, unknown>;
        logger.info("Loaded SSO config from database");
        return {
          enabled: (dbConfig.enabled as boolean) ?? false,
          type: (dbConfig.type as "oidc" | "saml") ?? "oidc",
          oidc: {
            discoveryUrl: dbConfig.oidcDiscoveryUrl as string | undefined,
            clientId: dbConfig.oidcClientId as string | undefined,
            clientSecret: dbConfig.oidcClientSecret as string | undefined,
          },
          saml: {
            metadataUrl: dbConfig.samlMetadataUrl as string | undefined,
          },
          apiUrl: (dbConfig.apiUrl as string) || config.API_URL,
          frontendUrl: (dbConfig.frontendUrl as string) || config.FRONTEND_URL,
          tenant: (dbConfig.tenant as string) || "default",
          product: (dbConfig.product as string) || "qarote",
          buttonLabel: (dbConfig.buttonLabel as string) || "Sign in with SSO",
        };
      }
    } catch (error) {
      logger.warn(
        { error },
        "Failed to load SSO config from database, using env vars"
      );
    }

    return {
      enabled: ssoConfig.enabled,
      type: ssoConfig.type,
      oidc: { ...ssoConfig.oidc },
      saml: { ...ssoConfig.saml },
      apiUrl: config.API_URL,
      frontendUrl: config.FRONTEND_URL,
      tenant: ssoConfig.tenant,
      product: ssoConfig.product,
      buttonLabel: ssoConfig.buttonLabel,
    };
  }

  /**
   * Initialize Jackson with the app's PostgreSQL database
   * and create/update the SSO connection
   */
  async initialize(): Promise<void> {
    this._effectiveConfig = await this.loadEffectiveConfig();

    if (!this._effectiveConfig.enabled) {
      logger.info("SSO is disabled, skipping initialization");
      return;
    }

    const cfg = this._effectiveConfig;
    const jacksonOptions: JacksonOption = {
      externalUrl: cfg.apiUrl,
      samlAudience: `https://saml.${cfg.product}.app`,
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

    // Auto-create SSO connection
    await this.ensureConnection();
  }

  /**
   * Reinitialize SSO service (called after admin UI config changes)
   * Resets Jackson instance and reloads config from DB
   */
  async reinitialize(): Promise<void> {
    this.jacksonInstance = null;
    this._effectiveConfig = null;
    await this.initialize();
  }

  /**
   * Create or update the SSO connection from effective config
   */
  private async ensureConnection(): Promise<void> {
    if (!this.jacksonInstance || !this._effectiveConfig) return;

    const { connectionAPIController } = this.jacksonInstance;
    const cfg = this._effectiveConfig;
    const redirectUrl = `${cfg.apiUrl}/sso/callback`;

    try {
      if (cfg.type === "oidc") {
        if (
          !cfg.oidc.discoveryUrl ||
          !cfg.oidc.clientId ||
          !cfg.oidc.clientSecret
        ) {
          logger.warn(
            "SSO OIDC enabled but missing required settings (discoveryUrl, clientId, clientSecret)"
          );
          return;
        }

        await connectionAPIController.createOIDCConnection({
          defaultRedirectUrl: redirectUrl,
          redirectUrl,
          tenant: cfg.tenant,
          product: cfg.product,
          oidcDiscoveryUrl: cfg.oidc.discoveryUrl,
          oidcClientId: cfg.oidc.clientId,
          oidcClientSecret: cfg.oidc.clientSecret,
        });

        logger.info(
          { tenant: cfg.tenant, product: cfg.product },
          "SSO OIDC connection created/updated"
        );
      } else if (cfg.type === "saml") {
        if (!cfg.saml.metadataUrl && !cfg.saml.metadataRaw) {
          logger.warn(
            "SSO SAML enabled but missing required settings (metadataUrl)"
          );
          return;
        }

        await connectionAPIController.createSAMLConnection({
          defaultRedirectUrl: redirectUrl,
          redirectUrl,
          tenant: cfg.tenant,
          product: cfg.product,
          rawMetadata: cfg.saml.metadataRaw || "",
          metadataUrl: cfg.saml.metadataUrl || "",
        });

        logger.info(
          { tenant: cfg.tenant, product: cfg.product },
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
