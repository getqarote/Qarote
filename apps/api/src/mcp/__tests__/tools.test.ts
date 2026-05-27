/**
 * Integration test for the MCP read tools: drives them end-to-end over an
 * in-memory client<->server transport, with Prisma mocked. Verifies the tools
 * are exposed, query scoped to the key's workspace, return the rows as JSON,
 * and surface not-found as a structured tool error.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockIncidentFindMany, mockIncidentFindFirst, mockConfigFindMany } =
  vi.hoisted(() => ({
    mockIncidentFindMany: vi.fn(),
    mockIncidentFindFirst: vi.fn(),
    mockConfigFindMany: vi.fn(),
  }));

vi.mock("@/core/prisma", () => ({
  prisma: {
    incidentDiagnosisRecord: {
      findMany: mockIncidentFindMany,
      findFirst: mockIncidentFindFirst,
    },
    configFinding: { findMany: mockConfigFindMany },
  },
}));

import { buildMcpServer } from "@/mcp/server";

const AUTH = {
  userId: "u_1",
  scope: { workspaceId: "ws_1", mode: "read" as const, v: 1 },
};

async function connectClient(): Promise<Client> {
  const server = buildMcpServer(AUTH);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
  return client;
}

function firstText(result: unknown): string {
  const { content } = result as {
    content: Array<{ type: string; text: string }>;
  };
  return content[0].text;
}

describe("MCP read tools", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes the expected tool set", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_incident",
      "list_config_findings",
      "list_incidents",
      "ping",
    ]);
  });

  it("list_incidents queries scoped to the key's workspace and returns rows", async () => {
    mockIncidentFindMany.mockResolvedValue([
      { id: "i1", ruleId: "QUEUE_BACKLOG", severity: "HIGH" },
    ]);
    const client = await connectClient();

    const result = await client.callTool({
      name: "list_incidents",
      arguments: {},
    });

    expect(mockIncidentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws_1" }),
      })
    );
    expect(JSON.parse(firstText(result))).toEqual([
      { id: "i1", ruleId: "QUEUE_BACKLOG", severity: "HIGH" },
    ]);
  });

  it("list_incidents folds the optional filters into the where clause", async () => {
    mockIncidentFindMany.mockResolvedValue([]);
    const client = await connectClient();

    await client.callTool({
      name: "list_incidents",
      arguments: { serverId: "s1", severity: "HIGH", unresolvedOnly: true },
    });

    expect(mockIncidentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: "ws_1",
          serverId: "s1",
          severity: "HIGH",
          resolvedAt: null,
        },
      })
    );
  });

  it("get_incident surfaces a not-found id as a structured error", async () => {
    mockIncidentFindFirst.mockResolvedValue(null);
    const client = await connectClient();

    const result = await client.callTool({
      name: "get_incident",
      arguments: { incidentId: "missing" },
    });

    expect(result.isError).toBe(true);
    // The lookup is workspace-scoped — never a bare id.
    expect(mockIncidentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "missing", workspaceId: "ws_1" },
      })
    );
  });

  it("list_config_findings queries scoped to the workspace", async () => {
    mockConfigFindMany.mockResolvedValue([]);
    const client = await connectClient();

    await client.callTool({ name: "list_config_findings", arguments: {} });

    expect(mockConfigFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws_1" }),
      })
    );
  });
});
