/**
 * CE-safe registry for the EE `explain_finding` MCP tool.
 *
 * CE default: nothing registered, so the tool never appears in `tools/list`.
 * EE: src/ee/bootstrap.ts injects the real registration at startup, keeping
 * every `@/ee/` import out of the CE tree.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ApiKeyAuth } from "@/auth/resolve-api-key";

type RegisterFn = (server: McpServer, auth: ApiKeyAuth) => void;

let _impl: RegisterFn | null = null;

export function registerExplainFindingImpl(fn: RegisterFn): void {
  _impl = fn;
}

/** Returns the EE registration, or null in CE. */
export function getExplainFindingImpl(): RegisterFn | null {
  return _impl;
}
