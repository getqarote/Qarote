import { TRPCError } from "@trpc/server";

import { prisma } from "@/core/prisma";
import { RabbitMQClient } from "@/core/rabbitmq";

import { seedDefaultAlertRules } from "@/services/alerts/alert-seeding.service";
import { recordCapabilityRecheck } from "@/services/audit";
import { EncryptionService } from "@/services/encryption.service";
import {
  getBadgeTrackedFeatures,
  isFeatureReadyOnSnapshot,
} from "@/services/feature-gate";
import { refreshServerCapabilities } from "@/services/feature-gate/capability-refresh";
import {
  applyCapabilityOverride,
  parseCapabilitySnapshot,
} from "@/services/feature-gate/capability-snapshot";
import {
  extractMajorMinorVersion,
  getOrgPlan,
  getOrgResourceCounts,
  validateRabbitMqVersion,
  validateServerCreation,
} from "@/services/plan/plan.service";

import {
  CreateServerWithWorkspaceSchema,
  DeleteServerInputSchema,
  GetServerInputSchema,
  GetServersInputSchema,
  TestConnectionWithWorkspaceSchema,
  UpdateServerWithWorkspaceSchema,
} from "@/schemas/rabbitmq";

import {
  adminPlanValidationProcedure,
  authorize,
  router,
  workspaceProcedure,
} from "@/trpc/trpc";

import { UserPlan, UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Server router
 * Handles RabbitMQ server management operations
 */
export const serverRouter = router({
  /**
   * Get all RabbitMQ servers for a workspace (ALL USERS)
   */
  getServers: workspaceProcedure
    .input(GetServersInputSchema)
    .query(async ({ input, ctx }) => {
      const { workspaceId } = input;

      try {
        // Only return servers that belong to the workspace
        const servers = await prisma.rabbitMQServer.findMany({
          where: {
            workspaceId,
          },
          select: {
            id: true,
            name: true,
            host: true,
            port: true,
            amqpPort: true,
            username: true,
            vhost: true,
            useHttps: true,
            isOverQueueLimit: true,
            queueCountAtConnect: true,
            overLimitWarningShown: true,
            createdAt: true,
            updatedAt: true,
            workspaceId: true,
          },
        });

        // Transform the response to decrypt sensitive data for display
        const transformedServers = servers.map((server) => ({
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          amqpPort: server.amqpPort,
          username: EncryptionService.decrypt(server.username), // Decrypt for display
          vhost: server.vhost,
          useHttps: server.useHttps,
          isOverQueueLimit: server.isOverQueueLimit,
          queueCountAtConnect: server.queueCountAtConnect,
          overLimitWarningShown: server.overLimitWarningShown,
          createdAt: server.createdAt.toISOString(),
          updatedAt: server.updatedAt.toISOString(),
          workspaceId: server.workspaceId,
        }));

        return {
          servers: transformedServers,
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error fetching servers");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToFetchServers"),
        });
      }
    }),

  /**
   * Get a specific server by ID (ALL USERS)
   */
  getServer: workspaceProcedure
    .input(GetServerInputSchema)
    .query(async ({ input, ctx }) => {
      const { id, workspaceId } = input;

      try {
        const server = await prisma.rabbitMQServer.findUnique({
          where: {
            id,
            // Ensure the server belongs to the workspace
            workspaceId,
          },
          select: {
            id: true,
            name: true,
            host: true,
            port: true,
            amqpPort: true,
            username: true,
            vhost: true,
            useHttps: true,
            isOverQueueLimit: true,
            queueCountAtConnect: true,
            overLimitWarningShown: true,
            createdAt: true,
            updatedAt: true,
            workspaceId: true,
          },
        });

        if (!server) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        // Transform the response to decrypt sensitive data for display
        const transformedServer = {
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          amqpPort: server.amqpPort,
          username: EncryptionService.decrypt(server.username), // Decrypt for display
          vhost: server.vhost,
          useHttps: server.useHttps,
          isOverQueueLimit: server.isOverQueueLimit,
          queueCountAtConnect: server.queueCountAtConnect,
          overLimitWarningShown: server.overLimitWarningShown,
          createdAt: server.createdAt.toISOString(),
          updatedAt: server.updatedAt.toISOString(),
          workspaceId: server.workspaceId,
        };

        return {
          server: transformedServer,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error, id }, "Error fetching server");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToFetchServer"),
        });
      }
    }),

  /**
   * Create a new server (ADMIN ONLY - sensitive operation with plan validation)
   */
  createServer: adminPlanValidationProcedure
    .input(CreateServerWithWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const { workspaceId, ...data } = input;

      try {
        // Validate plan restrictions for server creation
        const orgInfo = await ctx.resolveOrg();
        const resolvedOrgId = orgInfo?.organizationId;
        const [plan, resourceCounts] = await Promise.all([
          resolvedOrgId
            ? getOrgPlan(resolvedOrgId)
            : Promise.resolve(UserPlan.FREE),
          resolvedOrgId
            ? getOrgResourceCounts(resolvedOrgId)
            : Promise.resolve({ servers: 0, users: 0, workspaces: 0 }),
        ]);

        validateServerCreation(plan, resourceCounts.servers);

        ctx.logger.info({ data }, "Creating server with data");

        // Test connection before creating the server (use plain text for testing)
        const client = new RabbitMQClient({
          host: data.host,
          port: data.port,
          amqpPort: data.amqpPort,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          useHttps: data.useHttps,
        });

        // Attempt to get the overview to validate connection and detect version
        const overview = await client.getOverview();
        const rabbitMqVersion = overview.rabbitmq_version;
        const majorMinorVersion = extractMajorMinorVersion(rabbitMqVersion);

        // Validate RabbitMQ version against plan restrictions
        validateRabbitMqVersion(plan, rabbitMqVersion);

        // Encrypt sensitive data before storing
        const server = await prisma.rabbitMQServer.create({
          data: {
            name: data.name,
            host: data.host,
            port: data.port,
            amqpPort: data.amqpPort,
            username: EncryptionService.encrypt(data.username), // Encrypt username
            password: EncryptionService.encrypt(data.password), // Encrypt password
            vhost: data.vhost,
            useHttps: data.useHttps,
            version: rabbitMqVersion, // Store full version
            versionMajorMinor: majorMinorVersion, // Store major.minor for plan validation
            // Store over-limit information
            overLimitWarningShown: false,
            // Assign server to workspace
            workspaceId,
          },
        });

        // Seed default alert rules for the new server — fire-and-forget;
        // errors are caught and logged inside seedDefaultAlertRules so
        // server creation is never blocked or rolled back by seeding failures.
        void seedDefaultAlertRules(server.id, workspaceId);

        // Detect broker capabilities and persist the snapshot. Fire-and-forget
        // for the same reason as alert seeding — capability detection failure
        // must not block server creation; the nightly cron will retry.
        void refreshServerCapabilities(server.id, client).catch((error) => {
          ctx.logger.warn(
            { error, serverId: server.id },
            "initial capability detection failed — nightly cron will retry"
          );
        });

        return {
          server: {
            id: server.id,
            name: server.name,
            host: server.host,
            port: server.port,
            amqpPort: server.amqpPort,
            username: data.username, // Return original (not encrypted) for UI
            vhost: server.vhost,
            useHttps: server.useHttps,
            workspaceId: server.workspaceId,
            createdAt: server.createdAt.toISOString(),
            updatedAt: server.updatedAt.toISOString(),
          },
        };
      } catch (error) {
        ctx.logger.error({ error }, "Error creating server");
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : te(ctx.locale, "rabbitmq.failedToCreateServer"),
        });
      }
    }),

  /**
   * Update a server (ADMIN ONLY - sensitive operation)
   */
  updateServer: authorize([UserRole.ADMIN])
    .input(UpdateServerWithWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, workspaceId, ...data } = input;

      try {
        // Check if server exists and belongs to workspace
        const existingServer = await prisma.rabbitMQServer.findUnique({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        // If credentials are being updated, test the connection
        if (
          data.host ||
          data.port ||
          data.username ||
          data.password ||
          data.vhost ||
          data.useHttps !== undefined
        ) {
          const client = new RabbitMQClient({
            host: data.host || existingServer.host,
            port: data.port || existingServer.port,
            amqpPort: data.amqpPort || existingServer.amqpPort,
            username: data.username || existingServer.username,
            password: data.password || existingServer.password,
            vhost: data.vhost || existingServer.vhost,
            useHttps: data.useHttps ?? existingServer.useHttps,
            version: existingServer.version ?? undefined,
            versionMajorMinor: existingServer.versionMajorMinor ?? undefined,
          });

          await client.getOverview();
        }

        // Prepare update data with proper encryption
        const updateData: {
          name?: string;
          host?: string;
          port?: number;
          amqpPort?: number;
          username?: string;
          password?: string;
          vhost?: string;
          useHttps?: boolean;
        } = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.host !== undefined) updateData.host = data.host;
        if (data.port !== undefined) updateData.port = data.port;
        if (data.amqpPort !== undefined) updateData.amqpPort = data.amqpPort;
        if (data.username !== undefined)
          updateData.username = EncryptionService.encrypt(data.username);
        if (data.password !== undefined)
          updateData.password = EncryptionService.encrypt(data.password);
        if (data.vhost !== undefined) updateData.vhost = data.vhost;
        if (data.useHttps !== undefined) updateData.useHttps = data.useHttps;

        const server = await prisma.rabbitMQServer.update({
          where: { id },
          data: updateData,
        });

        return {
          server: {
            id: server.id,
            name: server.name,
            host: server.host,
            port: server.port,
            amqpPort: server.amqpPort,
            username: EncryptionService.decrypt(server.username), // Decrypt for display
            vhost: server.vhost,
            useHttps: server.useHttps,
            createdAt: server.createdAt.toISOString(),
            updatedAt: server.updatedAt.toISOString(),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error, id }, "Error updating server");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : te(ctx.locale, "rabbitmq.failedToUpdateServer"),
        });
      }
    }),

  /**
   * Delete a server (ADMIN ONLY - dangerous operation)
   */
  deleteServer: authorize([UserRole.ADMIN])
    .input(DeleteServerInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, workspaceId } = input;

      try {
        // Check if server exists and belongs to workspace
        const existingServer = await prisma.rabbitMQServer.findUnique({
          where: {
            id,
            workspaceId,
          },
        });

        if (!existingServer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
          });
        }

        await prisma.rabbitMQServer.delete({
          where: { id },
        });

        return {
          message: te(ctx.locale, "messages.serverDeletedSuccess"),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error, id }, "Error deleting server");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "rabbitmq.failedToDeleteServer"),
        });
      }
    }),

  /**
   * Test RabbitMQ connection (ADMIN ONLY - could expose sensitive info)
   */
  testConnection: authorize([UserRole.ADMIN])
    .input(TestConnectionWithWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      // Extract connection credentials (exclude workspaceId which is only for validation)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { workspaceId, ...credentials } = input;

      ctx.logger.info({ credentials }, "Testing connection with credentials");

      try {
        const client = new RabbitMQClient(credentials);
        ctx.logger.info({ client }, "Created RabbitMQ client");
        const overview = await client.getOverview();

        return {
          success: true,
          message: te(ctx.locale, "messages.connectionSuccessful"),
          version: overview.rabbitmq_version,
          cluster_name: overview.cluster_name,
        };
      } catch (error) {
        ctx.logger.error({ error }, "Connection test failed");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : te(ctx.locale, "rabbitmq.connectionFailed"),
        });
      }
    }),

  /**
   * Read the persisted capability snapshot for a server, with the
   * support `capabilityOverride` already merged in. Returns the
   * indexable scalars (version, productName) alongside the snapshot
   * payload so the UI can render version + plugin info in one query.
   *
   * Returns `null` snapshot when the server has no detection yet —
   * frontend treats this as "loading" / "Re-check needed".
   */
  getCapabilities: workspaceProcedure
    .input(GetServerInputSchema)
    .query(async ({ input, ctx }) => {
      const { id: serverId, workspaceId } = input;
      const server = await prisma.rabbitMQServer.findFirst({
        where: { id: serverId, workspaceId },
        select: {
          id: true,
          version: true,
          productName: true,
          capabilities: true,
          capabilityOverride: true,
          capabilitiesAt: true,
        },
      });
      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }

      const snapshot = applyCapabilityOverride(
        parseCapabilitySnapshot(server.capabilities),
        server.capabilityOverride
      );

      // Computed server-side so the frontend never re-implements the
      // dispatch — the badge just renders the list as-is. Adding a new
      // capability-gated feature in `gate.config.ts` automatically
      // surfaces here without a frontend change.
      const featureReadiness = getBadgeTrackedFeatures().map((feature) => ({
        feature,
        ready: snapshot ? isFeatureReadyOnSnapshot(feature, snapshot) : false,
      }));

      return {
        snapshot,
        version: server.version,
        productName: server.productName,
        capabilitiesAt: server.capabilitiesAt
          ? server.capabilitiesAt.toISOString()
          : null,
        featureReadiness,
      };
    }),

  /**
   * Manually re-detect broker capabilities for a server.
   *
   * Server-side rate limit: 1 attempt per server per 60 s. The cap is
   * keyed on **attempt time**, not last-success time — a user spamming
   * Re-check against a broken broker would otherwise dodge the cooldown
   * (`capabilitiesAt` is only updated on a successful detection).
   *
   * The map is in-memory and per-replica. With multiple API replicas,
   * each replica enforces its own 60s window — acceptable: cross-replica
   * coordination would require Redis and the DoS risk here (the user's
   * own broker) is low. Promote to a DB column if multi-replica becomes
   * a hard requirement.
   */
  recheckCapabilities: workspaceProcedure
    .input(GetServerInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { id: serverId, workspaceId } = input;

      // Fetch the server + the prior snapshot fields in one round-trip.
      // Prior `hasFirehoseExchange` feeds the audit-log diff so a
      // reviewer can see a plugin flipping off without joining tables.
      const server = await prisma.rabbitMQServer.findFirst({
        where: { id: serverId, workspaceId },
        select: { id: true, capabilities: true },
      });
      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "rabbitmq.serverNotFoundOrAccessDenied"),
        });
      }
      const priorSnapshot = parseCapabilitySnapshot(server.capabilities);
      const hadFirehoseBefore = priorSnapshot?.hasFirehoseExchange ?? null;

      const now = Date.now();
      evictStaleRecheckEntries(now);
      const lastAttempt = recheckAttemptByServer.get(serverId);
      if (lastAttempt && now - lastAttempt < RECHECK_COOLDOWN_MS) {
        const retryAfterMs = RECHECK_COOLDOWN_MS - (now - lastAttempt);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: te(ctx.locale, "rabbitmq.recheckCooldown", {
            seconds: Math.ceil(retryAfterMs / 1000),
          }),
        });
      }
      // Mark the attempt BEFORE running the refresh so failures still
      // count toward the cooldown (defends against a broken-broker DoS).
      recheckAttemptByServer.set(serverId, now);

      const result = await refreshServerCapabilities(serverId);

      // Best-effort audit write — `recordCapabilityRecheck` swallows
      // its own errors and logs them, so awaiting is safe here. We
      // intentionally DON'T fire-and-forget (`void ...`): that would
      // mask any future synchronous throw in the helper as an
      // unhandled rejection. Awaiting keeps the response ordered with
      // the audit row's persistence, which the eventual audit-reader
      // UI relies on.
      //
      // The audit insert is intentionally OUT of any transaction with
      // the capability refresh — the contract is "record every attempt
      // (success and failure)", which a shared TX would defeat (a
      // refresh-side rollback would also drop the audit row).
      await recordCapabilityRecheck(serverId, ctx.user.id, {
        success: result.snapshot !== null,
        // Audit `changed` reflects what was actually written, not what
        // the detector saw. `result.changed` is the detected diff
        // computed BEFORE the optimistic CAS — a losing concurrent
        // refresh would otherwise log `changed: true` while persisting
        // nothing. AND-ing with `result.persisted` keeps the audit
        // contract truthful.
        changed: result.persisted && result.changed,
        hadFirehoseBefore,
        hasFirehoseAfter: result.snapshot?.hasFirehoseExchange ?? null,
      });

      // Re-read the row so the response carries the SAME merged-shape
      // payload as `getCapabilities` — including version, productName,
      // capabilitiesAt, and any persisted capabilityOverride. Without
      // this re-read, the FE has to fire a second `getCapabilities`
      // query right after the recheck mutation.
      const refreshed = await prisma.rabbitMQServer.findFirst({
        where: { id: serverId, workspaceId },
        select: {
          version: true,
          productName: true,
          capabilities: true,
          capabilityOverride: true,
          capabilitiesAt: true,
        },
      });
      const mergedSnapshot = refreshed
        ? applyCapabilityOverride(
            parseCapabilitySnapshot(refreshed.capabilities),
            refreshed.capabilityOverride
          )
        : null;

      return {
        persisted: result.persisted,
        changed: result.changed,
        snapshot: mergedSnapshot,
        version: refreshed?.version ?? null,
        productName: refreshed?.productName ?? null,
        capabilitiesAt: refreshed?.capabilitiesAt
          ? refreshed.capabilitiesAt.toISOString()
          : null,
      };
    }),
});

/** Rate-limit window for manual capability rechecks (per replica, in-memory). */
const RECHECK_COOLDOWN_MS = 60_000;

/**
 * Per-server recheck cooldown — module-scoped Map keyed on serverId.
 * Lives outside the router definition so the entries persist across
 * mutations (router definitions are evaluated once at module init).
 * Entries older than RECHECK_COOLDOWN_MS are evicted on each check to
 * prevent the Map from growing unbounded on long-lived replicas.
 */
const recheckAttemptByServer = new Map<string, number>();

function evictStaleRecheckEntries(now: number): void {
  for (const [id, ts] of recheckAttemptByServer) {
    if (now - ts >= RECHECK_COOLDOWN_MS) recheckAttemptByServer.delete(id);
  }
}
