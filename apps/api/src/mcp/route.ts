import type { HttpBindings } from "@hono/node-server";
import { RESPONSE_ALREADY_SENT } from "@hono/node-server/utils/response";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Hono } from "hono";

import { buildMcpServer } from "./server";

import { resolveApiKeyAuth } from "@/auth/resolve-api-key";

/**
 * Streamable-HTTP MCP endpoint, mounted in-process on the Qarote API.
 *
 * Authenticated by `x-api-key` (no cookie session): the key is verified and
 * resolved to a workspace scope before the transport is connected, and that
 * scope is handed to the tools. Stateless: a fresh server + transport per
 * request (read-only tools, no session state). The SDK transport writes
 * directly to the raw Node response, so we hand it `c.env.incoming` /
 * `c.env.outgoing` and return `RESPONSE_ALREADY_SENT`.
 */
export const mcpRouter = new Hono<{ Bindings: HttpBindings }>();

// POST only: a stateless server (`sessionIdGenerator: undefined`) has no
// server-initiated stream, so there is no GET/DELETE to handle.
mcpRouter.post("/", async (c) => {
  const key = c.req.header("x-api-key");
  if (!key) return c.json({ error: "Unauthorized" }, 401);

  const apiKeyAuth = await resolveApiKeyAuth(key);
  if (!apiKeyAuth) return c.json({ error: "Unauthorized" }, 401);

  const server = buildMcpServer(apiKeyAuth);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  try {
    await server.connect(transport);
    const body = await c.req.json().catch(() => undefined);
    await transport.handleRequest(c.env.incoming, c.env.outgoing, body);
  } finally {
    // The response is fully written by handleRequest; tear the per-request
    // server + transport down rather than leaning on GC.
    await server.close();
  }

  return RESPONSE_ALREADY_SENT;
});
