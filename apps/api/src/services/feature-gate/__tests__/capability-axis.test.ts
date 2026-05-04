/**
 * Tests for the capability axis — verify per-feature rules against
 * realistic snapshot fixtures, plus the snapshot-missing fallthrough.
 *
 * The axis itself reads `getServerCapabilities` (DB) and
 * `prisma.queueMetricSnapshot.findFirst` for diagnosis warmup. Both are
 * mocked so the axis logic is exercised in isolation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CapabilitySnapshot } from "@/services/feature-gate/capability-snapshot";

import { FEATURES } from "@/config/features";

// ── Mocks ────────────────────────────────────────────────────────────
const mockGetServerCapabilities = vi.fn();
const mockSnapshotFindFirst = vi.fn();

vi.mock("@/services/feature-gate/capability-snapshot", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/feature-gate/capability-snapshot")
  >("@/services/feature-gate/capability-snapshot");
  return {
    ...actual,
    getServerCapabilities: mockGetServerCapabilities,
  };
});

vi.mock("@/core/prisma", () => ({
  prisma: {
    queueMetricSnapshot: {
      findFirst: mockSnapshotFindFirst,
    },
  },
}));

const { resolveCapabilityAxis } =
  await import("@/services/feature-gate/capability-axis");

// ── Fixtures ─────────────────────────────────────────────────────────
function snapshot(
  partial: Partial<CapabilitySnapshot> = {}
): CapabilitySnapshot {
  return {
    schemaVersion: 1,
    enabledPlugins: ["rabbitmq_management"],
    hasFirehoseExchange: false,
    detectedAt: "2026-04-29T10:00:00.000Z",
    ...partial,
  };
}

const RMQ_3_12_OSS = snapshot({
  enabledPlugins: ["rabbitmq_management", "rabbitmq_federation"],
  hasFirehoseExchange: false,
});

const RMQ_3_12_OSS_WITH_FIREHOSE = snapshot({
  enabledPlugins: [
    "rabbitmq_management",
    "rabbitmq_tracing",
    "rabbitmq_federation",
  ],
  hasFirehoseExchange: true,
});

const RMQ_4_0_TANZU = snapshot({
  enabledPlugins: [
    "rabbitmq_management",
    "rabbitmq_tracing",
    "rabbitmq_event_exchange",
  ],
  hasFirehoseExchange: true,
});

beforeEach(() => {
  mockGetServerCapabilities.mockReset();
  mockSnapshotFindFirst.mockReset();
  // warm by default — any old-enough snapshot exists
  mockSnapshotFindFirst.mockResolvedValue({ id: "snap_old" });
});

// ── No serverId in context → axis is inert ───────────────────────────
describe("resolveCapabilityAxis — no serverId context", () => {
  it("returns ok without consulting the snapshot", async () => {
    const result = await resolveCapabilityAxis(FEATURES.MESSAGE_TRACING);
    expect(result.kind).toBe("ok");
    expect(mockGetServerCapabilities).not.toHaveBeenCalled();
  });
});

// ── Snapshot missing entirely ────────────────────────────────────────
describe("resolveCapabilityAxis — snapshot missing", () => {
  it("blocks capability-required features with reasonKey capability.unknown", async () => {
    mockGetServerCapabilities.mockResolvedValue(null);
    const result = await resolveCapabilityAxis(FEATURES.MESSAGE_TRACING, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockedBy).toBe("capability");
    expect(result.reasonKey).toBe("capability.unknown");
  });

  it("does NOT block features without capabilityRequired (e.g. ALERTING)", async () => {
    mockGetServerCapabilities.mockResolvedValue(null);
    const result = await resolveCapabilityAxis(FEATURES.ALERTING, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("ok");
    // Snapshot is never even loaded for non-capability-required features.
    expect(mockGetServerCapabilities).not.toHaveBeenCalled();
  });
});

// ── MESSAGE_TRACING (rename target: message_recording) ───────────────
describe("resolveCapabilityAxis — MESSAGE_TRACING", () => {
  it("blocks when broker returns no nodes (firehose exchange unavailable)", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS);
    const result = await resolveCapabilityAxis(FEATURES.MESSAGE_TRACING, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.reasonKey).toBe("capability.tracing.brokerUnreachable");
    expect(result.remediation?.docsUrl).toBeTruthy();
  });

  it("returns ok when rabbitmq_tracing is enabled", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS_WITH_FIREHOSE);
    const result = await resolveCapabilityAxis(FEATURES.MESSAGE_TRACING, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("ok");
  });

  it("returns ok when rabbitmq_event_exchange is enabled (Tanzu/equivalent)", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_4_0_TANZU);
    const result = await resolveCapabilityAxis(FEATURES.MESSAGE_TRACING, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("ok");
  });
});

// ── MESSAGE_SPY (rename target: message_tap) ─────────────────────────
describe("resolveCapabilityAxis — MESSAGE_SPY", () => {
  it("blocks when targeting a stream queue", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS);
    const result = await resolveCapabilityAxis(FEATURES.MESSAGE_SPY, {
      serverId: "srv_1",
      subject: { kind: "queue", queueType: "stream" },
    });
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.reasonKey).toBe("capability.tap.streamUnsupported");
  });

  it("returns ok for classic and quorum queues", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS);
    for (const queueType of ["classic", "quorum"] as const) {
      const result = await resolveCapabilityAxis(FEATURES.MESSAGE_SPY, {
        serverId: "srv_1",
        subject: { kind: "queue", queueType },
      });
      expect(result.kind).toBe("ok");
    }
  });

  it("returns ok when subject is unspecified (UI not targeting a specific queue)", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS);
    const result = await resolveCapabilityAxis(FEATURES.MESSAGE_SPY, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("ok");
  });
});

// ── INCIDENT_DIAGNOSIS warmup ────────────────────────────────────────
describe("resolveCapabilityAxis — INCIDENT_DIAGNOSIS", () => {
  it("returns degraded when no snapshot is older than the warmup window", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS);
    mockSnapshotFindFirst.mockResolvedValueOnce(null);
    const result = await resolveCapabilityAxis(FEATURES.INCIDENT_DIAGNOSIS, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("degraded");
    if (result.kind === "degraded") {
      expect(result.reasonKey).toBe("capability.diagnosis.warmingUp");
      expect(result.reasonParams?.requiredMinutes).toBe(180);
    }
  });

  it("returns ok once a snapshot older than the warmup window exists", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS);
    mockSnapshotFindFirst.mockResolvedValueOnce({ id: "snap_old" });
    const result = await resolveCapabilityAxis(FEATURES.INCIDENT_DIAGNOSIS, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("ok");
  });

  it("fails open (kind: ok) when the warmup query throws", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS);
    mockSnapshotFindFirst.mockRejectedValueOnce(
      new Error("connection refused")
    );
    const result = await resolveCapabilityAxis(FEATURES.INCIDENT_DIAGNOSIS, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("ok");
  });
});

// ── Features without a capability rule pass through ───────────────────
describe("resolveCapabilityAxis — features without rules", () => {
  it("returns ok for ALERTING (no capability constraint today)", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS);
    const result = await resolveCapabilityAxis(FEATURES.ALERTING, {
      serverId: "srv_1",
    });
    expect(result.kind).toBe("ok");
  });
});

// ── Subject is ignored for features whose rule is not subject-based ───
describe("resolveCapabilityAxis — subject ignored for non-subject rules", () => {
  it("MESSAGE_TRACING ignores subject (rule is broker-reachability-based)", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS_WITH_FIREHOSE);
    // Pass a stream subject to a feature whose rule doesn't read it.
    // Must still return ok — a future refactor that hoists subject
    // narrowing above the per-feature switch would break this.
    const result = await resolveCapabilityAxis(FEATURES.MESSAGE_TRACING, {
      serverId: "srv_1",
      subject: { kind: "queue", queueType: "stream" },
    });
    expect(result.kind).toBe("ok");
  });

  it("INCIDENT_DIAGNOSIS ignores subject", async () => {
    mockGetServerCapabilities.mockResolvedValue(RMQ_3_12_OSS);
    mockSnapshotFindFirst.mockResolvedValueOnce({ id: "snap_old" });
    const result = await resolveCapabilityAxis(FEATURES.INCIDENT_DIAGNOSIS, {
      serverId: "srv_1",
      subject: { kind: "queue", queueType: "stream" },
    });
    expect(result.kind).toBe("ok");
  });
});
