import { TRPCError } from "@trpc/server";

import { UserMapper } from "@/mappers/auth";

import { rateLimitedProcedure, router } from "@/trpc/trpc";

import { te } from "@/i18n";

/**
 * Session router
 * Login is now handled by better-auth directly (/api/auth/sign-in/email).
 * This router provides enriched session data with subscription info.
 */
export const sessionRouter = router({
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
          accounts: {
            select: {
              providerId: true,
            },
          },
        },
      });

      if (!fullUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "auth.userNotFound"),
        });
      }

      // Derive auth capabilities from Account records instead of legacy googleId
      const hasGoogle = fullUser.accounts.some(
        (a) => a.providerId === "google"
      );
      const hasCredential = fullUser.accounts.some(
        (a) => a.providerId === "credential"
      );
      const mapped = UserMapper.toApiResponse(fullUser);
      mapped.authProvider = hasGoogle ? "google" : "password";
      mapped.hasPassword = hasCredential;

      return {
        user: mapped,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error fetching session");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "auth.failedToFetchSession"),
      });
    }
  }),
});
