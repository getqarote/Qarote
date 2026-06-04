/**
 * Contract tests for the live-broker MCP read tools. The mocks here pin
 * the only invariants the agent depends on:
 *
 * - workspace scoping: cross-workspace serverIds surface as a structured
 *   not-found error, not a broker call;
 * - credential safety: the `list_servers` projection never returns
 *   username/password (the test asserts the prisma `select` shape);
 * - graceful broker failure: a thrown client error becomes a typed
 *   "broker unreachable" tool error, not a transport-level crash.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRabbitMQServerFindMany,
  mockVerifyServerAccess,
  mockCreateRabbitMQClientFromServer,
  mockGetQueues,
  mockGetOverview,
} = vi.hoisted(() => ({
  mockRabbitMQServerFindMany: vi.fn(),
  mockVerifyServerAccess: vi.fn(),
  mockCreateRabbitMQClientFromServer: vi.fn(),
  mockGetQueues: vi.fn(),
  mockGetOverview: vi.fn(),
}));

vi.mock("@/core/prisma", () => ({
  prisma: {
    rabbitMQServer: { findMany: mockRabbitMQServerFindMany },
    // The diagnosis read tools (registerReadTools) co-mount in the same
    // server build; mock minimally so their imports don't crash.
    incidentDiagnosisRecord: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    configFinding: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/trpc/routers/rabbitmq/shared", () => ({
  verifyServerAccess: mockVerifyServerAccess,
  createRabbitMQClientFromServer: mockCreateRabbitMQClientFromServer,
}));

vi.mock("@/services/feature-gate/license", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(false),
}));

// We test against the broker tools in isolation (not the whole buildMcpServer)
// to keep the mock surface tight and avoid pulling the full feature-gate
// stack into a contract test.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ApiKeyAuth } from "@/auth/resolve-api-key";
import { registerBrokerReadTools } from "@/mcp/broker-tools";

const AUTH: ApiKeyAuth = {
  userId: "u_1",
  scope: { workspaceId: "ws_1", mode: "read", v: 1 },
  apiKeyId: "k_1",
};

async function connect(): Promise<Client> {
  const server = new McpServer({ name: "qarote-test", version: "1.0.0" });
  registerBrokerReadTools(server, AUTH);
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

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateRabbitMQClientFromServer.mockReturnValue({
    getQueues: mockGetQueues,
    getOverview: mockGetOverview,
  });
});

describe("list_servers", () => {
  it("returns workspace-scoped servers without credentials", async () => {
    mockRabbitMQServerFindMany.mockResolvedValue([
      {
        id: "s_1",
        name: "prod",
        host: "rabbit.prod",
        port: 15672,
        vhost: "/",
        version: "3.13",
        environment: "prod",
      },
    ]);
    const client = await connect();

    const result = await client.callTool({
      name: "list_servers",
      arguments: {},
    });

    // Scoping pinned at the Prisma layer.
    expect(mockRabbitMQServerFindMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws_1" },
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
    // Credential-safety pinned at the assertion layer too: select shape
    // must never include username/password (a future drift would surface
    // here, not in prod).
    const selectKeys = Object.keys(
      mockRabbitMQServerFindMany.mock.calls[0][0].select
    );
    expect(selectKeys).not.toContain("username");
    expect(selectKeys).not.toContain("password");

    const payload = JSON.parse(firstText(result)) as Array<{ name: string }>;
    expect(payload).toHaveLength(1);
    expect(payload[0].name).toBe("prod");
  });
});

describe("list_queues", () => {
  it("returns the broker's queue list when the server belongs to the workspace", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      id: "s_1",
      name: "prod",
      workspaceId: "ws_1",
    });
    mockGetQueues.mockResolvedValue([
      { name: "payments.process", vhost: "/", messages: 42, consumers: 2 },
    ]);
    const client = await connect();

    const result = await client.callTool({
      name: "list_queues",
      arguments: { serverId: "s_1" },
    });

    expect(mockVerifyServerAccess).toHaveBeenCalledWith("s_1", "ws_1");
    expect(mockGetQueues).toHaveBeenCalledWith(undefined);
    expect(JSON.parse(firstText(result))).toEqual([
      { name: "payments.process", vhost: "/", messages: 42, consumers: 2 },
    ]);
  });

  it("returns a structured not-found error for a cross-workspace serverId", async () => {
    // verifyServerAccess returns null for a serverId outside the workspace.
    mockVerifyServerAccess.mockResolvedValue(null);
    const client = await connect();

    const result = await client.callTool({
      name: "list_queues",
      arguments: { serverId: "s_other" },
    });

    expect(result.isError).toBe(true);
    expect(firstText(result)).toMatch(/server not found/i);
    // Critical: a cross-workspace lookup MUST NOT open a broker client.
    expect(mockCreateRabbitMQClientFromServer).not.toHaveBeenCalled();
    expect(mockGetQueues).not.toHaveBeenCalled();
  });

  it("maps a broker-side throw to a typed 'unreachable' tool error", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      id: "s_1",
      name: "prod",
      workspaceId: "ws_1",
    });
    mockGetQueues.mockRejectedValue(new Error("ECONNREFUSED"));
    const client = await connect();

    const result = await client.callTool({
      name: "list_queues",
      arguments: { serverId: "s_1" },
    });

    expect(result.isError).toBe(true);
    expect(firstText(result)).toMatch(/could not reach the broker/i);
  });

  it("forwards an explicit vhost to the broker client", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      id: "s_1",
      name: "prod",
      workspaceId: "ws_1",
    });
    mockGetQueues.mockResolvedValue([
      { name: "billing.events", vhost: "/my-vhost", messages: 7, consumers: 1 },
    ]);
    const client = await connect();

    const result = await client.callTool({
      name: "list_queues",
      arguments: { serverId: "s_1", vhost: "/my-vhost" },
    });

    expect(mockVerifyServerAccess).toHaveBeenCalledWith("s_1", "ws_1");
    expect(mockGetQueues).toHaveBeenCalledWith("/my-vhost");
    expect(JSON.parse(firstText(result))).toEqual([
      { name: "billing.events", vhost: "/my-vhost", messages: 7, consumers: 1 },
    ]);
  });
});

describe("get_overview", () => {
  it("returns the broker overview when the server belongs to the workspace", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      id: "s_1",
      name: "prod",
      workspaceId: "ws_1",
    });
    mockGetOverview.mockResolvedValue({
      rabbitmq_version: "3.13.0",
      cluster_name: "prod-cluster",
      queue_totals: { messages: 42 },
    });
    const client = await connect();

    const result = await client.callTool({
      name: "get_overview",
      arguments: { serverId: "s_1" },
    });

    expect(JSON.parse(firstText(result))).toEqual(
      expect.objectContaining({
        rabbitmq_version: "3.13.0",
        cluster_name: "prod-cluster",
      })
    );
  });

  it("returns a structured not-found error for a cross-workspace serverId", async () => {
    mockVerifyServerAccess.mockResolvedValue(null);
    const client = await connect();

    const result = await client.callTool({
      name: "get_overview",
      arguments: { serverId: "s_other" },
    });

    expect(result.isError).toBe(true);
    expect(firstText(result)).toMatch(/server not found/i);
    expect(mockGetOverview).not.toHaveBeenCalled();
  });

  it("maps a broker-side throw to a typed 'unreachable' tool error", async () => {
    mockVerifyServerAccess.mockResolvedValue({
      id: "s_1",
      name: "prod",
      workspaceId: "ws_1",
    });
    mockGetOverview.mockRejectedValue(new Error("ETIMEDOUT"));
    const client = await connect();

    const result = await client.callTool({
      name: "get_overview",
      arguments: { serverId: "s_1" },
    });

    expect(result.isError).toBe(true);
    expect(firstText(result)).toMatch(/could not reach the broker/i);
    expect(mockGetOverview).toHaveBeenCalled();
  });
});
