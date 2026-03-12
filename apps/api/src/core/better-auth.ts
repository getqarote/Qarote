import { sso } from "@better-auth/sso";
import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getLicensePayload } from "@/core/feature-flags";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { EmailVerificationService } from "@/services/email/email-verification.service";
import { notionService } from "@/services/integrations/notion.service";
import { getUserPlan } from "@/services/plan/plan.service";
import { StripeCustomerService } from "@/services/stripe/customer.service";

import { authConfig, config, emailConfig, googleConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

import { UserPlan } from "@/generated/prisma/client";

/**
 * Enforce that the SSO provider's workspace has an enterprise entitlement.
 * Called in provisionUser (after IdP auth) as a second line of defense.
 * - Cloud: workspace owner must be on ENTERPRISE plan
 * - Self-hosted: license JWT must have "sso" feature or be ENTERPRISE tier
 */
async function enforceSsoEntitlement(providerId: string): Promise<void> {
  if (isCloudMode()) {
    const wsConfig = await prisma.workspaceSsoConfig.findUnique({
      where: { providerId },
      include: { workspace: true },
    });

    if (!wsConfig?.workspaceId || !wsConfig.workspace?.ownerId) {
      throw new Error("SSO not permitted: no workspace owner found");
    }

    const plan = await getUserPlan(wsConfig.workspace.ownerId);
    if (plan !== UserPlan.ENTERPRISE) {
      throw new Error("SSO requires Enterprise plan");
    }
  } else {
    const payload = await getLicensePayload();
    const hasSSO =
      payload &&
      (payload.features.includes("sso") ||
        payload.tier === UserPlan.ENTERPRISE);

    if (!hasSSO) {
      throw new Error("SSO requires Enterprise license");
    }
  }
}

export const auth = betterAuth({
  secret: authConfig.jwtSecret,
  baseURL: config.API_URL,
  basePath: "/api/auth",
  trustedOrigins: [
    config.FRONTEND_URL,
    ...config.CORS_ORIGIN.split(",").map((o) => o.trim()),
  ].filter(Boolean),

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  user: {
    modelName: "User",
    additionalFields: {
      firstName: { type: "string", required: true },
      lastName: { type: "string", required: true },
      role: { type: "string", required: false },
      isActive: { type: "boolean", required: false },
      workspaceId: { type: "string", required: false },
      locale: { type: "string", required: false },
      pendingEmail: { type: "string", required: false },
      lastLogin: { type: "date", required: false },
      stripeCustomerId: { type: "string", required: false },
      stripeSubscriptionId: { type: "string", required: false },
      discordJoined: { type: "boolean", required: false },
      discordJoinedAt: { type: "date", required: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh session if older than 1 day
    cookieCache: {
      enabled: false,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: isCloudMode(),
    password: {
      // Custom verify to handle legacy bcrypt hashes from before the migration.
      // better-auth defaults to scrypt; existing users have bcrypt ($2b$) hashes.
      // On successful bcrypt verify, the password is NOT rehashed here —
      // better-auth will rehash with its default hasher on next password change.
      // No custom hash — better-auth uses scrypt by default for new passwords.
      verify: async (data: { password: string; hash: string }) => {
        // Detect bcrypt hashes (legacy)
        if (
          data.hash.startsWith("$2a$") ||
          data.hash.startsWith("$2b$") ||
          data.hash.startsWith("$2y$")
        ) {
          return bcrypt.compare(data.password, data.hash);
        }
        // For non-bcrypt hashes, use the default scrypt verify from better-auth.
        // This import is dynamic to avoid circular dependency issues.
        const { verifyPassword } = await import("better-auth/crypto");
        return verifyPassword({
          password: data.password,
          hash: data.hash,
        });
      },
    },
  },

  socialProviders: {
    ...(googleConfig.enabled &&
      googleConfig.clientId &&
      googleConfig.clientSecret && {
        google: {
          clientId: googleConfig.clientId,
          clientSecret: googleConfig.clientSecret,
          mapProfileToUser: (profile: {
            given_name?: string;
            family_name?: string;
          }) => ({
            firstName: profile.given_name || "",
            lastName: profile.family_name || "",
          }),
        },
      }),
  },

  plugins: [
    sso({
      provisionUser: async ({ user, userInfo, provider }) => {
        // Enforce enterprise entitlement before allowing SSO login
        await enforceSsoEntitlement(provider.providerId);

        // Update user profile from IdP claims
        const updates: Record<string, unknown> = {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        };

        if (userInfo.given_name || userInfo.firstName) {
          updates.firstName = userInfo.given_name || userInfo.firstName;
        }
        if (userInfo.family_name || userInfo.lastName) {
          updates.lastName = userInfo.family_name || userInfo.lastName;
        }

        await prisma.user
          .update({ where: { id: user.id }, data: updates })
          .catch((err) => {
            const isCritical = "emailVerified" in updates;
            if (isCritical) {
              logger.error(
                { error: err, userId: user.id, updates },
                "Failed to update critical user fields from SSO claims"
              );
              throw err;
            }
            logger.warn(
              { err, userId: user.id },
              "Failed to update user profile from SSO claims"
            );
          });

        // Assign user to workspace based on the SSO provider's WorkspaceSsoConfig
        const wsConfig = await prisma.workspaceSsoConfig.findUnique({
          where: { providerId: provider.providerId },
        });

        if (wsConfig?.workspaceId) {
          await prisma.workspaceMember
            .upsert({
              where: {
                userId_workspaceId: {
                  userId: user.id,
                  workspaceId: wsConfig.workspaceId,
                },
              },
              update: {},
              create: {
                userId: user.id,
                workspaceId: wsConfig.workspaceId,
                role: "MEMBER",
              },
            })
            .catch((err) => {
              logger.warn(
                { err, userId: user.id, workspaceId: wsConfig.workspaceId },
                "Failed to upsert workspace member for SSO user"
              );
            });

          // Set primary workspace if not already set
          const baUser = user as Record<string, unknown>;
          if (!baUser.workspaceId) {
            await prisma.user
              .update({
                where: { id: user.id },
                data: { workspaceId: wsConfig.workspaceId },
              })
              .catch((err) => {
                logger.warn(
                  { err, userId: user.id },
                  "Failed to set primary workspace for SSO user"
                );
              });
          }
        }
      },
      disableImplicitSignUp: false,
    }),
  ],

  emailVerification: {
    sendOnSignUp: isCloudMode(),
    sendVerificationEmail: async ({ user, url }) => {
      logger.info(
        { userId: user.id },
        "Sending verification email via better-auth"
      );

      if (!emailConfig.enabled) {
        logger.info(
          { userId: user.id },
          "Email disabled, skipping verification email"
        );
        return;
      }

      try {
        const baUser = user as Record<string, unknown>;
        await EmailVerificationService.sendVerificationEmail(
          user.email,
          url,
          "SIGNUP",
          (baUser.firstName as string) || undefined,
          undefined,
          "en"
        );
      } catch (error) {
        logger.error(
          { error, userId: user.id },
          "Failed to send verification email"
        );
      }
    },
  },

  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Check if user is active before allowing session creation
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });

          if (user && !user.isActive) {
            throw new Error("Account is inactive");
          }
        },
        after: async (session) => {
          // Update lastLogin timestamp when a new session is created
          await prisma.user
            .update({
              where: { id: session.userId },
              data: { lastLogin: new Date() },
            })
            .catch((error) => {
              logger.warn(
                { error, userId: session.userId },
                "Failed to update lastLogin"
              );
            });
        },
      },
    },
    user: {
      create: {
        before: async (user) => {
          // Ensure firstName/lastName are set (required by schema).
          // SSO providers may only supply "name", not firstName/lastName.
          const baUser = user as Record<string, unknown>;
          if (!baUser.firstName) {
            const nameParts = (user.name || "").trim().split(/\s+/);
            baUser.firstName = nameParts[0] || "";
            if (!baUser.lastName) {
              baUser.lastName = nameParts.slice(1).join(" ") || "";
            }
          }
          return { data: baUser as typeof user };
        },
        after: async (user) => {
          const baUser = user as Record<string, unknown>;

          // Auto-start Enterprise trial for cloud users (fire-and-forget)
          if (isCloudMode()) {
            StripeCustomerService.provisionTrialForNewUser({
              userId: user.id,
              email: user.email,
              name: user.name || "",
              prisma,
            }).catch((error) => {
              logger.warn(
                { error, userId: user.id },
                "Failed to auto-start trial at registration"
              );
            });
          }

          // Auto-verify email when email service is disabled (self-hosted/binary)
          if (!emailConfig.enabled) {
            await prisma.user
              .update({
                where: { id: user.id },
                data: {
                  emailVerified: true,
                  emailVerifiedAt: new Date(),
                },
              })
              .catch((error) => {
                logger.warn(
                  { error, userId: user.id },
                  "Failed to auto-verify email"
                );
              });
          }

          // Sync user to Notion (fire-and-forget)
          prisma.user
            .findUnique({ where: { id: user.id } })
            .then((fullUser) => {
              if (fullUser) {
                return notionService.syncUser(fullUser);
              }
            })
            .catch((notionError) => {
              logger.warn(
                { notionError, userId: user.id },
                "Failed to sync user to Notion"
              );
            });

          // Set name from firstName + lastName if not already set
          if (!user.name && (baUser.firstName || baUser.lastName)) {
            await prisma.user
              .update({
                where: { id: user.id },
                data: {
                  name: `${(baUser.firstName as string) || ""} ${(baUser.lastName as string) || ""}`.trim(),
                },
              })
              .catch(() => {});
          }
        },
      },
    },
  },
});
