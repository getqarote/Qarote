import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerBrokerReadTools } from "./broker-tools";
import { registerReadTools } from "./tools";

import type { ApiKeyAuth } from "@/auth/resolve-api-key";

/**
 * Builds a fresh MCP server for one request (the route uses a stateless
 * transport — our tools are read-only and hold no session state). The
 * resolved API-key `auth` carries the workspace scope the tools operate in.
 *
 * Diagnosis read tools (list_incidents, get_incident, list_config_findings)
 * and live-broker read tools (list_servers, list_queues, get_overview) are
 * always registered — they're the CE surface. `explain_incident` (EE) is
 * registered ONLY when the workspace has the AI_EXPLAIN_INLINE gate on AND
 * the api key was minted with `scope.mode === "explain"`. That keeps the
 * tool out of `tools/list` for CE workspaces and read-scoped keys, so the
 * agent's introspection reflects exactly what it can actually invoke.
 */
export async function buildMcpServer(auth: ApiKeyAuth): Promise<McpServer> {
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
  registerBrokerReadTools(server, auth);

  return server;
}
