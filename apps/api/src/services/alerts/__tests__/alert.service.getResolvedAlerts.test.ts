import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/core/logger", () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/core/prisma", () => ({
  prisma: {
    alert: { findMany: vi.fn(), count: vi.fn() },
  },
}));

// alertService also imports createRabbitMQClient transitively — stub it out
vi.mock("@/trpc/routers/rabbitmq/shared", () => ({
  createRabbitMQClient: vi.fn(),
}));

vi.mock("@/services/alerts/alert.analyzer", () => ({
  analyzeNodeHealth: vi.fn(() => []),
  analyzeQueueHealth: vi.fn(() => []),
}));

vi.mock("@/services/alerts/alert.notification", () => ({
  alertNotificationService: { trackAndNotifyNewAlerts: vi.fn() },
}));

vi.mock("@/services/alerts/alert.thresholds", () => ({
  alertThresholdsService: { getWorkspaceThresholds: vi.fn() },
}));

vi.mock("@/services/alerts/alert.health", () => ({
  alertHealthService: {
    getClusterHealthSummary: vi.fn(),
    getHealthCheck: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { prisma } from "@/core/prisma";

import { alertService } from "../alert.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SERVER_ID = "server-1";
const WORKSPACE_ID = "ws-1";

const mockPrisma = prisma as unknown as {
  alert: { findMany: MockInstance; count: MockInstance };
};

/**
 * Build a resolved Alert row as the DB would return it.
 * severity uses the Prisma AlertSeverity enum values (CRITICAL, MEDIUM, INFO).
 */
function makeResolvedAlert(
  id: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    serverId: SERVER_ID,
    serverName: "Test Server",
    severity: "MEDIUM",
    category: "memory",
    title: "High Memory Usage",
    description: "Memory issue on node rabbit@node1",
    details: {
      sourceType: "node",
      sourceName: "rabbit@node1",
      category: "memory",
    },
    sourceType: "node",
    sourceName: "rabbit@node1",
    firstSeenAt: new Date("2026-01-01T00:00:00Z"),
    resolvedAt: new Date("2026-01-01T01:00:00Z"),
    duration: 3_600_000,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AlertService.getResolvedAlerts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns resolved alerts from the unified Alert table", async () => {
    const id = "ra-1";
    mockPrisma.alert.findMany.mockResolvedValue([makeResolvedAlert(id)]);
    mockPrisma.alert.count.mockResolvedValue(1);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.alerts[0].source.type).toBe("node");
  });

  it("returns empty list when the Alert table has no resolved rows", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([]);
    mockPrisma.alert.count.mockResolvedValue(0);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("returns all resolved alerts when multiple rows exist", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([
      makeResolvedAlert("ra-1"),
      makeResolvedAlert("ra-2"),
    ]);
    mockPrisma.alert.count.mockResolvedValue(2);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("total comes from count query, not the length of the current page", async () => {
    // Simulates a paginated response: page returns 2 items but total is 50
    mockPrisma.alert.findMany.mockResolvedValue([
      makeResolvedAlert("ra-1"),
      makeResolvedAlert("ra-2"),
    ]);
    mockPrisma.alert.count.mockResolvedValue(50);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(2);
    expect(result.total).toBe(50); // reflects count, not current page length
  });

  it("maps resolved alert fields correctly", async () => {
    const id = "ra-memory-1";
    mockPrisma.alert.findMany.mockResolvedValue([makeResolvedAlert(id)]);
    mockPrisma.alert.count.mockResolvedValue(1);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );
    const alert = result.alerts[0];

    expect(alert.id).toBe(id);
    expect(alert.serverId).toBe(SERVER_ID);
    expect(alert.serverName).toBe("Test Server");
    expect(alert.severity).toBe("MEDIUM");
    expect(alert.category).toBe("memory");
    expect(alert.source).toEqual({ type: "node", name: "rabbit@node1" });
    expect(alert.firstSeenAt).toBe("2026-01-01T00:00:00.000Z");
    expect(alert.resolvedAt).toBe("2026-01-01T01:00:00.000Z");
    expect(alert.duration).toBe(3_600_000);
    // fingerprint is internal — should NOT be exposed on the response shape
    expect(Object.keys(alert)).not.toContain("fingerprint");
  });

  it("maps CRITICAL severity correctly", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([
      makeResolvedAlert("ra-1", { severity: "CRITICAL" }),
    ]);
    mockPrisma.alert.count.mockResolvedValue(1);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts[0].severity).toBe("CRITICAL");
  });

  it("maps INFO severity correctly", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([
      makeResolvedAlert("ra-1", { severity: "INFO" }),
    ]);
    mockPrisma.alert.count.mockResolvedValue(1);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts[0].severity).toBe("INFO");
  });

  it("queries the Alert table with status=RESOLVED and resolvedAt IS NOT NULL", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([]);
    mockPrisma.alert.count.mockResolvedValue(0);

    await alertService.getResolvedAlerts(SERVER_ID, WORKSPACE_ID);

    expect(mockPrisma.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serverId: SERVER_ID,
          workspaceId: WORKSPACE_ID,
          status: "RESOLVED",
          resolvedAt: { not: null },
        }),
      })
    );
  });

  it("applies severity filter when option is provided", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([]);
    mockPrisma.alert.count.mockResolvedValue(0);

    await alertService.getResolvedAlerts(SERVER_ID, WORKSPACE_ID, {
      severity: "MEDIUM",
    });

    expect(mockPrisma.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          severity: "MEDIUM",
        }),
      })
    );
  });

  it("applies category filter when option is provided", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([]);
    mockPrisma.alert.count.mockResolvedValue(0);

    await alertService.getResolvedAlerts(SERVER_ID, WORKSPACE_ID, {
      category: "memory",
    });

    expect(mockPrisma.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "memory",
        }),
      })
    );
  });

  it("passes pagination options (limit and offset) to the query", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([]);
    mockPrisma.alert.count.mockResolvedValue(0);

    await alertService.getResolvedAlerts(SERVER_ID, WORKSPACE_ID, {
      limit: 10,
      offset: 20,
    });

    expect(mockPrisma.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      })
    );
  });
});
