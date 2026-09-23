/**
 * CE side of the explain_finding split. With no EE bootstrap loaded, the tool
 * must be absent even for an explain-scoped key on a licensed instance — the
 * public mirror ships without src/ee/, so this is the only state CE ever sees.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/prisma", () => ({ prisma: {} }));

vi.mock("@/services/feature-gate/license", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

import type { ApiKeyAuth } from "@/auth/resolve-api-key";
import { getExplainFindingImpl } from "@/mcp/explain-finding.registry";
import { buildMcpServer } from "@/mcp/server";

const EXPLAIN_AUTH: ApiKeyAuth = {
  userId: "u_1",
  scope: { workspaceId: "ws_1", mode: "explain", v: 1 },
  apiKeyId: "k_1",
};

describe("explain_finding without EE", () => {
  it("has no registration in CE", () => {
    expect(getExplainFindingImpl()).toBeNull();
  });

  it("is absent from tools/list even when every gate would pass", async () => {
    const server = await buildMcpServer(EXPLAIN_AUTH);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).not.toContain("explain_finding");
  });
});
