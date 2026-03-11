import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/core/prisma", () => ({
  prisma: {
    seenAlert: { findMany: vi.fn() },
    resolvedAlert: { findMany: vi.fn(), count: vi.fn() },
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
  resolvedAlert: { findMany: MockInstance; count: MockInstance };
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
    mockPrisma.resolvedAlert.count.mockResolvedValue(1);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.alerts[0].source.type).toBe("node");
  });

  it("passes active fingerprints as notIn to the resolvedAlert query", async () => {
    const activeFp = `${SERVER_ID}-memory-node-rabbit@node1`;
    const resolvedFp = `${SERVER_ID}-disk-node-rabbit@node1`;

    mockPrisma.seenAlert.findMany.mockResolvedValue([
      { fingerprint: activeFp },
    ]);
    // DB has already excluded the activeFp record via the notIn clause
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([
      makeResolvedAlert(resolvedFp),
    ]);
    mockPrisma.resolvedAlert.count.mockResolvedValue(1);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.alerts[0].id).toBe(`ra-${resolvedFp}`);

    // The DB query must include the notIn exclusion
    expect(mockPrisma.resolvedAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fingerprint: { notIn: [activeFp] },
        }),
      })
    );
  });

  it("does not add fingerprint notIn clause when there are no active alerts", async () => {
    mockPrisma.seenAlert.findMany.mockResolvedValue([]);
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([
      makeResolvedAlert(`${SERVER_ID}-memory-node-rabbit@node1`),
    ]);
    mockPrisma.resolvedAlert.count.mockResolvedValue(1);

    await alertService.getResolvedAlerts(SERVER_ID, WORKSPACE_ID);

    expect(mockPrisma.resolvedAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ fingerprint: expect.anything() }),
      })
    );
  });

  it("returns empty list when all resolved alert fingerprints are currently active", async () => {
    const fp1 = `${SERVER_ID}-memory-node-rabbit@node1`;
    const fp2 = `${SERVER_ID}-disk-node-rabbit@node1`;

    mockPrisma.seenAlert.findMany.mockResolvedValue([
      { fingerprint: fp1 },
      { fingerprint: fp2 },
    ]);
    // DB returns nothing because all fingerprints are excluded via notIn
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([]);
    mockPrisma.resolvedAlert.count.mockResolvedValue(0);

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
    mockPrisma.resolvedAlert.count.mockResolvedValue(2);

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
    mockPrisma.resolvedAlert.count.mockResolvedValue(0);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("total comes from count query, not the length of the current page", async () => {
    // Simulates a paginated response: page returns 2 items but total is 50
    mockPrisma.seenAlert.findMany.mockResolvedValue([]);
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([
      makeResolvedAlert(`${SERVER_ID}-memory-node-rabbit@node1`),
      makeResolvedAlert(`${SERVER_ID}-disk-node-rabbit@node1`),
    ]);
    mockPrisma.resolvedAlert.count.mockResolvedValue(50);

    const result = await alertService.getResolvedAlerts(
      SERVER_ID,
      WORKSPACE_ID
    );

    expect(result.alerts).toHaveLength(2);
    expect(result.total).toBe(50); // reflects count, not current page length
  });

  it("maps resolved alert fields correctly", async () => {
    const fp = `${SERVER_ID}-memory-node-rabbit@node1`;
    mockPrisma.seenAlert.findMany.mockResolvedValue([]);
    mockPrisma.resolvedAlert.findMany.mockResolvedValue([
      makeResolvedAlert(fp),
    ]);
    mockPrisma.resolvedAlert.count.mockResolvedValue(1);

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
    mockPrisma.resolvedAlert.count.mockResolvedValue(0);

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

      // SeenAlert shows alert is currently active → notIn clause excludes it from DB query
      mockPrisma.seenAlert.findMany.mockResolvedValue([{ fingerprint: fp }]);
      mockPrisma.resolvedAlert.findMany.mockResolvedValue([]); // excluded by DB notIn
      mockPrisma.resolvedAlert.count.mockResolvedValue(0);

      const result = await alertService.getResolvedAlerts(
        SERVER_ID,
        WORKSPACE_ID
      );

      // The historical record must not appear because the alert is active again
      expect(result.alerts).toHaveLength(0);
      expect(result.total).toBe(0);

      // Verify the exclusion is enforced at the DB level
      expect(mockPrisma.resolvedAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fingerprint: { notIn: [fp] },
          }),
        })
      );
    });

    it("alert that has truly resolved (not active) appears in resolved list", async () => {
      const fp = `${SERVER_ID}-memory-node-rabbit@node1`;

      // No active SeenAlert for this fingerprint → no notIn clause added
      mockPrisma.seenAlert.findMany.mockResolvedValue([]);
      mockPrisma.resolvedAlert.findMany.mockResolvedValue([
        makeResolvedAlert(fp),
      ]);
      mockPrisma.resolvedAlert.count.mockResolvedValue(1);

      const result = await alertService.getResolvedAlerts(
        SERVER_ID,
        WORKSPACE_ID
      );

      expect(result.alerts).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
