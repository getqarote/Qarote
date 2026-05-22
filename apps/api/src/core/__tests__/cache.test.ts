import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks must be declared before the module under test is imported.
const mockQueryRaw = vi.fn();
const mockExecuteRaw = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
    $executeRaw: mockExecuteRaw,
  },
}));

// Dynamic import so the mock is in place before the module is evaluated.
const {
  cacheGet,
  cacheSet,
  cacheDeletePrefix,
  cachePruneExpired,
  cacheIncrement,
} = await import("@/core/cache");

// ─── cacheGet ─────────────────────────────────────────────────────────────────

describe("cacheGet", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
    mockExecuteRaw.mockReset();
  });

  it("returns null on cache miss (empty result set)", async () => {
    mockQueryRaw.mockResolvedValue([]);
    expect(await cacheGet("missing:key")).toBeNull();
  });

  it("returns the deserialised JSONB value on cache hit", async () => {
    const payload = { diagnoses: [], snapshotCount: 5 };
    mockQueryRaw.mockResolvedValue([{ value: payload }]);
    expect(await cacheGet<typeof payload>("hit:key")).toEqual(payload);
  });

  it("issues exactly one query per call", async () => {
    mockQueryRaw.mockResolvedValue([]);
    await cacheGet("k1");
    await cacheGet("k2");
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });
});

// ─── cacheSet ─────────────────────────────────────────────────────────────────

describe("cacheSet", () => {
  beforeEach(() => {
    mockExecuteRaw.mockReset().mockResolvedValue(1);
  });

  it("throws TypeError synchronously when value is undefined", async () => {
    await expect(cacheSet("k", undefined)).rejects.toThrow(TypeError);
    await expect(cacheSet("k", undefined)).rejects.toThrow(
      "must not be undefined"
    );
  });

  it("does not call $executeRaw when value is undefined", async () => {
    await expect(cacheSet("k", undefined)).rejects.toThrow();
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });

  it("uses 'infinity' as expiresAt when no TTL is provided", async () => {
    await cacheSet("k", { x: 1 });
    // Tagged template: arg[0]=TemplateStringsArray, arg[1]=key, arg[2]=valueJson, arg[3]=expiresAt
    const expiresAt = mockExecuteRaw.mock.calls[0][3];
    expect(expiresAt).toBe("infinity");
  });

  it("uses an ISO timestamp as expiresAt when TTL is provided", async () => {
    const ttlMs = 5 * 60 * 1000;
    const before = Date.now();
    await cacheSet("k", { x: 1 }, ttlMs);
    const after = Date.now();
    const expiresAt = mockExecuteRaw.mock.calls[0][3];
    const ts = new Date(expiresAt as string).getTime();
    expect(ts).toBeGreaterThanOrEqual(before + ttlMs);
    expect(ts).toBeLessThanOrEqual(after + ttlMs);
  });

  it("serialises the value as a JSON string for the ::jsonb cast", async () => {
    const value = { a: 1, nested: [2, 3] };
    await cacheSet("k", value);
    const serialised = mockExecuteRaw.mock.calls[0][2];
    expect(serialised).toBe(JSON.stringify(value));
  });

  it("passes the key as the first interpolated parameter", async () => {
    await cacheSet("diagnosis:ws1:srv1:120", { ok: true });
    expect(mockExecuteRaw.mock.calls[0][1]).toBe("diagnosis:ws1:srv1:120");
  });

  it("serialises primitive values (number, boolean, null)", async () => {
    await cacheSet("k", 42);
    expect(mockExecuteRaw.mock.calls[0][2]).toBe("42");
    mockExecuteRaw.mockReset().mockResolvedValue(1);

    await cacheSet("k", false);
    expect(mockExecuteRaw.mock.calls[0][2]).toBe("false");
    mockExecuteRaw.mockReset().mockResolvedValue(1);

    await cacheSet("k", null);
    expect(mockExecuteRaw.mock.calls[0][2]).toBe("null");
  });
});

// ─── cacheDeletePrefix ────────────────────────────────────────────────────────

describe("cacheDeletePrefix", () => {
  beforeEach(() => {
    mockExecuteRaw.mockReset().mockResolvedValue(0);
  });

  it("appends % to a clean prefix to form the LIKE pattern", async () => {
    await cacheDeletePrefix("diagnosis:ws1:srv1:");
    const pattern = mockExecuteRaw.mock.calls[0][1];
    expect(pattern).toBe("diagnosis:ws1:srv1:%");
  });

  it("escapes % metacharacter in the prefix", async () => {
    await cacheDeletePrefix("foo%bar:");
    const pattern = mockExecuteRaw.mock.calls[0][1];
    expect(pattern).toBe("foo\\%bar:%");
  });

  it("escapes _ metacharacter in the prefix", async () => {
    await cacheDeletePrefix("foo_bar:");
    const pattern = mockExecuteRaw.mock.calls[0][1];
    expect(pattern).toBe("foo\\_bar:%");
  });

  it("escapes backslash in the prefix", async () => {
    await cacheDeletePrefix("foo\\bar:");
    const pattern = mockExecuteRaw.mock.calls[0][1];
    expect(pattern).toBe("foo\\\\bar:%");
  });

  it("escapes multiple metacharacters in a single prefix", async () => {
    await cacheDeletePrefix("a%b_c\\d:");
    const pattern = mockExecuteRaw.mock.calls[0][1];
    expect(pattern).toBe("a\\%b\\_c\\\\d:%");
  });

  it("issues exactly one DELETE per call", async () => {
    await cacheDeletePrefix("p:");
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
  });
});

// ─── cachePruneExpired ────────────────────────────────────────────────────────

describe("cacheIncrement", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
    mockExecuteRaw.mockReset();
  });

  it("returns the count and windowEnd from the UPSERT RETURNING row", async () => {
    const windowEnd = new Date("2026-05-12T12:00:00Z");
    mockQueryRaw.mockResolvedValue([{ count: 1, window_end: windowEnd }]);

    const result = await cacheIncrement("llm:regen-rl:user-1", 60_000);

    expect(result).toEqual({ count: 1, windowEnd });
  });

  it("returns the incremented count on subsequent calls (mocked sequence)", async () => {
    const windowEnd = new Date("2026-05-12T12:00:00Z");
    mockQueryRaw
      .mockResolvedValueOnce([{ count: 1, window_end: windowEnd }])
      .mockResolvedValueOnce([{ count: 2, window_end: windowEnd }])
      .mockResolvedValueOnce([{ count: 3, window_end: windowEnd }]);

    const r1 = await cacheIncrement("k", 60_000);
    const r2 = await cacheIncrement("k", 60_000);
    const r3 = await cacheIncrement("k", 60_000);

    expect([r1.count, r2.count, r3.count]).toEqual([1, 2, 3]);
    expect(r1.windowEnd).toEqual(r2.windowEnd);
    expect(r2.windowEnd).toEqual(r3.windowEnd);
  });

  it("treats a reset (TTL expiry) like a fresh window: count back to 1, new windowEnd", async () => {
    const oldWindow = new Date("2026-05-12T12:00:00Z");
    const newWindow = new Date("2026-05-12T13:00:00Z");
    mockQueryRaw
      .mockResolvedValueOnce([{ count: 1, window_end: oldWindow }])
      .mockResolvedValueOnce([{ count: 1, window_end: newWindow }]);

    const r1 = await cacheIncrement("k", 60_000);
    const r2 = await cacheIncrement("k", 60_000);

    expect(r1.count).toBe(1);
    expect(r2.count).toBe(1);
    expect(r2.windowEnd.getTime()).toBeGreaterThan(r1.windowEnd.getTime());
  });

  it("throws when RETURNING yields no row", async () => {
    mockQueryRaw.mockResolvedValue([]);
    await expect(cacheIncrement("k", 60_000)).rejects.toThrow(
      "cacheIncrement: UPSERT RETURNING produced no row"
    );
  });

  it("rejects ttlMs <= 0 without issuing any query", async () => {
    await expect(cacheIncrement("k", 0)).rejects.toThrow(
      /ttlMs must be a positive finite number/
    );
    await expect(cacheIncrement("k", -1)).rejects.toThrow(
      /ttlMs must be a positive finite number/
    );
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("rejects non-finite ttlMs (Infinity, NaN) without issuing any query", async () => {
    await expect(cacheIncrement("k", Infinity)).rejects.toThrow(
      /ttlMs must be a positive finite number/
    );
    await expect(cacheIncrement("k", NaN)).rejects.toThrow(
      /ttlMs must be a positive finite number/
    );
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("rejects ttlMs above the 24h cap without issuing any query", async () => {
    const oneDayMs = 24 * 60 * 60 * 1000;
    await expect(cacheIncrement("k", oneDayMs + 1)).rejects.toThrow(
      /exceeds the 24h cap/
    );
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("issues exactly one $queryRaw per call (single round-trip)", async () => {
    mockQueryRaw.mockResolvedValue([{ count: 1, window_end: new Date() }]);
    await cacheIncrement("k", 60_000);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });

  it("passes the key and ttlMs as interpolated parameters", async () => {
    mockQueryRaw.mockResolvedValue([{ count: 1, window_end: new Date() }]);
    await cacheIncrement("llm:regen-rl:user-42", 3_600_000);

    // Tagged-template call: [TemplateStringsArray, ...params].
    // The template interpolates ${key} once and ${ttlMs} twice (INSERT + UPDATE).
    const call = mockQueryRaw.mock.calls[0];
    expect(call[1]).toBe("llm:regen-rl:user-42");
    expect(call[2]).toBe(3_600_000);
    expect(call[3]).toBe(3_600_000);
  });
});

describe("cachePruneExpired", () => {
  beforeEach(() => {
    mockExecuteRaw.mockReset().mockResolvedValue(0);
  });

  it("executes exactly one DELETE statement", async () => {
    await cachePruneExpired();
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the DELETE removes zero rows", async () => {
    mockExecuteRaw.mockResolvedValue(0);
    await expect(cachePruneExpired()).resolves.toBeUndefined();
  });
});
