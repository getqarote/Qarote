/**
 * Unit tests for the license-invalidation module — exercises the
 * lifecycle and notify path without standing up a real Postgres
 * connection. The pg `Client` is mocked at the module boundary; the
 * real LISTEN protocol is verified separately by the trace-monitor
 * integration suite which uses the same mechanism.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────

const mockClientConnect = vi.fn();
const mockClientQuery = vi.fn();
const mockClientEnd = vi.fn();
const mockClientOn = vi.fn();
const mockClientRemoveAllListeners = vi.fn();

class FakePgClient {
  connect = mockClientConnect;
  query = mockClientQuery;
  end = mockClientEnd;
  on = mockClientOn;
  removeAllListeners = mockClientRemoveAllListeners;
}

vi.mock("pg", () => ({
  Client: FakePgClient,
}));

const mockInvalidateLicenseCache = vi.fn();
vi.mock("../license", () => ({
  invalidateLicenseCache: () => mockInvalidateLicenseCache(),
}));

const mockExecuteRawUnsafe = vi.fn();
vi.mock("@/core/prisma", () => ({
  prisma: {
    $executeRawUnsafe: (sql: string) => mockExecuteRawUnsafe(sql),
  },
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Test setup ────────────────────────────────────────────────────────

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

beforeEach(() => {
  vi.resetAllMocks();
  // Reset the dynamic-import cache so module-scoped state in
  // `license-invalidation.ts` (`listenClient`, `backoffMs`, `stopped`)
  // does not leak across tests.
  vi.resetModules();
  process.env.DATABASE_URL = "postgres://test/qarote";
  mockClientConnect.mockResolvedValue(undefined);
  mockClientQuery.mockResolvedValue(undefined);
  mockClientEnd.mockResolvedValue(undefined);
  mockExecuteRawUnsafe.mockResolvedValue(undefined);
});

afterEach(async () => {
  // Module-scoped state is reset by stop() — ensure each test leaves
  // the singleton in a clean state.
  const { stopLicenseInvalidationListener } =
    await import("../license-invalidation");
  await stopLicenseInvalidationListener();
  process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
});

describe("startLicenseInvalidationListener", () => {
  it("opens a pg client and issues LISTEN on the license_invalidated channel", async () => {
    const { startLicenseInvalidationListener } =
      await import("../license-invalidation");
    await startLicenseInvalidationListener();
    expect(mockClientConnect).toHaveBeenCalledOnce();
    expect(mockClientQuery).toHaveBeenCalledWith("LISTEN license_invalidated");
  });

  it("invalidates the local cache on a matching NOTIFY", async () => {
    const { startLicenseInvalidationListener } =
      await import("../license-invalidation");
    await startLicenseInvalidationListener();

    // Capture the notification handler the module registered.
    const notificationHandler = mockClientOn.mock.calls.find(
      ([event]) => event === "notification"
    )?.[1] as (msg: { channel: string }) => void;
    expect(notificationHandler).toBeDefined();

    notificationHandler({ channel: "license_invalidated" });
    expect(mockInvalidateLicenseCache).toHaveBeenCalledOnce();
  });

  it("ignores notifications on other channels", async () => {
    const { startLicenseInvalidationListener } =
      await import("../license-invalidation");
    await startLicenseInvalidationListener();

    const notificationHandler = mockClientOn.mock.calls.find(
      ([event]) => event === "notification"
    )?.[1] as (msg: { channel: string }) => void;

    notificationHandler({ channel: "trace_config_changed" });
    expect(mockInvalidateLicenseCache).not.toHaveBeenCalled();
  });

  it("is a no-op when DATABASE_URL is unset", async () => {
    delete process.env.DATABASE_URL;
    const { startLicenseInvalidationListener } =
      await import("../license-invalidation");
    await startLicenseInvalidationListener();
    expect(mockClientConnect).not.toHaveBeenCalled();
  });

  it("tears down a prior client before opening a new one (idempotent)", async () => {
    const { startLicenseInvalidationListener } =
      await import("../license-invalidation");
    await startLicenseInvalidationListener();
    await startLicenseInvalidationListener();
    // Second start should have ended the first client.
    expect(mockClientEnd).toHaveBeenCalled();
    // And reconnected — connect called twice total.
    expect(mockClientConnect).toHaveBeenCalledTimes(2);
  });
});

describe("broadcastLicenseInvalidation", () => {
  it("invalidates the local cache and issues NOTIFY", async () => {
    const { broadcastLicenseInvalidation } =
      await import("../license-invalidation");
    await broadcastLicenseInvalidation();
    expect(mockInvalidateLicenseCache).toHaveBeenCalledOnce();
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(
      "NOTIFY license_invalidated"
    );
  });

  it("still invalidates locally when NOTIFY fails", async () => {
    mockExecuteRawUnsafe.mockRejectedValueOnce(new Error("connection lost"));
    const { broadcastLicenseInvalidation } =
      await import("../license-invalidation");
    // Must not throw — coherency is best-effort, the 60s TTL is the floor.
    await expect(broadcastLicenseInvalidation()).resolves.toBeUndefined();
    expect(mockInvalidateLicenseCache).toHaveBeenCalledOnce();
  });
});

describe("stopLicenseInvalidationListener", () => {
  it("closes the active client", async () => {
    const {
      startLicenseInvalidationListener,
      stopLicenseInvalidationListener,
    } = await import("../license-invalidation");
    await startLicenseInvalidationListener();
    await stopLicenseInvalidationListener();
    expect(mockClientEnd).toHaveBeenCalled();
  });

  it("is safe to call when no client is open", async () => {
    const { stopLicenseInvalidationListener } =
      await import("../license-invalidation");
    await expect(stopLicenseInvalidationListener()).resolves.toBeUndefined();
  });

  it("cancels a pending reconnect timer (SIGTERM during backoff)", async () => {
    vi.useFakeTimers();
    // First connect succeeds; the subsequent error-driven reconnect
    // schedules a timer that stop() must cancel.
    const {
      startLicenseInvalidationListener,
      stopLicenseInvalidationListener,
    } = await import("../license-invalidation");
    await startLicenseInvalidationListener();

    // Trigger the error path → schedules a reconnect timer
    const errorHandler = mockClientOn.mock.calls.find(
      ([event]) => event === "error"
    )?.[1] as (err: Error) => void;
    errorHandler(new Error("connection lost"));
    // Let the queued teardown microtask drain
    await Promise.resolve();
    await Promise.resolve();

    // Reset connect mock — if reconnect runs, this would be called again.
    mockClientConnect.mockClear();
    await stopLicenseInvalidationListener();

    // Even after timers advance, the cancelled reconnect must not fire.
    vi.advanceTimersByTime(120_000);
    expect(mockClientConnect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("keepalive", () => {
  it("sends SELECT 1 after the keepalive interval to prevent idle-session timeout", async () => {
    vi.useFakeTimers();
    const { startLicenseInvalidationListener, KEEPALIVE_INTERVAL_MS } =
      await import("../license-invalidation");
    await startLicenseInvalidationListener();

    mockClientQuery.mockClear();
    await vi.advanceTimersByTimeAsync(KEEPALIVE_INTERVAL_MS);

    expect(mockClientQuery).toHaveBeenCalledWith("SELECT 1");
    vi.useRealTimers();
  });

  it("does not send keepalive queries after stop()", async () => {
    vi.useFakeTimers();
    const {
      startLicenseInvalidationListener,
      stopLicenseInvalidationListener,
      KEEPALIVE_INTERVAL_MS,
    } = await import("../license-invalidation");
    await startLicenseInvalidationListener();
    await stopLicenseInvalidationListener();

    mockClientQuery.mockClear();
    await vi.advanceTimersByTimeAsync(KEEPALIVE_INTERVAL_MS * 3);

    expect(mockClientQuery).not.toHaveBeenCalledWith("SELECT 1");
    vi.useRealTimers();
  });
});

describe("setup failure paths", () => {
  it("schedules reconnect when LISTEN query fails after connect succeeds", async () => {
    vi.useFakeTimers();
    mockClientQuery.mockRejectedValueOnce(new Error("LISTEN denied"));
    const { startLicenseInvalidationListener } =
      await import("../license-invalidation");
    await startLicenseInvalidationListener();
    // Half-opened client must be cleaned up by setupClient's catch.
    expect(mockClientEnd).toHaveBeenCalled();
    // Reconnect timer queued — let it fire on a successful retry.
    mockClientQuery.mockResolvedValueOnce(undefined);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mockClientConnect).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("attaches the error handler before connect() so connection-error events are caught", async () => {
    const { startLicenseInvalidationListener } =
      await import("../license-invalidation");
    await startLicenseInvalidationListener();
    // Find the indices of the `on("error", ...)` registration and the
    // connect() call. error-handler attach happens before connect().
    const errorAttachOrder = mockClientOn.mock.invocationCallOrder.find(
      (_, i) => mockClientOn.mock.calls[i]?.[0] === "error"
    );
    const connectOrder = mockClientConnect.mock.invocationCallOrder[0];
    expect(errorAttachOrder).toBeDefined();
    expect(connectOrder).toBeDefined();
    expect(errorAttachOrder!).toBeLessThan(connectOrder!);
  });

  it("cancels a pending reconnect when start() is called again — no concurrent setupClient", async () => {
    vi.useFakeTimers();
    // First setup fails → schedules a reconnect timer
    mockClientQuery.mockRejectedValueOnce(new Error("LISTEN denied"));
    const { startLicenseInvalidationListener } =
      await import("../license-invalidation");
    await startLicenseInvalidationListener();
    expect(mockClientConnect).toHaveBeenCalledTimes(1);

    // Operator calls start() again before the reconnect fires.
    // The pending timer must be cancelled so we don't get two
    // setupClient() runs racing each other.
    mockClientQuery.mockResolvedValueOnce(undefined);
    await startLicenseInvalidationListener();
    expect(mockClientConnect).toHaveBeenCalledTimes(2);

    // Advance past the original reconnect delay — the cancelled
    // timer must NOT fire and must NOT open a third client.
    await vi.advanceTimersByTimeAsync(120_000);
    expect(mockClientConnect).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
