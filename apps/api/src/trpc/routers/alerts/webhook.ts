import { TRPCError } from "@trpc/server";

import { requirePremiumFeature } from "@/core/feature-flags";

import {
  CreateWebhookSchema,
  UpdateWebhookWithIdSchema,
  WebhookIdSchema,
} from "@/schemas/alerts";

import { FEATURES } from "@/config/features";

import { router, workspaceProcedure } from "@/trpc/trpc";

/**
 * Webhook router
 * Handles webhook CRUD operations for alert notifications
 */
export const webhookRouter = router({
  /**
   * Get all webhooks for the workspace (WORKSPACE, feature gated)
   */
  getWebhooks: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.WEBHOOK_INTEGRATION))
    .query(async ({ ctx }) => {
      const { workspaceId } = ctx;

      try {
        const webhooks = await ctx.prisma.webhook.findMany({
          where: {
            workspaceId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return webhooks.map((webhook) => ({
          ...webhook,
          createdAt: webhook.createdAt.toISOString(),
          updatedAt: webhook.updatedAt.toISOString(),
        }));
      } catch (error) {
        ctx.logger.error({ error }, "Error getting webhooks");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get webhooks",
        });
      }
    }),

  /**
   * Create a new webhook (WORKSPACE, feature gated)
   */
  createWebhook: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.WEBHOOK_INTEGRATION))
    .input(CreateWebhookSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId } = ctx;
      const { url, enabled = true, secret } = input;

      try {
        const webhook = await ctx.prisma.webhook.create({
          data: {
            url,
            enabled,
            secret: secret || null,
            workspaceId,
            version: "v1", // Match database default and webhook service
          },
        });

        return {
          ...webhook,
          createdAt: webhook.createdAt.toISOString(),
          updatedAt: webhook.updatedAt.toISOString(),
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error creating webhook");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create webhook",
        });
      }
    }),

  /**
   * Update a webhook (WORKSPACE)
   */
  updateWebhook: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.WEBHOOK_INTEGRATION))
    .input(UpdateWebhookWithIdSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const { workspaceId } = ctx;

      try {
        // Verify webhook belongs to workspace
        const existingWebhook = await ctx.prisma.webhook.findFirst({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingWebhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        const updateData: {
          url?: string;
          enabled?: boolean;
          secret?: string | null;
        } = {};

        if (data.url !== undefined) updateData.url = data.url;
        if (data.enabled !== undefined) updateData.enabled = data.enabled;
        if (data.secret !== undefined) updateData.secret = data.secret;

        const webhook = await ctx.prisma.webhook.update({
          where: { id },
          data: updateData,
        });

        return {
          ...webhook,
          createdAt: webhook.createdAt.toISOString(),
          updatedAt: webhook.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error updating webhook");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update webhook",
        });
      }
    }),

  /**
   * Delete a webhook (WORKSPACE, feature gated)
   */
  deleteWebhook: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.WEBHOOK_INTEGRATION))
    .input(WebhookIdSchema)
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { workspaceId } = ctx;

      try {
        // Verify webhook belongs to workspace
        const existingWebhook = await ctx.prisma.webhook.findFirst({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingWebhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        await ctx.prisma.webhook.delete({
          where: { id },
        });

        return { message: "Webhook deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error deleting webhook");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete webhook",
        });
      }
    }),
});
