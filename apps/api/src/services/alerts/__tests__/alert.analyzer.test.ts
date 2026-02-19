import { describe, expect, it } from "vitest";

import type {
  RabbitMQNode,
  RabbitMQQueue,
} from "@/core/rabbitmq/rabbitmq.interfaces";

import { analyzeNodeHealth, analyzeQueueHealth } from "../alert.analyzer";
import {
  AlertCategory,
  AlertSeverity,
  AlertThresholds,
} from "../alert.interfaces";

// Default thresholds matching the service defaults
const DEFAULT_THRESHOLDS: AlertThresholds = {
  memory: { warning: 80, critical: 95 },
  disk: { warning: 15, critical: 10 },
  fileDescriptors: { warning: 80, critical: 90 },
  sockets: { warning: 80, critical: 90 },
  processes: { warning: 80, critical: 90 },
  queueMessages: { warning: 10_000, critical: 50_000 },
  unackedMessages: { warning: 1_000, critical: 5_000 },
  consumerUtilization: { warning: 10 },
  connections: { warning: 80, critical: 95 },
  runQueue: { warning: 10, critical: 20 },
};

function makeNode(overrides: Partial<RabbitMQNode> = {}): RabbitMQNode {
  return {
    name: "rabbit@node1",
    running: true,
    mem_alarm: false,
    disk_free_alarm: false,
    partitions: [],
    mem_used: 0,
    mem_limit: 1_000_000_000,
    disk_free: 500_000_000,
    disk_free_limit: 1_000_000_000,
    fd_used: 0,
    fd_total: 1024,
    sockets_used: 0,
    sockets_total: 1024,
    proc_used: 0,
    proc_total: 1_000_000,
    run_queue: 0,
    ...overrides,
  } as RabbitMQNode;
}

function makeQueue(overrides: Record<string, unknown> = {}): RabbitMQQueue {
  return {
    name: "test-queue",
    vhost: "/",
    messages: 0,
    messages_ready: 0,
    messages_unacknowledged: 0,
    consumers: 1,
    message_stats: undefined,
    idle_since: undefined,
    ...overrides,
  } as unknown as RabbitMQQueue;
}

const SERVER_ID = "server-1";
const SERVER_NAME = "Test Server";

describe("analyzeNodeHealth", () => {
  describe("node running status", () => {
    it("returns a CRITICAL NODE alert when node.running is false", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ running: false }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const nodeDownAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.NODE &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Node Down"
      );
      expect(nodeDownAlert).toBeDefined();
    });

    it("returns no running alert when node.running is true", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ running: true }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(alerts.find((a) => a.title === "Node Down")).toBeUndefined();
    });
  });

  describe("memory alarm", () => {
    it("returns a CRITICAL MEMORY alert when node.mem_alarm is true", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ mem_alarm: true }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alarm = alerts.find(
        (a) =>
          a.category === AlertCategory.MEMORY &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Memory Alarm Active"
      );
      expect(alarm).toBeDefined();
    });

    it("returns no memory alarm alert when node.mem_alarm is false", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ mem_alarm: false }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Memory Alarm Active")
      ).toBeUndefined();
    });
  });

  describe("disk alarm", () => {
    it("returns a CRITICAL DISK alert when node.disk_free_alarm is true", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ disk_free_alarm: true }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alarm = alerts.find(
        (a) =>
          a.category === AlertCategory.DISK &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Disk Space Alarm"
      );
      expect(alarm).toBeDefined();
    });
  });

  describe("network partitions", () => {
    it("returns a CRITICAL NODE alert when partitions array is non-empty", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ partitions: ["rabbit@node2"] }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const partitionAlert = alerts.find(
        (a) => a.title === "Network Partition Detected"
      );
      expect(partitionAlert).toBeDefined();
      expect(partitionAlert?.severity).toBe(AlertSeverity.CRITICAL);
    });

    it("includes partition names in affected array", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ partitions: ["rabbit@node2", "rabbit@node3"] }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const partitionAlert = alerts.find(
        (a) => a.title === "Network Partition Detected"
      );
      expect(partitionAlert?.details.affected).toContain("rabbit@node2");
      expect(partitionAlert?.details.affected).toContain("rabbit@node3");
    });

    it("returns no partition alert when partitions is empty", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ partitions: [] }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Network Partition Detected")
      ).toBeUndefined();
    });
  });

  describe("memory usage thresholds", () => {
    it("returns a CRITICAL MEMORY alert when usage is at critical threshold (95%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ mem_used: 950_000_000, mem_limit: 1_000_000_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const memAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.MEMORY &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Critical Memory Usage"
      );
      expect(memAlert).toBeDefined();
    });

    it("returns a WARNING MEMORY alert when usage is at warning threshold (81%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ mem_used: 810_000_000, mem_limit: 1_000_000_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const memAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.MEMORY &&
          a.severity === AlertSeverity.WARNING &&
          a.title === "High Memory Usage"
      );
      expect(memAlert).toBeDefined();
    });

    it("returns no memory usage alert when usage is below warning threshold (50%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ mem_used: 500_000_000, mem_limit: 1_000_000_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Critical Memory Usage")
      ).toBeUndefined();
      expect(
        alerts.find((a) => a.title === "High Memory Usage")
      ).toBeUndefined();
    });

    it("skips memory usage check when mem_limit is 0", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ mem_used: 999_999_999, mem_limit: 0 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Critical Memory Usage")
      ).toBeUndefined();
    });
  });

  describe("disk free thresholds", () => {
    // diskFreePercent = (disk_free / disk_free_limit) * 100
    it("returns a CRITICAL DISK alert when disk free is at critical threshold (9%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ disk_free: 9, disk_free_limit: 100 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const diskAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.DISK &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Critical Disk Space"
      );
      expect(diskAlert).toBeDefined();
    });

    it("returns a WARNING DISK alert when disk free is at warning threshold (12%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ disk_free: 12, disk_free_limit: 100 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const diskAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.DISK &&
          a.severity === AlertSeverity.WARNING &&
          a.title === "Low Disk Space"
      );
      expect(diskAlert).toBeDefined();
    });

    it("returns no disk alert when disk free is above warning threshold (20%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ disk_free: 20, disk_free_limit: 100 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Critical Disk Space")
      ).toBeUndefined();
      expect(alerts.find((a) => a.title === "Low Disk Space")).toBeUndefined();
    });

    it("skips disk check when disk_free_limit is 0", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ disk_free: 1, disk_free_limit: 0 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.category === AlertCategory.DISK)
      ).toBeUndefined();
    });
  });

  describe("file descriptor thresholds", () => {
    it("returns a CRITICAL CONNECTION alert when fd usage is at critical threshold (91%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ fd_used: 910, fd_total: 1000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const fdAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.CONNECTION &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Critical File Descriptor Usage"
      );
      expect(fdAlert).toBeDefined();
    });

    it("returns a WARNING CONNECTION alert when fd usage is at warning threshold (85%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ fd_used: 850, fd_total: 1000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const fdAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.CONNECTION &&
          a.severity === AlertSeverity.WARNING &&
          a.title === "High File Descriptor Usage"
      );
      expect(fdAlert).toBeDefined();
    });

    it("returns no fd alert when usage is below warning threshold (50%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ fd_used: 500, fd_total: 1000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Critical File Descriptor Usage")
      ).toBeUndefined();
      expect(
        alerts.find((a) => a.title === "High File Descriptor Usage")
      ).toBeUndefined();
    });
  });

  describe("socket usage thresholds", () => {
    it("returns a CRITICAL CONNECTION alert when socket usage is at critical threshold (91%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ sockets_used: 910, sockets_total: 1000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const sockAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.CONNECTION &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Critical Socket Usage"
      );
      expect(sockAlert).toBeDefined();
    });

    it("returns a WARNING CONNECTION alert when socket usage is at warning threshold (85%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ sockets_used: 850, sockets_total: 1000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const sockAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.CONNECTION &&
          a.severity === AlertSeverity.WARNING &&
          a.title === "High Socket Usage"
      );
      expect(sockAlert).toBeDefined();
    });
  });

  describe("process usage thresholds", () => {
    it("returns a CRITICAL PERFORMANCE alert when process usage is at critical threshold (91%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ proc_used: 910_000, proc_total: 1_000_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const procAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.PERFORMANCE &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Critical Process Usage"
      );
      expect(procAlert).toBeDefined();
    });

    it("returns a WARNING PERFORMANCE alert when process usage is at warning threshold (85%)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ proc_used: 850_000, proc_total: 1_000_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const procAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.PERFORMANCE &&
          a.severity === AlertSeverity.WARNING &&
          a.title === "High Process Usage"
      );
      expect(procAlert).toBeDefined();
    });
  });

  describe("run queue thresholds", () => {
    it("returns a CRITICAL PERFORMANCE alert when run_queue is at critical threshold (20)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ run_queue: 20 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const rqAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.PERFORMANCE &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Critical Run Queue Length"
      );
      expect(rqAlert).toBeDefined();
    });

    it("returns a WARNING PERFORMANCE alert when run_queue is at warning threshold (10)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ run_queue: 10 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const rqAlert = alerts.find(
        (a) =>
          a.category === AlertCategory.PERFORMANCE &&
          a.severity === AlertSeverity.WARNING &&
          a.title === "High Run Queue Length"
      );
      expect(rqAlert).toBeDefined();
    });

    it("returns no run_queue alert when run_queue is below warning threshold (5)", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ run_queue: 5 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Critical Run Queue Length")
      ).toBeUndefined();
      expect(
        alerts.find((a) => a.title === "High Run Queue Length")
      ).toBeUndefined();
    });

    it("returns no run_queue alert when run_queue is undefined", () => {
      const node = makeNode();
      // @ts-expect-error testing undefined
      node.run_queue = undefined;
      const alerts = analyzeNodeHealth(
        node,
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Critical Run Queue Length")
      ).toBeUndefined();
    });
  });

  describe("alert shape", () => {
    it("sets correct serverId and serverName on all alerts", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ running: false }),
        "my-server",
        "My Server",
        DEFAULT_THRESHOLDS
      );
      expect(alerts.length).toBeGreaterThan(0);
      for (const alert of alerts) {
        expect(alert.serverId).toBe("my-server");
        expect(alert.serverName).toBe("My Server");
      }
    });

    it("sets resolved: false on all alerts", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ running: false, mem_alarm: true }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      for (const alert of alerts) {
        expect(alert.resolved).toBe(false);
      }
    });

    it("sets a valid ISO timestamp on all alerts", () => {
      const before = new Date().toISOString();
      const alerts = analyzeNodeHealth(
        makeNode({ running: false }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const after = new Date().toISOString();
      for (const alert of alerts) {
        expect(alert.timestamp >= before).toBe(true);
        expect(alert.timestamp <= after).toBe(true);
      }
    });

    it("sets source.type to 'node' and source.name to the node name", () => {
      const alerts = analyzeNodeHealth(
        makeNode({ running: false, name: "rabbit@primary" }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      for (const alert of alerts) {
        expect(alert.source.type).toBe("node");
        expect(alert.source.name).toBe("rabbit@primary");
      }
    });

    it("returns empty array when node is perfectly healthy", () => {
      const alerts = analyzeNodeHealth(
        makeNode(),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(alerts).toHaveLength(0);
    });
  });
});

describe("analyzeQueueHealth", () => {
  describe("message count thresholds", () => {
    it("returns a CRITICAL QUEUE alert when messages equals critical threshold (50,000)", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 50_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find(
        (a) =>
          a.category === AlertCategory.QUEUE &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Critical Queue Backlog"
      );
      expect(alert).toBeDefined();
    });

    it("returns a WARNING QUEUE alert when messages is at warning threshold (10,000)", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 10_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find(
        (a) =>
          a.category === AlertCategory.QUEUE &&
          a.severity === AlertSeverity.WARNING &&
          a.title === "High Queue Backlog"
      );
      expect(alert).toBeDefined();
    });

    it("returns no count alert when messages is below warning threshold", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 100 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Critical Queue Backlog")
      ).toBeUndefined();
      expect(
        alerts.find((a) => a.title === "High Queue Backlog")
      ).toBeUndefined();
    });
  });

  describe("queue without consumers", () => {
    it("returns a WARNING alert when messages > 0 and consumers === 0", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 100, consumers: 0 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find((a) => a.title === "Queue Without Consumers");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe(AlertSeverity.WARNING);
    });

    it("returns no consumer alert when queue has consumers", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 100, consumers: 2 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Queue Without Consumers")
      ).toBeUndefined();
    });

    it("returns no consumer alert when messages is 0", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 0, consumers: 0 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Queue Without Consumers")
      ).toBeUndefined();
    });
  });

  describe("unacknowledged message thresholds", () => {
    it("returns a CRITICAL QUEUE alert when unacked is at critical threshold (5,000)", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages_unacknowledged: 5_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find(
        (a) =>
          a.category === AlertCategory.QUEUE &&
          a.severity === AlertSeverity.CRITICAL &&
          a.title === "Critical Unacknowledged Messages"
      );
      expect(alert).toBeDefined();
    });

    it("returns a WARNING QUEUE alert when unacked is at warning threshold (1,000)", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages_unacknowledged: 1_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find(
        (a) =>
          a.category === AlertCategory.QUEUE &&
          a.severity === AlertSeverity.WARNING &&
          a.title === "High Unacknowledged Messages"
      );
      expect(alert).toBeDefined();
    });
  });

  describe("consumer utilization", () => {
    it("returns a WARNING PERFORMANCE alert when utilization is below 10% (publish=100, deliver=5)", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({
          consumers: 2,
          message_stats: {
            publish_details: { rate: 100 },
            deliver_get_details: { rate: 5 },
          },
        }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find((a) => a.title === "Low Consumer Utilization");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe(AlertSeverity.WARNING);
    });

    it("returns no utilization alert when there are no consumers", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({
          consumers: 0,
          message_stats: {
            publish_details: { rate: 100 },
            deliver_get_details: { rate: 5 },
          },
        }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Low Consumer Utilization")
      ).toBeUndefined();
    });

    it("returns no utilization alert when publish rate is 0 (utilization treated as 100%)", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({
          consumers: 2,
          message_stats: {
            publish_details: { rate: 0 },
            deliver_get_details: { rate: 0 },
          },
        }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Low Consumer Utilization")
      ).toBeUndefined();
    });
  });

  describe("stale messages", () => {
    it("returns a WARNING QUEUE alert when ready > 100, consumers > 0, and delivery rate is 0", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({
          messages_ready: 150,
          consumers: 2,
          message_stats: {
            deliver_get_details: { rate: 0 },
          },
        }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find((a) => a.title === "Stale Messages Detected");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe(AlertSeverity.WARNING);
    });

    it("returns no stale alert when delivery rate is greater than 0", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({
          messages_ready: 150,
          consumers: 2,
          message_stats: {
            deliver_get_details: { rate: 10 },
          },
        }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Stale Messages Detected")
      ).toBeUndefined();
    });

    it("returns no stale alert when ready messages are 100 or fewer", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({
          messages_ready: 100,
          consumers: 2,
          message_stats: {
            deliver_get_details: { rate: 0 },
          },
        }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Stale Messages Detected")
      ).toBeUndefined();
    });
  });

  describe("message accumulation", () => {
    it("returns a WARNING PERFORMANCE alert when accumulation ratio > 0.5 and message count > 1000", () => {
      // publishRate=100, deliverRate=40 → ratio=0.6 > 0.5, messages=2000 > 1000
      const alerts = analyzeQueueHealth(
        makeQueue({
          messages: 2_000,
          consumers: 2,
          messages_ready: 50, // below stale threshold
          message_stats: {
            publish_details: { rate: 100 },
            deliver_get_details: { rate: 40 },
          },
        }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find((a) => a.title === "Message Accumulation");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe(AlertSeverity.WARNING);
    });

    it("returns no accumulation alert when ratio is exactly 0.5 (not > 0.5)", () => {
      // publishRate=100, deliverRate=50 → ratio=0.5, not > 0.5
      const alerts = analyzeQueueHealth(
        makeQueue({
          messages: 2_000,
          message_stats: {
            publish_details: { rate: 100 },
            deliver_get_details: { rate: 50 },
          },
        }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Message Accumulation")
      ).toBeUndefined();
    });

    it("returns no accumulation alert when message count is <= 1000", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({
          messages: 500,
          message_stats: {
            publish_details: { rate: 100 },
            deliver_get_details: { rate: 40 },
          },
        }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(
        alerts.find((a) => a.title === "Message Accumulation")
      ).toBeUndefined();
    });
  });

  describe("inactive queue", () => {
    it("returns an INFO QUEUE alert when idle > 24 hours and 0 messages and 0 consumers", () => {
      const twoDaysAgo = new Date(
        Date.now() - 25 * 60 * 60 * 1000
      ).toISOString();
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 0, consumers: 0, idle_since: twoDaysAgo }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find((a) => a.title === "Inactive Queue");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe(AlertSeverity.INFO);
    });

    it("returns no inactive alert when idle is under 24 hours", () => {
      const recentTime = new Date(
        Date.now() - 12 * 60 * 60 * 1000
      ).toISOString();
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 0, consumers: 0, idle_since: recentTime }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(alerts.find((a) => a.title === "Inactive Queue")).toBeUndefined();
    });

    it("returns no inactive alert when idle_since is absent", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 0, consumers: 0, idle_since: undefined }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(alerts.find((a) => a.title === "Inactive Queue")).toBeUndefined();
    });

    it("returns no inactive alert when there are messages present", () => {
      const twoDaysAgo = new Date(
        Date.now() - 25 * 60 * 60 * 1000
      ).toISOString();
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 1, consumers: 0, idle_since: twoDaysAgo }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(alerts.find((a) => a.title === "Inactive Queue")).toBeUndefined();
    });
  });

  describe("alert shape", () => {
    it("includes vhost on queue backlog alerts", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 60_000, vhost: "/production" }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find((a) => a.title === "Critical Queue Backlog");
      expect(alert?.vhost).toBe("/production");
    });

    it("defaults vhost to '/' when not specified on the queue", () => {
      const queue = makeQueue({ messages: 60_000 });
      // @ts-expect-error removing vhost to test default
      delete queue.vhost;
      const alerts = analyzeQueueHealth(
        queue,
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      const alert = alerts.find((a) => a.title === "Critical Queue Backlog");
      expect(alert?.vhost).toBe("/");
    });

    it("sets source.type to 'queue' on all alerts", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ messages: 60_000, consumers: 0 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      for (const alert of alerts) {
        expect(alert.source.type).toBe("queue");
      }
    });

    it("sets source.name to queue name on all alerts", () => {
      const alerts = analyzeQueueHealth(
        makeQueue({ name: "my-special-queue", messages: 60_000 }),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      for (const alert of alerts) {
        expect(alert.source.name).toBe("my-special-queue");
      }
    });

    it("returns empty array when queue is perfectly healthy", () => {
      const alerts = analyzeQueueHealth(
        makeQueue(),
        SERVER_ID,
        SERVER_NAME,
        DEFAULT_THRESHOLDS
      );
      expect(alerts).toHaveLength(0);
    });
  });
});
