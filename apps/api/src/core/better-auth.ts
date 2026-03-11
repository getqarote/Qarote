import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { EmailVerificationService } from "@/services/email/email-verification.service";
import { notionService } from "@/services/integrations/notion.service";
import { StripeCustomerService } from "@/services/stripe/customer.service";

import { authConfig, config, emailConfig, googleConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

export const auth = betterAuth({
  secret: authConfig.jwtSecret,
  baseURL: config.API_URL,
  basePath: "/api/auth",
  trustedOrigins: [config.FRONTEND_URL, config.CORS_ORIGIN].filter(Boolean),

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
      enabled: true,
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
