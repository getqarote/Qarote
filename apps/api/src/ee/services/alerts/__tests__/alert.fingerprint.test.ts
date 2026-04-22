import { describe, expect, it } from "vitest";

import {
  generateAlertFingerprint,
  generateAlertId,
} from "../alert.fingerprint";
import { AlertCategory } from "../alert.interfaces";

describe("generateAlertId", () => {
  it("includes the serverId in the returned string", () => {
    const id = generateAlertId(
      "server-1",
      AlertCategory.MEMORY,
      "rabbit@node1"
    );
    expect(id).toContain("server-1");
  });

  it("includes the category in the returned string", () => {
    const id = generateAlertId(
      "server-1",
      AlertCategory.MEMORY,
      "rabbit@node1"
    );
    expect(id).toContain(AlertCategory.MEMORY);
  });

  it("includes the source name in the returned string", () => {
    const id = generateAlertId("server-1", AlertCategory.QUEUE, "my-queue");
    expect(id).toContain("my-queue");
  });

  it("includes a numeric timestamp component", () => {
    const before = Date.now();
    const id = generateAlertId("server-1", AlertCategory.NODE, "rabbit@node1");
    const after = Date.now();

    // Extract the timestamp part (last segment after the last dash)
    const parts = id.split("-");
    const timestamp = parseInt(parts[parts.length - 1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it("produces different IDs on successive calls due to timestamp", async () => {
    const id1 = generateAlertId(
      "server-1",
      AlertCategory.MEMORY,
      "rabbit@node1"
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    const id2 = generateAlertId(
      "server-1",
      AlertCategory.MEMORY,
      "rabbit@node1"
    );
    expect(id1).not.toBe(id2);
  });
});

describe("generateAlertFingerprint", () => {
  it("returns a stable string for the same inputs", () => {
    const fp1 = generateAlertFingerprint(
      "server-1",
      AlertCategory.MEMORY,
      "node",
      "rabbit@node1"
    );
    const fp2 = generateAlertFingerprint(
      "server-1",
      AlertCategory.MEMORY,
      "node",
      "rabbit@node1"
    );
    expect(fp1).toBe(fp2);
  });

  it("includes serverId, category, sourceType, and sourceName", () => {
    const fp = generateAlertFingerprint(
      "server-42",
      AlertCategory.DISK,
      "node",
      "rabbit@node2"
    );
    expect(fp).toContain("server-42");
    expect(fp).toContain(AlertCategory.DISK);
    expect(fp).toContain("node");
    expect(fp).toContain("rabbit@node2");
  });

  it("includes vhost when sourceType is 'queue' and vhost is provided", () => {
    const fp = generateAlertFingerprint(
      "server-1",
      AlertCategory.QUEUE,
      "queue",
      "my-queue",
      "/production"
    );
    expect(fp).toContain("/production");
    expect(fp).toContain("my-queue");
  });

  it("omits vhost when sourceType is 'node' even if vhost is provided", () => {
    const fp = generateAlertFingerprint(
      "server-1",
      AlertCategory.MEMORY,
      "node",
      "rabbit@node1",
      "/production"
    );
    expect(fp).not.toContain("/production");
  });

  it("omits vhost when sourceType is 'cluster'", () => {
    const fp = generateAlertFingerprint(
      "server-1",
      AlertCategory.NODE,
      "cluster",
      "my-cluster",
      "/production"
    );
    expect(fp).not.toContain("/production");
  });

  it("omits vhost when sourceType is 'queue' but no vhost is provided", () => {
    const fp = generateAlertFingerprint(
      "server-1",
      AlertCategory.QUEUE,
      "queue",
      "my-queue"
    );
    // Should use the format without vhost
    expect(fp).toBe("server-1-queue-queue-my-queue");
  });

  it("differentiates the same queue name in different vhosts", () => {
    const fp1 = generateAlertFingerprint(
      "server-1",
      AlertCategory.QUEUE,
      "queue",
      "my-queue",
      "/vhost-a"
    );
    const fp2 = generateAlertFingerprint(
      "server-1",
      AlertCategory.QUEUE,
      "queue",
      "my-queue",
      "/vhost-b"
    );
    expect(fp1).not.toBe(fp2);
  });

  it("differentiates alerts by category", () => {
    const fp1 = generateAlertFingerprint(
      "server-1",
      AlertCategory.MEMORY,
      "node",
      "rabbit@node1"
    );
    const fp2 = generateAlertFingerprint(
      "server-1",
      AlertCategory.DISK,
      "node",
      "rabbit@node1"
    );
    expect(fp1).not.toBe(fp2);
  });

  it("differentiates alerts by serverId", () => {
    const fp1 = generateAlertFingerprint(
      "server-1",
      AlertCategory.MEMORY,
      "node",
      "rabbit@node1"
    );
    const fp2 = generateAlertFingerprint(
      "server-2",
      AlertCategory.MEMORY,
      "node",
      "rabbit@node1"
    );
    expect(fp1).not.toBe(fp2);
  });
});
