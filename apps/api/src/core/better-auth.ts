import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { authConfig, config, googleConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

export const auth = betterAuth({
  secret: authConfig.betterAuthSecret,
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
      emailVerified: { type: "boolean", required: false },
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
    password: {
      // Custom verify to handle legacy bcrypt hashes from before the migration.
      // better-auth defaults to scrypt; existing users have bcrypt ($2b$) hashes.
      // On successful bcrypt verify, the password is NOT rehashed here —
      // better-auth will rehash with its default hasher on next password change.
      hash: async (password: string) => {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
      },
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
        { userId: user.id, email: user.email },
        "Sending verification email via better-auth"
      );
      // TODO: Wire to existing EmailVerificationService
      // For now, log the verification URL
      logger.info({ url }, "Verification URL");
    },
  },
});
