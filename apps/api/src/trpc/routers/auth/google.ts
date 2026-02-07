import { TRPCError } from "@trpc/server";
import { OAuth2Client } from "google-auth-library";

import { generateToken } from "@/core/auth";

import { notionService } from "@/services/integrations/notion.service";
import { setSentryUser, trackSignUpError } from "@/services/sentry";

import { GoogleAuthSchema } from "@/schemas/auth";

import { googleConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

import { UserMapper } from "@/mappers/auth";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

// Initialize Google OAuth client
const client = new OAuth2Client();

/**
 * Google OAuth router
 * Handles Google authentication
 */
export const googleRouter = router({
  /**
   * Google OAuth login (PUBLIC - RATE LIMITED)
   */
  googleLogin: rateLimitedPublicProcedure
    .input(GoogleAuthSchema)
    .mutation(async ({ input, ctx }) => {
      const { credential } = input;

      // Check if OAuth is enabled
      if (!googleConfig.enabled) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Google OAuth is not enabled for this deployment",
        });
      }

      // Cloud mode requires Google OAuth
      if (isCloudMode() && !googleConfig.clientId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Google OAuth is required for cloud deployments",
        });
      }

      try {
        // Verify the Google OAuth token
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: googleConfig.clientId,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid Google token",
          });
        }

        const {
          sub: googleId,
          email,
          given_name,
          family_name,
          email_verified,
        } = payload;

        if (!email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email not provided by Google",
          });
        }

        // Find user by Google ID first (most secure)
        let user = await ctx.prisma.user.findUnique({
          where: { googleId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            workspaceId: true,
            isActive: true,
            emailVerified: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            googleId: true,
            pendingEmail: true,
            subscription: {
              select: {
                plan: true,
                status: true,
              },
            },
            workspace: {
              select: {
                id: true,
              },
            },
          },
        });

        let isNewUser = false;

        if (user) {
          // User already linked to this Google identity - just update last login
          user = await ctx.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              workspaceId: true,
              isActive: true,
              emailVerified: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
              googleId: true,
              pendingEmail: true,
              subscription: {
                select: {
                  plan: true,
                  status: true,
                },
              },
              workspace: {
                select: {
                  id: true,
                },
              },
            },
          });
        } else {
          // Check if email is already in use by another account
          const existingUser = await ctx.prisma.user.findUnique({
            where: { email },
            select: { id: true, googleId: true, ssoSubjectId: true },
          });

          if (existingUser) {
            // Security: Account exists with this email but different auth method
            // Do NOT automatically link - this would enable account takeover
            ctx.logger.warn(
              {
                email,
                googleId,
                existingAuthMethods: {
                  hasGoogle: !!existingUser.googleId,
                  hasSSO: !!existingUser.ssoSubjectId,
                },
              },
              "Google OAuth attempted for email with existing account"
            );
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "An account with this email already exists using a different sign-in method. Please sign in with your existing method.",
            });
          }

          // No existing account - create new user
          isNewUser = true;
          try {
            user = await ctx.prisma.user.create({
              data: {
                email,
                firstName: given_name || "",
                lastName: family_name || "",
                googleId,
                emailVerified: email_verified || true,
                emailVerifiedAt: email_verified ? new Date() : undefined,
                isActive: true,
                lastLogin: new Date(),
              },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                workspaceId: true,
                isActive: true,
                emailVerified: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                googleId: true,
                pendingEmail: true,
                subscription: {
                  select: {
                    plan: true,
                    status: true,
                  },
                },
                workspace: {
                  select: {
                    id: true,
                  },
                },
              },
            });

            // Update user in Notion (non-blocking)
            // Fire and forget - don't await to avoid blocking the response
            ctx.prisma.user
              .findUnique({
                where: { id: user.id },
              })
              .then((fullUser) => {
                if (fullUser) {
                  return notionService.syncUser(fullUser);
                }
              })
              .catch((notionError) => {
                ctx.logger.warn(
                  { notionError, userId: user?.id },
                  "Failed to update Notion"
                );
              });
          } catch (createError) {
            trackSignUpError("google_oauth", {
              email,
              error:
                createError instanceof Error
                  ? createError.message
                  : String(createError),
            });
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create user account",
            });
          }
        }

        if (!user.isActive) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Account is inactive",
          });
        }

        // Generate JWT token
        const token = await generateToken({
          id: user.id,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
        });

        // Set Sentry user context
        setSentryUser({
          id: user.id,
          email: user.email,
          workspaceId: user.workspaceId,
        });

        return {
          user: UserMapper.toApiResponse(user),
          token,
          isNewUser,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Google login error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to authenticate with Google",
        });
      }
    }),
});
