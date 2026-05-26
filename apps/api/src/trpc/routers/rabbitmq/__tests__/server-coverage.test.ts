/**
 * Tests for the messageId coverage procedure's single-flight wrapper.
 *
 * The procedure itself is a thin Zod-validated shell around
 * `getMessageIdCoverageSingleFlight` — the single-flight behaviour is
 * the load-bearing addition (per Backend Architect B2: the underlying
 * helper has Postgres caching only, no in-process dedup, so 100
 * concurrent requests would otherwise fan to 100 DB hits). We test the
 * helper directly with mocked deps rather than stand up the full tRPC
 * harness for the same coverage.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIsFirehoseAvailable = vi.fn<(id: string) => Promise<boolean>>();
const mockFetchCoverage =
  vi.fn<
    (
      id: string
    ) => Promise<
      { taggedPublishes: number; totalPublishes: number } | undefined
    >
  >();

vi.mock("@/ee/services/llm/firehose-evidence.service", () => ({
  isFirehoseAvailable: mockIsFirehoseAvailable,
}));
vi.mock("@/ee/services/incident/firehose-coverage.service", () => ({
  fetchPublisherMessageIdCoverage: mockFetchCoverage,
}));
// The router module also imports prisma + many auth helpers — stub the
// minimum so the module evaluates without touching real infra.
vi.mock("@/core/prisma", () => ({ prisma: {} }));
vi.mock("@/core/rabbitmq", () => ({ RabbitMQClient: class {} }));
vi.mock("@/services/alerts/alert-seeding.service", () => ({
  seedDefaultAlertRules: vi.fn(),
}));
vi.mock("@/services/audit", () => ({
  recordCapabilityRecheck: vi.fn(),
  recordFromContext: vi.fn(),
}));
vi.mock("@/services/encryption.service", () => ({
  EncryptionService: class {},
}));
vi.mock("@/services/feature-gate/capability-refresh", () => ({
  refreshServerCapabilities: vi.fn(),
}));

const { getMessageIdCoverageSingleFlight } = await import("../server");

beforeEach(() => {
  mockIsFirehoseAvailable.mockReset();
  mockFetchCoverage.mockReset();
});

describe("getMessageIdCoverageSingleFlight", () => {
  it("returns firehoseEnabled: false when firehose is unavailable", async () => {
    mockIsFirehoseAvailable.mockResolvedValueOnce(false);
    const result = await getMessageIdCoverageSingleFlight("srv-1");
    expect(result).toEqual({ firehoseEnabled: false });
    expect(mockFetchCoverage).not.toHaveBeenCalled();
  });

  it("returns the coverage counts when firehose is enabled and helper has data", async () => {
    mockIsFirehoseAvailable.mockResolvedValueOnce(true);
    mockFetchCoverage.mockResolvedValueOnce({
      taggedPublishes: 250,
      totalPublishes: 340,
    });
    const result = await getMessageIdCoverageSingleFlight("srv-1");
    expect(result).toEqual({
      firehoseEnabled: true,
      taggedPublishes: 250,
      totalPublishes: 340,
    });
  });

  it("defaults counts to 0/0 when firehose is enabled but helper returned undefined", async () => {
    // The helper returns undefined on query error or no row (idle broker
    // returns {0, 0}, not undefined). When it does come back undefined,
    // the procedure surface still emits a valid discriminated-union
    // branch so the client narrows cleanly — it just shows zeros.
    mockIsFirehoseAvailable.mockResolvedValueOnce(true);
    mockFetchCoverage.mockResolvedValueOnce(undefined);
    const result = await getMessageIdCoverageSingleFlight("srv-1");
    expect(result).toEqual({
      firehoseEnabled: true,
      taggedPublishes: 0,
      totalPublishes: 0,
    });
  });

  it("collapses N concurrent calls for the same serverId to 1 helper invocation", async () => {
    // Backend Architect B2 — without single-flight, a burst of 100 page
    // loads after the 60s helper cache TTL would fan out to 100 DB
    // hits. The single-flight Map ensures only one in-flight promise
    // per serverId, with all callers awaiting the same resolution.
    let resolveFn: ((b: boolean) => void) | undefined;
    mockIsFirehoseAvailable.mockReturnValueOnce(
      new Promise<boolean>((r) => {
        resolveFn = r;
      })
    );
    mockFetchCoverage.mockResolvedValueOnce({
      taggedPublishes: 10,
      totalPublishes: 100,
    });

    const promises = Array.from({ length: 100 }, () =>
      getMessageIdCoverageSingleFlight("srv-1")
    );

    // The 100 callers all wait on the same in-flight promise — the
    // mock has only been called once at this point because subsequent
    // callers hit the Map.
    expect(mockIsFirehoseAvailable).toHaveBeenCalledTimes(1);

    resolveFn?.(true);
    const results = await Promise.all(promises);

    // Every caller got the same shape, and the underlying helper was
    // hit exactly once.
    expect(mockIsFirehoseAvailable).toHaveBeenCalledTimes(1);
    expect(mockFetchCoverage).toHaveBeenCalledTimes(1);
    for (const r of results) {
      expect(r).toEqual({
        firehoseEnabled: true,
        taggedPublishes: 10,
        totalPublishes: 100,
      });
    }
  });

  it("clears the in-flight entry after resolution so subsequent calls re-fetch", async () => {
    // The Map must not retain resolved promises forever — that would
    // serve stale results long past the helper's 60s Postgres cache.
    // The finally-block eviction is the regression guard.
    mockIsFirehoseAvailable.mockResolvedValueOnce(true);
    mockFetchCoverage.mockResolvedValueOnce({
      taggedPublishes: 10,
      totalPublishes: 100,
    });
    await getMessageIdCoverageSingleFlight("srv-1");

    mockIsFirehoseAvailable.mockResolvedValueOnce(true);
    mockFetchCoverage.mockResolvedValueOnce({
      taggedPublishes: 50,
      totalPublishes: 100,
    });
    const second = await getMessageIdCoverageSingleFlight("srv-1");

    expect(mockIsFirehoseAvailable).toHaveBeenCalledTimes(2);
    expect(mockFetchCoverage).toHaveBeenCalledTimes(2);
    expect(second.firehoseEnabled).toBe(true);
    if (second.firehoseEnabled) {
      expect(second.taggedPublishes).toBe(50);
    }
  });

  it("still evicts the in-flight entry when the underlying helper throws", async () => {
    // Without finally{}, an error would leave the Map populated with a
    // rejected promise — subsequent callers would all re-reject without
    // ever retrying. This pins the cleanup contract.
    mockIsFirehoseAvailable.mockRejectedValueOnce(new Error("boom"));
    await expect(getMessageIdCoverageSingleFlight("srv-1")).rejects.toThrow(
      "boom"
    );

    // Second call should fan into a fresh helper invocation, not the
    // stale rejected promise.
    mockIsFirehoseAvailable.mockResolvedValueOnce(false);
    const second = await getMessageIdCoverageSingleFlight("srv-1");
    expect(second).toEqual({ firehoseEnabled: false });
    expect(mockIsFirehoseAvailable).toHaveBeenCalledTimes(2);
  });
});
