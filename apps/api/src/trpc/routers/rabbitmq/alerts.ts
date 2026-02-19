import { TRPCError } from "@trpc/server";

import { prisma } from "@/core/prisma";
import { abortableSleep } from "@/core/utils";

import type { AlertThresholds } from "@/services/alerts/alert.interfaces";
import { alertService } from "@/services/alerts/alert.service";
import { getUserPlan } from "@/services/plan/plan.service";

import {
  AlertsQueryWithOptionalVHostSchema,
  UpdateAlertNotificationSettingsRequestSchema,
  UpdateThresholdsRequestSchema,
} from "@/schemas/alerts";
import { ServerWorkspaceInputSchema } from "@/schemas/rabbitmq";

import { router, workspaceProcedure } from "@/trpc/trpc";

import { verifyServerAccess } from "./shared";

import { Prisma, UserPlan } from "@/generated/prisma/client";

type ServerAlert = Awaited<
  ReturnType<typeof alertService.getServerAlerts>
>["alerts"][number];

type AlertsQuery = {
  severity?: string;
  category?: string;
  resolved?: string;
  offset?: number;
  limit?: number;
};

/** Filter, sort and paginate alerts — shared by getAlerts and watchAlerts. */
function processAlerts(
  alerts: ServerAlert[],
  query: AlertsQuery
): { alerts: ServerAlert[]; total: number } {
  let filtered = alerts;

  if (query.severity) {
    filtered = filtered.filter((a) => a.severity === query.severity);
  }
  if (query.category) {
    filtered = filtered.filter((a) => a.category === query.category);
  }
  if (query.resolved !== undefined) {
    const isResolved = query.resolved === "true";
    filtered = filtered.filter((a) => a.resolved === isResolved);
  }

  filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const total = filtered.length;
  const offset = query.offset || 0;
  const limit = query.limit;
  const paginated =
    limit !== undefined ? filtered.slice(offset, offset + limit) : filtered;

  return { alerts: paginated, total };
}

/**
 * Alerts router
 * Handles RabbitMQ alert operations
 */
export const alertsRouter = router({
  /**
   * Get current alerts for a server
   */
  getAlerts: workspaceProcedure
    .input(ServerWorkspaceInputSchema.merge(AlertsQueryWithOptionalVHostSchema))
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhost: vhostParam, ...query } = input;

      try {
        const server = await verifyServerAccess(serverId, workspaceId);

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Get user plan to determine access level
        const userPlan = await getUserPlan(ctx.user.id);

        // Get vhost from validated query (required - filters queue-related alerts)
        const vhost = vhostParam ? decodeURIComponent(vhostParam) : "/";

        const { alerts, summary } = await alertService.getServerAlerts(
          serverId,
          server.name,
          workspaceId,
          vhost
        );

        // Get current thresholds for response
        const thresholds =
          await alertService.getWorkspaceThresholds(workspaceId);

        // For free users, return only summary (no detailed alerts)
        if (userPlan === UserPlan.FREE) {
          return {
            success: true,
            alerts: [], // Empty array for free users
            summary,
            thresholds,
            total: summary.total, // Total count for free users
            timestamp: new Date().toISOString(),
          };
        }

        // For Developer and Enterprise users, return full alerts
        const { alerts: paginatedAlerts, total } = processAlerts(alerts, query);

        return {
          success: true,
          alerts: paginatedAlerts,
          summary,
          thresholds,
          total,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error getting alerts");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get alerts",
        });
      }
    }),

  /**
   * Get resolved alerts for a server
   */
  getResolvedAlerts: workspaceProcedure
    .input(ServerWorkspaceInputSchema.merge(AlertsQueryWithOptionalVHostSchema))
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId, vhost: vhostParam, ...query } = input;

      try {
        const server = await verifyServerAccess(serverId, workspaceId);

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        // Get vhost from validated query (required - filters queue-related alerts)
        const vhost = vhostParam ? decodeURIComponent(vhostParam) : "/";

        const { alerts, total } = await alertService.getResolvedAlerts(
          serverId,
          workspaceId,
          {
            limit: query.limit,
            offset: query.offset,
            severity: query.severity,
            category: query.category,
            vhost, // Filter resolved alerts by vhost
          }
        );

        return {
          success: true,
          alerts,
          total,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error getting resolved alerts");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get resolved alerts",
        });
      }
    }),

  /**
   * Get health check for a server
   */
  getHealthCheck: workspaceProcedure
    .input(ServerWorkspaceInputSchema)
    .query(async ({ input, ctx }) => {
      const { serverId, workspaceId } = input;

      try {
        // Verify server access
        const server = await verifyServerAccess(serverId, workspaceId);
        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Server not found or access denied",
          });
        }

        const healthCheck = await alertService.getHealthCheck(
          serverId,
          workspaceId
        );

        return {
          success: true,
          health: healthCheck,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error getting health check");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get health check",
        });
      }
    }),

  /**
   * Get alert thresholds for the workspace (used for alerts form)
   */
  getThresholds: workspaceProcedure.query(async ({ ctx }) => {
    const { workspaceId } = ctx;

    try {
      // Verify workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const thresholds = await alertService.getWorkspaceThresholds(workspaceId);
      const canModify = await alertService.canModifyThresholds(workspaceId);

      return {
        success: true,
        thresholds,
        canModify,
        defaults: alertService.getDefaultThresholds(),
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error getting thresholds");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get thresholds",
      });
    }
  }),

  /**
   * Update alert thresholds for the workspace (used by alerts form)
   */
  updateThresholds: workspaceProcedure
    .input(UpdateThresholdsRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId } = ctx;
      const { thresholds } = input;

      try {
        // Verify workspace exists
        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { id: true },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        const result = await alertService.updateWorkspaceThresholds(
          workspaceId,
          thresholds as Partial<AlertThresholds>
        );

        if (!result.success) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: result.message,
          });
        }

        const updatedThresholds =
          await alertService.getWorkspaceThresholds(workspaceId);

        return {
          success: true,
          message: result.message,
          thresholds: updatedThresholds,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error updating thresholds");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update thresholds",
        });
      }
    }),

  /**
   * Get alert notification settings for the workspace
   */
  getNotificationSettings: workspaceProcedure.query(async ({ ctx }) => {
    const { workspaceId } = ctx;

    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          emailNotificationsEnabled: true,
          contactEmail: true,
          notificationSeverities: true,
          notificationServerIds: true,
          browserNotificationsEnabled: true,
          browserNotificationSeverities: true,
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      // Parse notificationSeverities from JSON, default to all severities if not set
      const notificationSeverities = workspace.notificationSeverities
        ? (workspace.notificationSeverities as string[])
        : ["critical", "warning", "info"];

      // Parse notificationServerIds from JSON, null/empty means all servers
      const notificationServerIds = workspace.notificationServerIds
        ? (workspace.notificationServerIds as string[])
        : null;

      // Parse browserNotificationSeverities from JSON, default to all severities if not set
      const browserNotificationSeverities =
        workspace.browserNotificationSeverities
          ? (workspace.browserNotificationSeverities as string[])
          : ["critical", "warning", "info"];

      return {
        success: true,
        settings: {
          emailNotificationsEnabled: workspace.emailNotificationsEnabled,
          contactEmail: workspace.contactEmail,
          notificationSeverities,
          notificationServerIds,
          browserNotificationsEnabled: workspace.browserNotificationsEnabled,
          browserNotificationSeverities,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error getting alert settings");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get alert settings",
      });
    }
  }),

  /**
   * Update alert notification settings for the workspace
   */
  updateNotificationSettings: workspaceProcedure
    .input(UpdateAlertNotificationSettingsRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId, user } = ctx;
      const {
        emailNotificationsEnabled,
        contactEmail,
        notificationSeverities,
        notificationServerIds,
        browserNotificationsEnabled,
        browserNotificationSeverities,
      } = input;

      try {
        // Check if user is workspace owner (only owners can update settings)
        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { ownerId: true },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        if (workspace.ownerId !== user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only workspace owners can update alert settings",
          });
        }

        // Update workspace settings
        const updateData: {
          emailNotificationsEnabled?: boolean;
          contactEmail?: string | null;
          notificationSeverities?: string[];
          notificationServerIds?: string[] | typeof Prisma.JsonNull;
          browserNotificationsEnabled?: boolean;
          browserNotificationSeverities?: string[];
        } = {};

        if (emailNotificationsEnabled !== undefined) {
          updateData.emailNotificationsEnabled = emailNotificationsEnabled;
        }

        if (contactEmail !== undefined) {
          updateData.contactEmail = contactEmail;
        }

        if (notificationSeverities !== undefined) {
          updateData.notificationSeverities = notificationSeverities;
        }

        if (notificationServerIds !== undefined) {
          // If empty array, set to Prisma.JsonNull (means all servers)
          // For Prisma JSON fields, use Prisma.JsonNull for explicit null
          updateData.notificationServerIds =
            notificationServerIds && notificationServerIds.length > 0
              ? notificationServerIds
              : Prisma.JsonNull;
        }

        if (browserNotificationsEnabled !== undefined) {
          updateData.browserNotificationsEnabled = browserNotificationsEnabled;
        }

        if (browserNotificationSeverities !== undefined) {
          updateData.browserNotificationSeverities =
            browserNotificationSeverities;
        }

        const updatedWorkspace = await prisma.workspace.update({
          where: { id: workspaceId },
          data: updateData,
          select: {
            emailNotificationsEnabled: true,
            contactEmail: true,
            notificationSeverities: true,
            notificationServerIds: true,
            browserNotificationsEnabled: true,
            browserNotificationSeverities: true,
          },
        });

        // Parse notificationSeverities from JSON, default to all severities if not set
        const responseSeverities = updatedWorkspace.notificationSeverities
          ? (updatedWorkspace.notificationSeverities as string[])
          : ["critical", "warning", "info"];

        // Parse notificationServerIds from JSON, null/empty means all servers
        const responseServerIds = updatedWorkspace.notificationServerIds
          ? (updatedWorkspace.notificationServerIds as string[])
          : null;

        // Parse browserNotificationSeverities from JSON, default to all severities if not set
        const responseBrowserSeverities =
          updatedWorkspace.browserNotificationSeverities
            ? (updatedWorkspace.browserNotificationSeverities as string[])
            : ["critical", "warning", "info"];

        return {
          success: true,
          settings: {
            emailNotificationsEnabled:
              updatedWorkspace.emailNotificationsEnabled,
            contactEmail: updatedWorkspace.contactEmail,
            notificationSeverities: responseSeverities,
            notificationServerIds: responseServerIds,
            browserNotificationsEnabled:
              updatedWorkspace.browserNotificationsEnabled,
            browserNotificationSeverities: responseBrowserSeverities,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error updating alert settings");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update alert settings",
        });
      }
    }),

  /**
   * Live alerts stream — SSE subscription replacing 30s polling (ALL USERS)
   * Fetches active alerts every 10s and pushes updates to the client.
   */
  watchAlerts: workspaceProcedure
    .input(ServerWorkspaceInputSchema.merge(AlertsQueryWithOptionalVHostSchema))
    .subscription(async function* ({ input, ctx, signal }) {
      const { serverId, workspaceId, vhost: vhostParam, ...query } = input;

      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Server not found or access denied",
        });
      }

      const vhost = vhostParam ? decodeURIComponent(vhostParam) : "/";
      const sig = signal ?? new AbortController().signal;

      while (!sig.aborted) {
        try {
          const userPlan = await getUserPlan(ctx.user.id);
          const { alerts, summary } = await alertService.getServerAlerts(
            serverId,
            server.name,
            workspaceId,
            vhost
          );
          const thresholds =
            await alertService.getWorkspaceThresholds(workspaceId);

          if (userPlan === UserPlan.FREE) {
            yield {
              success: true,
              alerts: [],
              summary,
              thresholds,
              total: summary.total,
              timestamp: new Date().toISOString(),
            };
          } else {
            const { alerts: paginatedAlerts, total } = processAlerts(
              alerts,
              query
            );

            yield {
              success: true,
              alerts: paginatedAlerts,
              summary,
              thresholds,
              total,
              timestamp: new Date().toISOString(),
            };
          }
        } catch (err) {
          ctx.logger.warn({ err, serverId }, "watchAlerts fetch error");
        }

        await abortableSleep(10000, sig);
      }
    }),
});
