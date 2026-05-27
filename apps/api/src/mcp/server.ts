import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerReadTools } from "./tools";

import type { ApiKeyAuth } from "@/auth/resolve-api-key";

/**
 * Builds a fresh MCP server for one request (the route uses a stateless
 * transport — our tools are read-only and hold no session state). The
 * resolved API-key `auth` carries the workspace scope the tools operate in.
 *
 * The DB-backed diagnosis tools (list_incidents, get_incident,
 * list_config_findings) are registered via registerReadTools. The live-broker
 * tools (list_queues, get_overview) are a follow-up.
 */
export function buildMcpServer(auth: ApiKeyAuth): McpServer {
  const server = new McpServer({
    name: "qarote",
    version: "1.0.0",
  });

  server.registerTool(
    "ping",
    {
      title: "Ping",
      description:
        "Liveness check — confirms the API key resolved to a workspace.",
    },
    async () => ({
      content: [
        { type: "text", text: `ok (workspace ${auth.scope.workspaceId})` },
      ],
    })
  );

  registerReadTools(server, auth);

  return server;
}
