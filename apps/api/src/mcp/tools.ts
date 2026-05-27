import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import { prisma } from "@/core/prisma";

import type { ApiKeyAuth } from "@/auth/resolve-api-key";
import { AlertSeverity, type Prisma } from "@/generated/prisma/client";

const MAX_ROWS = 100;

const INCIDENT_SELECT = {
  id: true,
  serverId: true,
  ruleId: true,
  severity: true,
  scope: true,
  queueName: true,
  vhost: true,
  description: true,
  recommendation: true,
  supersededBy: true,
  firstSeenAt: true,
  lastSeenAt: true,
  resolvedAt: true,
} satisfies Prisma.IncidentDiagnosisRecordSelect;

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Registers the read-only diagnosis tools, scoped to the API key's workspace.
 * Workspace membership is already verified by `resolveApiKeyAuth`, so these
 * queries only filter by `workspaceId` — they never trust a client-supplied
 * workspace.
 */
export function registerReadTools(server: McpServer, auth: ApiKeyAuth): void {
  const workspaceId = auth.scope.workspaceId;

  server.registerTool(
    "list_incidents",
    {
      title: "List incidents",
      description:
        "List diagnosed RabbitMQ incidents for the workspace — rule, severity, queue/vhost, description and recommendation. Optionally filter by server, severity, or unresolved-only.",
      inputSchema: {
        serverId: z.string().optional(),
        severity: z.enum(AlertSeverity).optional(),
        unresolvedOnly: z.boolean().optional(),
      },
    },
    async ({ serverId, severity, unresolvedOnly }) => {
      const rows = await prisma.incidentDiagnosisRecord.findMany({
        where: {
          workspaceId,
          ...(serverId ? { serverId } : {}),
          ...(severity ? { severity } : {}),
          ...(unresolvedOnly ? { resolvedAt: null } : {}),
        },
        select: INCIDENT_SELECT,
        orderBy: { lastSeenAt: "desc" },
        take: MAX_ROWS,
      });
      return jsonResult(rows);
    }
  );

  server.registerTool(
    "get_incident",
    {
      title: "Get incident",
      description:
        "Fetch a single incident diagnosis by id. Scoped to the workspace — ids from other workspaces return not-found.",
      inputSchema: { incidentId: z.string().min(1) },
    },
    async ({ incidentId }) => {
      const row = await prisma.incidentDiagnosisRecord.findFirst({
        where: { id: incidentId, workspaceId },
        select: INCIDENT_SELECT,
      });
      if (!row) {
        return {
          content: [{ type: "text" as const, text: "Incident not found." }],
          isError: true,
        };
      }
      return jsonResult(row);
    }
  );

  server.registerTool(
    "list_config_findings",
    {
      title: "List config findings",
      description:
        "List configuration-scan findings for the workspace — static anti-patterns such as a missing dead-letter exchange or an orphan exchange.",
      inputSchema: {
        serverId: z.string().optional(),
        unresolvedOnly: z.boolean().optional(),
      },
    },
    async ({ serverId, unresolvedOnly }) => {
      const rows = await prisma.configFinding.findMany({
        where: {
          workspaceId,
          ...(serverId ? { serverId } : {}),
          ...(unresolvedOnly ? { resolvedAt: null } : {}),
        },
        select: {
          id: true,
          serverId: true,
          ruleKey: true,
          severity: true,
          resourceType: true,
          resourceName: true,
          vhost: true,
          detectedAt: true,
          lastSeenAt: true,
          resolvedAt: true,
        },
        orderBy: { lastSeenAt: "desc" },
        take: MAX_ROWS,
      });
      return jsonResult(rows);
    }
  );
}
