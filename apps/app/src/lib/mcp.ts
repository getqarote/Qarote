import { getApiUrl } from "@/lib/runtimeConfig";

/** HTTP header that carries the agent key on MCP requests. */
export const MCP_AUTH_HEADER = "x-api-key";

/**
 * The MCP endpoint agents connect to — the API origin + `/api/mcp` (the route
 * is mounted there in `apps/api/src/server.ts`). Resolves from the same
 * runtime-config chain as the rest of the app (build-time `VITE_API_URL` →
 * `window.__QAROTE_CONFIG__`), falling back to the SPA's own origin for
 * single-origin self-hosted deploys — so self-hosters get their own host, not
 * `app.qarote.io`.
 */
export function getMcpEndpoint(): string {
  const base = getApiUrl() || window.location.origin;
  return `${base.replace(/\/+$/, "")}/api/mcp`;
}
