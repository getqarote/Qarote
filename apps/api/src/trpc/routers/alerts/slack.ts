import { TRPCError } from "@trpc/server";

import {
  CreateSlackConfigSchema,
  SlackConfigIdSchema,
  UpdateSlackConfigWithIdSchema,
} from "@/schemas/alerts";

import { router, workspaceProcedure } from "@/trpc/trpc";

/**
 * Slack router
 * Handles Slack configuration CRUD operations for alert notifications
 */
export const slackRouter = router({
  /**
   * Get all Slack configurations for the workspace (WORKSPACE)
   */
  getConfigs: workspaceProcedure.query(async ({ ctx }) => {
    const { workspaceId } = ctx;

    try {
      const slackConfigs = await ctx.prisma.slackConfig.findMany({
        where: {
          workspaceId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return slackConfigs.map((config) => ({
        ...config,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      }));
    } catch (error) {
      ctx.logger.error({ error }, "Error getting Slack configurations");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get Slack configurations",
      });
    }
  }),

  /**
   * Create a new Slack configuration (WORKSPACE)
   */
  createConfig: workspaceProcedure
    .input(CreateSlackConfigSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId } = ctx;
      const { webhookUrl, customValue, enabled = true } = input;

      try {
        const slackConfig = await ctx.prisma.slackConfig.create({
          data: {
            webhookUrl,
            customValue: customValue || null,
            enabled,
            workspaceId,
          },
        });

        return {
          ...slackConfig,
          createdAt: slackConfig.createdAt.toISOString(),
          updatedAt: slackConfig.updatedAt.toISOString(),
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error creating Slack configuration");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Slack configuration",
        });
      }
    }),

  /**
   * Update a Slack configuration (WORKSPACE)
   */
  updateConfig: workspaceProcedure
    .input(UpdateSlackConfigWithIdSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const { workspaceId } = ctx;

      try {
        // Verify Slack config belongs to workspace
        const existingConfig = await ctx.prisma.slackConfig.findFirst({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingConfig) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Slack configuration not found",
          });
        }

        const updateData: {
          webhookUrl?: string;
          customValue?: string | null;
          enabled?: boolean;
        } = {};

        if (data.webhookUrl !== undefined)
          updateData.webhookUrl = data.webhookUrl;
        if (data.customValue !== undefined)
          updateData.customValue = data.customValue;
        if (data.enabled !== undefined) updateData.enabled = data.enabled;

        const slackConfig = await ctx.prisma.slackConfig.update({
          where: { id },
          data: updateData,
        });

        return {
          ...slackConfig,
          createdAt: slackConfig.createdAt.toISOString(),
          updatedAt: slackConfig.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error updating Slack configuration");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update Slack configuration",
        });
      }
    }),

  /**
   * Delete a Slack configuration (WORKSPACE)
   */
  deleteConfig: workspaceProcedure
    .input(SlackConfigIdSchema)
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { workspaceId } = ctx;

      try {
        // Verify Slack config belongs to workspace
        const existingConfig = await ctx.prisma.slackConfig.findFirst({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingConfig) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Slack configuration not found",
          });
        }

        await ctx.prisma.slackConfig.delete({
          where: { id },
        });

        return { message: "Slack configuration deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error deleting Slack configuration");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete Slack configuration",
        });
      }
    }),
});
