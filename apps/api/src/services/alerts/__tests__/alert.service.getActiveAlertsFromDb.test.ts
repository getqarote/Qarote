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
    alert: { findMany: vi.fn() },
  },
}));

// alertService imports createRabbitMQClient transitively — stub it out
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
  alert: { findMany: MockInstance };
};

function makeQueueAlertRow(
  vhost: string,
  queueName: string,
  overrides: Record<string, unknown> = {}
) {
  const fingerprint = `${SERVER_ID}-memory-queue-${vhost}-${queueName}`;
  return {
    id: `alert-${vhost}-${queueName}`,
    fingerprint,
    serverId: SERVER_ID,
    serverName: "Test Server",
    severity: "MEDIUM",
    category: "memory",
    title: "High Memory",
    description: "Memory issue",
    details: {},
    sourceType: "queue",
    sourceName: queueName,
    lastSeenAt: new Date("2026-01-01T00:00:00Z"),
    firstSeenAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeNodeAlertRow(
  nodeName: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: `alert-node-${nodeName}`,
    fingerprint: `${SERVER_ID}-memory-node-${nodeName}`,
    serverId: SERVER_ID,
    serverName: "Test Server",
    severity: "MEDIUM",
    category: "memory",
    title: "High Memory",
    description: "Memory issue",
    details: {},
    sourceType: "node",
    sourceName: nodeName,
    lastSeenAt: new Date("2026-01-01T00:00:00Z"),
    firstSeenAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeClusterAlertRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert-cluster",
    fingerprint: `${SERVER_ID}-connection-cluster-cluster`,
    serverId: SERVER_ID,
    serverName: "Test Server",
    severity: "CRITICAL",
    category: "connection",
    title: "Connection Issue",
    description: "Connection problem",
    details: {},
    sourceType: "cluster",
    sourceName: "cluster",
    lastSeenAt: new Date("2026-01-01T00:00:00Z"),
    firstSeenAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AlertService.getActiveAlertsFromDb", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // No vhost filter — pass-through
  // -------------------------------------------------------------------------

  describe("no vhost filter", () => {
    it("returns all active alerts when no vhost is specified", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("prod", "orders"),
        makeQueueAlertRow("prod-v2", "orders"),
        makeNodeAlertRow("rabbit@node1"),
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID
      );

      expect(result.alerts).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Vhost boundary filtering (the core safety guarantee)
  // -------------------------------------------------------------------------

  describe("vhost boundary filtering", () => {
    it("returns only queue alerts for the exact matching vhost", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("prod", "orders"),
        makeQueueAlertRow("prod-v2", "orders"),
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID,
        "prod"
      );

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].source.name).toBe("orders");
    });

    it("does not match vhost 'prod' against a queue in vhost 'prod-v2'", async () => {
      // Regression test: a DB `contains` query for "-queue-prod-" would
      // incorrectly match "server-1-memory-queue-prod-v2-orders" because
      // the string "-queue-prod-v2-" starts with "-queue-prod-".
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("prod-v2", "orders"),
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID,
        "prod"
      );

      expect(result.alerts).toHaveLength(0);
    });

    it("does not match vhost 'foo' against a queue in vhost 'foo-bar'", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("foo-bar", "myqueue"),
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID,
        "foo"
      );

      expect(result.alerts).toHaveLength(0);
    });

    it("handles queue names containing hyphens correctly", async () => {
      // sourceName "my-orders" should not confuse the boundary check
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("prod", "my-orders"),
        makeQueueAlertRow("prod-v2", "my-orders"),
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID,
        "prod"
      );

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].source.name).toBe("my-orders");
    });

    it("always includes node alerts regardless of vhost filter", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("staging", "orders"),
        makeNodeAlertRow("rabbit@node1"),
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID,
        "prod"
      );

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].source.type).toBe("node");
    });

    it("always includes cluster alerts regardless of vhost filter", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("staging", "orders"),
        makeClusterAlertRow(),
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID,
        "prod"
      );

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].source.type).toBe("cluster");
    });

    it("returns matching-vhost queue alerts together with node alerts", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("prod", "orders"), // matches
        makeQueueAlertRow("staging", "orders"), // filtered out
        makeNodeAlertRow("rabbit@node1"), // always included
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID,
        "prod"
      );

      expect(result.alerts).toHaveLength(2);
      const types = result.alerts.map((a) => a.source.type);
      expect(types).toContain("queue");
      expect(types).toContain("node");
    });
  });

  // -------------------------------------------------------------------------
  // Summary recomputed after filtering
  // -------------------------------------------------------------------------

  describe("summary after filtering", () => {
    it("summary counts only reflect alerts that passed the vhost filter", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("prod", "orders", { severity: "CRITICAL" }),
        makeQueueAlertRow("staging", "orders", { severity: "CRITICAL" }), // filtered
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID,
        "prod"
      );

      expect(result.summary.total).toBe(1);
      expect(result.summary.critical).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Internal fields not exposed
  // -------------------------------------------------------------------------

  describe("response shape", () => {
    it("does not expose fingerprint in the returned alert objects", async () => {
      mockPrisma.alert.findMany.mockResolvedValue([
        makeQueueAlertRow("prod", "orders"),
      ]);

      const result = await alertService.getActiveAlertsFromDb(
        SERVER_ID,
        WORKSPACE_ID
      );

      expect(Object.keys(result.alerts[0])).not.toContain("fingerprint");
    });
  });
});
