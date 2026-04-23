/**
 * SSO Bootstrap
 *
 * Runs at startup (self-hosted only) to:
 * 1. Migrate existing ssoSubjectId values to better-auth Account rows
 * 2. Seed an instance-wide SSO provider from env vars (SSO_ENABLED=true) if not already configured
 * 3. Migrate old Jackson SystemSetting "sso_config" to OrgSsoConfig + SsoProvider
 *
 * All operations are idempotent — safe to run on every startup.
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { ssoConfig } from "@/config";
import { isSelfHostedMode } from "@/config/deployment";

const INSTANCE_PROVIDER_ID = "default";

/**
 * Migrate legacy ssoSubjectId values to better-auth Account rows.
 * Users who signed in via the old Jackson flow had their IdP subject stored in
 * User.ssoSubjectId. better-auth's SSO plugin tracks identity linkage via the
 * Account table (providerId: "sso", accountId: <subject>).
 */
async function migrateSsoSubjectIds(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { ssoSubjectId: { not: null } },
    select: { id: true, ssoSubjectId: true },
  });

  if (users.length === 0) return;

  let migrated = 0;

  for (const user of users) {
    if (!user.ssoSubjectId) continue;

    const existing = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "sso" },
    });

    if (existing) continue;

    try {
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.ssoSubjectId,
          providerId: "sso",
        },
      });
      migrated++;
    } catch (err) {
      logger.warn(
        { err, userId: user.id },
        "Failed to migrate ssoSubjectId to Account row"
      );
    }
  }

  if (migrated > 0) {
    logger.info(
      { migrated, total: users.length },
      "Migrated legacy ssoSubjectId values to better-auth Account rows"
    );
  }
}

/**
 * Seed an instance-wide SSO provider from environment variables.
 * Only runs if SSO_ENABLED=true and no OrgSsoConfig with organizationId=null exists.
 *
 * Also migrates the old Jackson SystemSetting "sso_config" if present.
 */
async function seedSsoProviders(): Promise<void> {
  if (!isSelfHostedMode()) return;

  // Check if instance-wide SSO is already configured
  const existing = await prisma.orgSsoConfig.findFirst({
    where: { organizationId: null },
  });

  if (existing) return;

  // Check for old Jackson SystemSetting to migrate
  const oldSetting = await prisma.systemSetting.findUnique({
    where: { key: "sso_config" },
  });

  let seedEnabled = ssoConfig.enabled;
  let seedType = ssoConfig.type;
  let seedOidcDiscoveryUrl = ssoConfig.oidc.discoveryUrl;
  let seedOidcClientId = ssoConfig.oidc.clientId;
  let seedOidcClientSecret = ssoConfig.oidc.clientSecret;
  let seedSamlMetadataUrl = ssoConfig.saml.metadataUrl;

  if (oldSetting) {
    try {
      const oldConfig = JSON.parse(oldSetting.value) as Record<string, unknown>;
      // Old config keys from Jackson ssoService
      seedEnabled = (oldConfig.enabled as boolean) ?? seedEnabled;
      seedType = (oldConfig.type as "oidc" | "saml") ?? seedType;
      seedOidcDiscoveryUrl =
        (oldConfig.oidcDiscoveryUrl as string) ?? seedOidcDiscoveryUrl;
      seedOidcClientId = (oldConfig.oidcClientId as string) ?? seedOidcClientId;
      seedOidcClientSecret =
        (oldConfig.oidcClientSecret as string) ?? seedOidcClientSecret;
      seedSamlMetadataUrl =
        (oldConfig.samlMetadataUrl as string) ?? seedSamlMetadataUrl;

      logger.info("Migrating old Jackson SSO config to better-auth SSO");
    } catch {
      logger.warn("Failed to parse old sso_config SystemSetting, ignoring");
    }
  }

  if (!seedEnabled) return;

  // Build the SsoProvider record for better-auth
  let oidcConfigJson: string | undefined;
  let samlConfigJson: string | undefined;
  let issuer = "unknown";

  if (seedType === "oidc" && seedOidcDiscoveryUrl) {
    // The OIDC issuer is the base URL, not the discovery endpoint
    issuer = seedOidcDiscoveryUrl.replace(
      /\/\.well-known\/openid-configuration$/,
      ""
    );
    oidcConfigJson = JSON.stringify({
      issuer,
      discoveryEndpoint: seedOidcDiscoveryUrl,
      clientId: seedOidcClientId ?? "",
      clientSecret: seedOidcClientSecret ?? "",
      pkce: false,
    });
  } else if (seedType === "saml" && seedSamlMetadataUrl) {
    issuer = seedSamlMetadataUrl;
    samlConfigJson = JSON.stringify({
      metadataUrl: seedSamlMetadataUrl,
    });
  } else {
    logger.warn(
      "SSO_ENABLED=true but no valid OIDC discovery URL or SAML metadata URL found — skipping SSO seeding"
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Create the SsoProvider row (better-auth's table)
    const provider = await tx.ssoProvider.upsert({
      where: { providerId: INSTANCE_PROVIDER_ID },
      update: {
        issuer,
        oidcConfig: oidcConfigJson ?? null,
        samlConfig: samlConfigJson ?? null,
      },
      create: {
        providerId: INSTANCE_PROVIDER_ID,
        issuer,
        domain: "", // Instance-wide provider: domain matching not used
        oidcConfig: oidcConfigJson ?? null,
        samlConfig: samlConfigJson ?? null,
        domainVerified: false,
      },
    });

    // Create the OrgSsoConfig mapping (organizationId=null = instance-wide)
    await tx.orgSsoConfig.upsert({
      where: { providerId: provider.id },
      update: { autoProvision: true },
      create: {
        organizationId: null,
        providerId: provider.id,
        autoProvision: true,
      },
    });

    // Archive old Jackson config key to prevent re-seeding
    if (oldSetting) {
      await tx.systemSetting.update({
        where: { key: "sso_config" },
        data: { key: "sso_config_migrated_v2" },
      });
    }
  });

  logger.info(
    { type: seedType, providerId: INSTANCE_PROVIDER_ID },
    "Instance-wide SSO provider seeded from environment variables"
  );
}

/**
 * Run all SSO bootstrap tasks
 */
export async function bootstrapSso(): Promise<void> {
  try {
    await migrateSsoSubjectIds();
    await seedSsoProviders();
  } catch (error) {
    logger.error({ error }, "SSO bootstrap failed — SSO may not be available");
  }
}
