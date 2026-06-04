/**
 * Live-broker MCP read tools — `list_servers`, `list_queues`, `get_overview`.
 *
 * Unlike the diagnosis tools (which read from the Qarote DB), these proxy
 * straight through to the RabbitMQ Management HTTP API for the workspace's
 * connected servers. Read-only by design — mutations (publish, purge,
 * delete) are deliberately out of scope per PRD §1.3 ("write/purge/delete
 * via agent = footgun, non-goal v1").
 *
 * Workspace scoping is enforced two ways:
 * - `list_servers` queries Prisma with `workspaceId: auth.scope.workspaceId`.
 * - `list_queues` / `get_overview` route their input `serverId` through
 *   `verifyServerAccess(serverId, workspaceId)` before opening a broker
 *   client. Cross-workspace ids surface as a structured not-found error.
 *
 * Credentials never leave the server: the `list_servers` projection
 * omits `username`/`password`/SSL config — the agent gets the metadata
 * it needs to call the other tools, nothing more.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import {
  createRabbitMQClientFromServer,
  verifyServerAccess,
} from "@/trpc/routers/rabbitmq/shared";

import type { ApiKeyAuth } from "@/auth/resolve-api-key";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
};

function toolOk(payload: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

function toolError(message: string): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export function registerBrokerReadTools(
  server: McpServer,
  auth: ApiKeyAuth
): void {
  const { workspaceId } = auth.scope;

  server.registerTool(
    "list_servers",
    {
      title: "List RabbitMQ servers",
      description:
        "List the RabbitMQ servers connected to this workspace. Returns id, name, host, port, vhost, version, environment — never credentials. The returned ids feed `list_queues` and `get_overview`.",
    },
    async () => {
      const servers = await prisma.rabbitMQServer.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          host: true,
          port: true,
          vhost: true,
          version: true,
          environment: true,
        },
        orderBy: { name: "asc" },
      });
      return toolOk(servers);
    }
  );

  server.registerTool(
    "list_queues",
    {
      title: "List queues",
      description:
        "List queues on a workspace-scoped RabbitMQ server. Live read from the Management API — surfaces the current state, message counts, consumer counts. Pass a `vhost` to filter; omit for all vhosts the server exposes.",
      inputSchema: {
        serverId: z.string().min(1),
        // Reject blank/whitespace vhost (would otherwise pass `""` to
        // getQueues and silently match "all vhosts" — masking a typo).
        vhost: z.string().trim().min(1).optional(),
      },
    },
    async ({ serverId, vhost }) => {
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return toolError("Server not found.");
      }
      try {
        const client = createRabbitMQClientFromServer(server);
        const queues = await client.getQueues(vhost);
        return toolOk(queues);
      } catch (err) {
        logger.warn(
          { err, serverId, workspaceId },
          "mcp.list_queues.broker_unreachable"
        );
        return toolError(
          "Could not reach the broker. Check the server's connection state in Qarote."
        );
      }
    }
  );

  server.registerTool(
    "get_overview",
    {
      title: "Get broker overview",
      description:
        "Fetch the RabbitMQ broker overview: version, cluster name, message rates, queue totals, node counts. Live Management API read.",
      inputSchema: { serverId: z.string().min(1) },
    },
    async ({ serverId }) => {
      const server = await verifyServerAccess(serverId, workspaceId);
      if (!server) {
        return toolError("Server not found.");
      }
      try {
        const client = createRabbitMQClientFromServer(server);
        const overview = await client.getOverview();
        return toolOk(overview);
      } catch (err) {
        logger.warn(
          { err, serverId, workspaceId },
          "mcp.get_overview.broker_unreachable"
        );
        return toolError(
          "Could not reach the broker. Check the server's connection state in Qarote."
        );
      }
    }
  );
}
