import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/core/prisma", () => ({
  prisma: {
    seenAlert: { findMany: vi.fn() },
    resolvedAlert: { findMany: vi.fn() },
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
  seenAlert: { findMany: MockInstance };
  resolvedAlert: { findMany: MockInstance };
};

function makeResolvedAlert(
  fingerprint: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: `ra-${fingerprint}`,
    serverId: SERVER_ID,
    serverName: "Test Server",
    severity: "warning",
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
    fingerprint,
    firstSeenAt: new Date("2026-01-01T00:00:00Z"),
    resolvedAt: new Date("2026-01-01T01:00:00Z"),
    duration: 3_600_000,
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

  it("returns resolved alerts that are not currently active", async () => {
    const fp = `${SERVER_ID}-memory-node-rabbit@node1`;

    mockPrisma.seenAlert.findMany.mockResolvedValue([]); // nothing active
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([
      makeResolvedAlert(fp),
    ]);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.alerts[0].source.type).toBe("node");
  });

  it("excludes resolved alert records whose fingerprint is currently active", async () => {
    const activeFp = `${SERVER_ID}-memory-node-rabbit@node1`;
    const resolvedFp = `${SERVER_ID}-disk-node-rabbit@node1`;

    // activeFp has resolvedAt: null in SeenAlert → currently active
    mockPrisma.seenAlert.findMany.mockResolvedValue([
      { fingerprint: activeFp },
    ]);
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([
      makeResolvedAlert(activeFp), // should be excluded
      makeResolvedAlert(resolvedFp), // should be included
    ]);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.alerts[0].id).toBe(`ra-${resolvedFp}`);
  });

  it("returns empty list when all resolved alert fingerprints are currently active", async () => {
    const fp1 = `${SERVER_ID}-memory-node-rabbit@node1`;
    const fp2 = `${SERVER_ID}-disk-node-rabbit@node1`;

    mockPrisma.seenAlert.findMany.mockResolvedValue([
      { fingerprint: fp1 },
      { fingerprint: fp2 },
    ]);
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([
      makeResolvedAlert(fp1),
      makeResolvedAlert(fp2),
    ]);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("returns all resolved alerts when there are no active alerts", async () => {
    mockPrisma.seenAlert.findMany.mockResolvedValue([]);
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([
      makeResolvedAlert(`${SERVER_ID}-memory-node-rabbit@node1`),
      makeResolvedAlert(`${SERVER_ID}-disk-node-rabbit@node1`),
    ]);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("returns empty list when both resolved and active alert tables are empty", async () => {
    mockPrisma.seenAlert.findMany.mockResolvedValue([]);
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([]);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("maps resolved alert fields correctly", async () => {
    const fp = `${SERVER_ID}-memory-node-rabbit@node1`;
    mockPrisma.seenAlert.findMany.mockResolvedValue([]);
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([
      makeResolvedAlert(fp),
    ]);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );
    const alert = result.alerts[0];

    expect(alert.id).toBe(`ra-${fp}`);
    expect(alert.serverId).toBe(SERVER_ID);
    expect(alert.serverName).toBe("Test Server");
    expect(alert.severity).toBe("warning");
    expect(alert.category).toBe("memory");
    expect(alert.source).toEqual({ type: "node", name: "rabbit@node1" });
    expect(alert.firstSeenAt).toBe("2026-01-01T00:00:00.000Z");
    expect(alert.resolvedAt).toBe("2026-01-01T01:00:00.000Z");
    expect(alert.duration).toBe(3_600_000);
    // fingerprint is internal — should NOT be exposed on the response shape
    expect(Object.keys(alert)).not.toContain("fingerprint");
  });

  it("queries SeenAlert with resolvedAt: null to identify active fingerprints", async () => {
    mockPrisma.seenAlert.findMany.mockResolvedValue([]);
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([]);

    await alertService.getResolvedAlerts(SERVER_ID, WORKSPACE_ID);

    expect(mockPrisma.seenAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serverId: SERVER_ID,
          workspaceId: WORKSPACE_ID,
          resolvedAt: null,
        }),
      })
    );
  });

  describe("a recurring alert is not simultaneously in both lists", () => {
    it("alert that recurred (came back) is excluded from resolved list", async () => {
      // Scenario: alert fired, was resolved (ResolvedAlert created), then came back
      // → SeenAlert.resolvedAt is now null again (active)
      // → The old ResolvedAlert record is still in the DB
      const fp = `${SERVER_ID}-memory-node-rabbit@node1`;

      // SeenAlert shows alert is currently active
      mockPrisma.seenAlert.findMany.mockResolvedValue([{ fingerprint: fp }]);
      // ResolvedAlert has a historical record from the previous occurrence
      mockPrisma.resolvedAlert.findMany.mockResolvedValue([
        makeResolvedAlert(fp),
      ]);

      const result = await alertService.getResolvedAlerts(
        SERVER_ID,
        WORKSPACE_ID
      );

      // The historical record must not appear because the alert is active again
      expect(result.alerts).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("alert that has truly resolved (not active) appears in resolved list", async () => {
      const fp = `${SERVER_ID}-memory-node-rabbit@node1`;

      // No active SeenAlert for this fingerprint
      mockPrisma.seenAlert.findMany.mockResolvedValue([]);
      mockPrisma.resolvedAlert.findMany.mockResolvedValue([
        makeResolvedAlert(fp),
      ]);

      const result = await alertService.getResolvedAlerts(
        SERVER_ID,
        WORKSPACE_ID
      );

      expect(result.alerts).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
