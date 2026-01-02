import { AlertSeverity, AlertType, ComparisonOperator } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { requirePremiumFeature } from "@/core/feature-flags";

import {
  AlertRuleIdSchema,
  CreateAlertRuleRequestSchema,
  UpdateAlertRuleWithIdSchema,
} from "@/schemas/alerts";

import { FEATURES } from "@/config/features";

import { router, workspaceProcedure } from "@/trpc/trpc";

/**
 * Alert rules router
 * Handles alert rule CRUD operations
 */
export const rulesRouter = router({
  /**
   * Get all alert rules for the workspace (WORKSPACE, feature gated)
   */
  getRules: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.ALERTING))
    .query(async ({ ctx }) => {
      const { workspaceId } = ctx;

      try {
        const alertRules = await ctx.prisma.alertRule.findMany({
          where: {
            workspaceId,
          },
          include: {
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                alerts: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return alertRules.map((rule) => ({
          ...rule,
          createdAt: rule.createdAt.toISOString(),
          updatedAt: rule.updatedAt.toISOString(),
        }));
      } catch (error) {
        ctx.logger.error({ error }, "Error getting alert rules");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get alert rules",
        });
      }
    }),

  /**
   * Get a single alert rule by ID (WORKSPACE)
   */
  getRule: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.ALERTING))
    .input(AlertRuleIdSchema)
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const { workspaceId } = ctx;

      try {
        const alertRule = await ctx.prisma.alertRule.findFirst({
          where: {
            id,
            workspaceId,
          },
          include: {
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                alerts: true,
              },
            },
          },
        });

        if (!alertRule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Alert rule not found",
          });
        }

        return {
          ...alertRule,
          createdAt: alertRule.createdAt.toISOString(),
          updatedAt: alertRule.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error getting alert rule");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get alert rule",
        });
      }
    }),

  /**
   * Create a new alert rule (WORKSPACE, feature gated)
   */
  createRule: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.ADVANCED_ALERT_RULES))
    .input(CreateAlertRuleRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId, user } = ctx;
      const data = input;

      try {
        // Verify server belongs to workspace
        const server = await ctx.prisma.rabbitMQServer.findFirst({
          where: {
            id: data.serverId,
            workspaceId,
          },
        });

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const alertRule = await ctx.prisma.alertRule.create({
          data: {
            name: data.name,
            description: data.description || null,
            type: data.type as AlertType,
            threshold: data.threshold,
            operator: data.operator as ComparisonOperator,
            severity: data.severity as AlertSeverity,
            enabled: data.enabled ?? true,
            serverId: data.serverId,
            workspaceId,
            createdById: user.id,
          },
          include: {
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                alerts: true,
              },
            },
          },
        });

        return {
          ...alertRule,
          createdAt: alertRule.createdAt.toISOString(),
          updatedAt: alertRule.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error creating alert rule");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create alert rule",
        });
      }
    }),

  /**
   * Update an alert rule (WORKSPACE, feature gated)
   */
  updateRule: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.ADVANCED_ALERT_RULES))
    .input(UpdateAlertRuleWithIdSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const { workspaceId } = ctx;

      try {
        // Verify alert rule belongs to workspace
        const existingRule = await ctx.prisma.alertRule.findFirst({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingRule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Alert rule not found",
          });
        }

        // If serverId is being updated, verify new server belongs to workspace
        if (data.serverId && data.serverId !== existingRule.serverId) {
          const server = await ctx.prisma.rabbitMQServer.findFirst({
            where: {
              id: data.serverId,
              workspaceId,
            },
          });

          if (!server) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Server not found or access denied",
            });
          }
        }

        const updateData: {
          name?: string;
          description?: string | null;
          type?: AlertType;
          threshold?: number;
          operator?: ComparisonOperator;
          severity?: AlertSeverity;
          enabled?: boolean;
          serverId?: string;
        } = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined)
          updateData.description = data.description;
        if (data.type !== undefined) updateData.type = data.type as AlertType;
        if (data.threshold !== undefined) updateData.threshold = data.threshold;
        if (data.operator !== undefined)
          updateData.operator = data.operator as ComparisonOperator;
        if (data.severity !== undefined)
          updateData.severity = data.severity as AlertSeverity;
        if (data.enabled !== undefined) updateData.enabled = data.enabled;
        if (data.serverId !== undefined) updateData.serverId = data.serverId;

        const alertRule = await ctx.prisma.alertRule.update({
          where: { id },
          data: updateData,
          include: {
            server: {
              select: {
                id: true,
                name: true,
                host: true,
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                alerts: true,
              },
            },
          },
        });

        return {
          ...alertRule,
          createdAt: alertRule.createdAt.toISOString(),
          updatedAt: alertRule.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error updating alert rule");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update alert rule",
        });
      }
    }),

  /**
   * Delete an alert rule (WORKSPACE, feature gated)
   */
  deleteRule: workspaceProcedure
    .use(requirePremiumFeature(FEATURES.ADVANCED_ALERT_RULES))
    .input(AlertRuleIdSchema)
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { workspaceId } = ctx;

      try {
        // Verify alert rule belongs to workspace
        const existingRule = await ctx.prisma.alertRule.findFirst({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingRule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Alert rule not found",
          });
        }

        await ctx.prisma.alertRule.delete({
          where: { id },
        });

        return { message: "Alert rule deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error deleting alert rule");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete alert rule",
        });
      }
    }),
});
