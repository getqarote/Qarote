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
const { cacheGet, cacheSet, cacheDeletePrefix, cachePruneExpired } =
  await import("@/core/cache");

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
