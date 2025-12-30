import { TRPCError } from "@trpc/server";

import { rateLimitedProcedure, router } from "@/trpc/trpc";

/**
 * Discord router
 * Handles Discord community integration
 */
export const discordRouter = router({
  /**
   * Mark user as having joined Discord
   */
  markJoined: rateLimitedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.user;

    try {
      // Update user's Discord status
      const updatedUser = await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          discordJoined: true,
          discordJoinedAt: new Date(),
        },
        select: {
          id: true,
          discordJoined: true,
          discordJoinedAt: true,
        },
      });

      ctx.logger.info(
        { userId: user.id, email: user.email },
        "User marked as joined Discord"
      );

      return {
        success: true,
        discordJoined: updatedUser.discordJoined,
        discordJoinedAt: updatedUser.discordJoinedAt?.toISOString() ?? null,
      };
    } catch (error) {
      ctx.logger.error({ error }, "Error marking user as joined Discord");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update Discord status",
      });
    }
  }),

  /**
   * Get user's Discord join status
   */
  getStatus: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      const userData = await ctx.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          discordJoined: true,
          discordJoinedAt: true,
        },
      });

      if (!userData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        discordJoined: userData.discordJoined,
        discordJoinedAt: userData.discordJoinedAt?.toISOString() ?? null,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error fetching Discord status");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch Discord status",
      });
    }
  }),
});
