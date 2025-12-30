import { TRPCError } from "@trpc/server";

import { comparePassword, generateToken } from "@/core/auth";

import { setSentryUser } from "@/services/sentry";

import { LoginSchema } from "@/schemas/auth";

import { UserMapper } from "@/mappers/auth";

import {
  rateLimitedProcedure,
  rateLimitedPublicProcedure,
  router,
} from "@/trpc/trpc";

/**
 * Session router
 * Handles login and session management
 */
export const sessionRouter = router({
  /**
   * User login (PUBLIC - RATE LIMITED)
   */
  login: rateLimitedPublicProcedure
    .input(LoginSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      try {
        // Find user by email
        const user = await ctx.prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            isActive: true,
            emailVerified: true,
            passwordHash: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            role: true,
            email: true,
            firstName: true,
            lastName: true,
            workspaceId: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            pendingEmail: true,
            workspace: {
              select: {
                id: true,
              },
            },
            subscription: {
              select: {
                plan: true,
                status: true,
              },
            },
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        if (!user.isActive) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Account is inactive",
          });
        }

        if (!user.emailVerified) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Please verify your email before logging in",
          });
        }

        if (!user.passwordHash) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This account uses Google sign-in. Please use Google login.",
          });
        }

        // Verify password
        const isPasswordValid = await comparePassword(
          password,
          user.passwordHash
        );
        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Update last login
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

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
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Login error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to login",
        });
      }
    }),

  /**
   * Get current session (PROTECTED)
   */
  getSession: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      const fullUser = await ctx.prisma.user.findUnique({
        where: { id: user.id },
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

      if (!fullUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        user: UserMapper.toApiResponse(fullUser),
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error fetching session");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch session",
      });
    }
  }),
});
