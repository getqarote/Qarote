/**
 * Audit router tests — Phase B contract:
 *   - list: cursor pagination, filter combinations, workspace scoping
 *   - export: CSV shape, row cap, escaping
 *
 * The plan-gate (Enterprise-only DB writes) is exercised in
 * audit-log.service.test.ts — the read endpoints don't replicate it
 * (callers see whatever rows exist; non-Enterprise tenants have zero
 * rows because the writer no-ops).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: { auditLog: { findMany: mockFindMany, count: mockCount } },
}));

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Bypass the premium feature gate — tests exercise the handler with a
// hand-rolled ctx, no real feature evaluation needed.
vi.mock("@/services/feature-gate", async (importOriginal) => {
  const actual: object = await importOriginal();
  return {
    ...actual,
    requirePremiumFeature: () => async (opts: { next: () => unknown }) =>
      opts.next(),
  };
});

// Bypass workspace permission middleware for unit tests — we exercise
// the handler logic directly.
vi.mock("@/trpc/trpc", async (importOriginal) => {
  const actual: object = await importOriginal();
  return {
    ...actual,
    workspacePermissionProcedure: () => {
      // Use the bare protectedProcedure-equivalent — tests construct
      // ctx by hand.
      const t = (
        actual as {
          router: unknown;
          publicProcedure: { input: (s: unknown) => unknown };
        }
      ).publicProcedure;
      return t;
    },
  };
});

const { auditRouter } = await import("../audit");

const WS_ID = "00000000-0000-4000-8000-000000000001";
const ROW_1_ID = "00000000-0000-4000-8000-0000000000a1";
const ROW_2_ID = "00000000-0000-4000-8000-0000000000a2";

function makeCtx() {
  return {
    prisma: { auditLog: { findMany: mockFindMany, count: mockCount } },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: { id: "user-1", email: "u@test.com" },
    workspaceId: WS_ID,
    locale: "en",
    remoteIp: null,
    userAgent: null,
  };
}

beforeEach(() => {
  mockFindMany.mockReset();
  mockCount.mockReset();
  // Default: no rows / no denials. Tests override per case.
  mockCount.mockResolvedValue(0);
});

describe("audit.list", () => {
  it("returns rows with stable timestamps and a null cursor when fewer than `limit` rows exist", async () => {
    const now = new Date("2026-05-09T10:00:00Z");
    mockFindMany.mockResolvedValue([
      {
        id: ROW_1_ID,
        timestamp: now,
        actorId: "user-1",
        actorEmail: "u@test.com",
        source: "qarote",
        action: "rabbitmq.queue.purge",
        category: "rabbitmq",
        entityType: "queue",
        entityId: "q1",
        entityLabel: "q1@/",
        serverId: "srv-1",
        vhost: "/",
        ipAddress: null,
        userAgent: null,
        metadata: null,
      },
    ]);

    const caller = auditRouter.createCaller(makeCtx() as never);
    const result = await caller.list({ workspaceId: WS_ID, limit: 50 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].timestamp).toBe(now.toISOString());
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when results overflow the limit", async () => {
    const t1 = new Date("2026-05-09T10:00:00Z");
    const t2 = new Date("2026-05-09T09:00:00Z");
    mockFindMany.mockResolvedValue([
      {
        id: ROW_1_ID,
        timestamp: t1,
        actorId: null,
        actorEmail: null,
        source: "qarote",
        action: "x.y.z",
        category: "x",
        entityType: "y",
        entityId: null,
        entityLabel: null,
        serverId: null,
        vhost: null,
        ipAddress: null,
        userAgent: null,
        metadata: null,
      },
      {
        id: ROW_2_ID,
        timestamp: t2,
        actorId: null,
        actorEmail: null,
        source: "qarote",
        action: "x.y.z",
        category: "x",
        entityType: "y",
        entityId: null,
        entityLabel: null,
        serverId: null,
        vhost: null,
        ipAddress: null,
        userAgent: null,
        metadata: null,
      },
    ]);

    const caller = auditRouter.createCaller(makeCtx() as never);
    const result = await caller.list({ workspaceId: WS_ID, limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(ROW_1_ID);
    expect(result.nextCursor).toEqual({
      timestamp: t1.toISOString(),
      id: ROW_1_ID,
    });
  });

  it("returns total + denialCount for the UI count chips and tab badge", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount
      .mockResolvedValueOnce(42) // total
      .mockResolvedValueOnce(7); // denialCount

    const caller = auditRouter.createCaller(makeCtx() as never);
    const result = await caller.list({ workspaceId: WS_ID, limit: 50 });

    expect(result.total).toBe(42);
    expect(result.denialCount).toBe(7);
  });

  it("treats `actor` as actorId when value is a UUID, actorEmail icontains otherwise", async () => {
    mockFindMany.mockResolvedValue([]);

    // UUID input → exact match on actorId
    const caller = auditRouter.createCaller(makeCtx() as never);
    await caller.list({
      workspaceId: WS_ID,
      actor: "00000000-0000-4000-8000-0000000000aa",
      limit: 50,
    });
    const uuidArg = mockFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(uuidArg.where.actorId).toBe("00000000-0000-4000-8000-0000000000aa");
    expect(uuidArg.where.actorEmail).toBeUndefined();

    mockFindMany.mockClear();
    mockCount.mockReset();
    mockCount.mockResolvedValue(0);

    // Email-ish input → case-insensitive contains on actorEmail
    await caller.list({
      workspaceId: WS_ID,
      actor: "alice@",
      limit: 50,
    });
    const emailArg = mockFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(emailArg.where.actorEmail).toEqual({
      contains: "alice@",
      mode: "insensitive",
    });
    expect(emailArg.where.actorId).toBeUndefined();
  });

  it("scopes the where clause to ctx.workspaceId always (no cross-tenant)", async () => {
    mockFindMany.mockResolvedValue([]);
    const caller = auditRouter.createCaller(makeCtx() as never);
    await caller.list({
      workspaceId: WS_ID,
      category: "rabbitmq",
      source: "qarote" as const,
      limit: 50,
    });

    expect(mockFindMany).toHaveBeenCalledOnce();
    const arg = mockFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where.workspaceId).toBe(WS_ID);
    expect(arg.where.category).toBe("rabbitmq");
    expect(arg.where.source).toBe("qarote");
  });
});

describe("audit.export", () => {
  it("returns a CSV string with a header row and one row per result", async () => {
    mockFindMany.mockResolvedValue([
      {
        timestamp: new Date("2026-05-09T10:00:00Z"),
        source: "qarote",
        action: "rabbitmq.queue.purge",
        category: "rabbitmq",
        entityType: "queue",
        entityId: "orders",
        entityLabel: null,
        actorId: "user-1",
        actorEmail: "u@test.com",
        serverId: "srv-1",
        vhost: "/",
        ipAddress: null,
        userAgent: null,
        metadata: { foo: "bar" },
      },
    ]);

    const caller = auditRouter.createCaller(makeCtx() as never);
    const result = await caller.export({
      workspaceId: WS_ID,
      maxRows: 100,
    });

    expect(result.rowCount).toBe(1);
    expect(result.truncated).toBe(false);
    // CSV starts with UTF-8 BOM (Excel/Win10 detection) and uses CRLF
    // line endings (RFC 4180).
    expect(result.csv.charCodeAt(0)).toBe(0xfeff);
    const lines = result.csv.replace(/^\uFEFF/, "").split("\r\n");
    // header + 1 row + trailing CRLF → 3 split chunks (last is empty)
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      "timestamp,source,action,category,entityType,entityId,entityLabel,actorId,actorEmail,serverId,vhost,ipAddress,userAgent,metadata"
    );
    expect(lines[1]).toContain("rabbitmq.queue.purge");
    // Metadata gets JSON-stringified + the resulting `{"foo":"bar"}` is
    // CSV-escaped (contains a `"`). The cell must be quoted.
    expect(lines[1]).toContain('"{""foo"":""bar""}"');
  });

  it("flags `truncated: true` when more rows exist beyond maxRows", async () => {
    // Backend fetches maxRows+1 so it can distinguish "exactly maxRows"
    // from "more than maxRows". Test asserts the sentinel row triggers
    // truncated=true and the result is sliced down to maxRows.
    const rows = Array.from({ length: 6 }, (_, i) => ({
      timestamp: new Date(),
      source: "qarote" as const,
      action: "x.y.z",
      category: "x",
      entityType: "y",
      entityId: `id-${i}`,
      entityLabel: null,
      actorId: null,
      actorEmail: null,
      serverId: null,
      vhost: null,
      ipAddress: null,
      userAgent: null,
      metadata: null,
    }));
    mockFindMany.mockResolvedValue(rows);

    const caller = auditRouter.createCaller(makeCtx() as never);
    const result = await caller.export({ workspaceId: WS_ID, maxRows: 5 });

    expect(result.rowCount).toBe(5);
    expect(result.truncated).toBe(true);
  });

  it("does not flag truncated when result is exactly maxRows", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      timestamp: new Date(),
      source: "qarote" as const,
      action: "x.y.z",
      category: "x",
      entityType: "y",
      entityId: `id-${i}`,
      entityLabel: null,
      actorId: null,
      actorEmail: null,
      serverId: null,
      vhost: null,
      ipAddress: null,
      userAgent: null,
      metadata: null,
    }));
    mockFindMany.mockResolvedValue(rows);

    const caller = auditRouter.createCaller(makeCtx() as never);
    const result = await caller.export({ workspaceId: WS_ID, maxRows: 5 });

    expect(result.rowCount).toBe(5);
    expect(result.truncated).toBe(false);
  });
});

describe("audit.permissionsLastSet", () => {
  const SERVER_ID = "00000000-0000-4000-8000-0000000000b1";

  it("filters on action + metadata.username + serverId in the where clause", async () => {
    mockFindMany.mockResolvedValue([]);
    const caller = auditRouter.createCaller(makeCtx() as never);
    await caller.permissionsLastSet({
      workspaceId: WS_ID,
      serverId: SERVER_ID,
      rabbitmqUsername: "alice",
    });

    expect(mockFindMany).toHaveBeenCalledOnce();
    const arg = mockFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
      take: number;
    };
    expect(arg.where.workspaceId).toBe(WS_ID);
    expect(arg.where.serverId).toBe(SERVER_ID);
    expect(arg.where.action).toBe("rabbitmq.user.permissions.set");
    expect(arg.where.metadata).toEqual({
      path: ["username"],
      equals: "alice",
    });
    expect(arg.where.vhost).toEqual({ not: null });
    // (timestamp, id) composite sort + 500-row cap.
    expect(arg.orderBy).toEqual([{ timestamp: "desc" }, { id: "desc" }]);
    expect(arg.take).toBe(500);
  });

  it("dedupes by vhost — first row per vhost (newest) wins", async () => {
    // Rows ordered DESC; the first hit for each vhost is the "latest set".
    mockFindMany.mockResolvedValue([
      {
        id: "r1",
        vhost: "/",
        timestamp: new Date("2026-05-09T10:00:00Z"),
        actorEmail: "newer@host",
      },
      {
        id: "r2",
        vhost: "/",
        timestamp: new Date("2026-05-09T08:00:00Z"),
        actorEmail: "older@host",
      },
      {
        id: "r3",
        vhost: "prod",
        timestamp: new Date("2026-05-09T09:00:00Z"),
        actorEmail: "prod-actor@host",
      },
    ]);

    const caller = auditRouter.createCaller(makeCtx() as never);
    const result = await caller.permissionsLastSet({
      workspaceId: WS_ID,
      serverId: SERVER_ID,
      rabbitmqUsername: "alice",
    });

    expect(Object.keys(result.lastSet)).toHaveLength(2);
    // "/" → the newer row (r1) wins, the older one is shadowed.
    expect(result.lastSet["/"]).toEqual({
      timestamp: "2026-05-09T10:00:00.000Z",
      actorEmail: "newer@host",
    });
    expect(result.lastSet["prod"]).toEqual({
      timestamp: "2026-05-09T09:00:00.000Z",
      actorEmail: "prod-actor@host",
    });
  });

  it("returns an empty map when no rows match (Free / Developer plan)", async () => {
    mockFindMany.mockResolvedValue([]);
    const caller = auditRouter.createCaller(makeCtx() as never);
    const result = await caller.permissionsLastSet({
      workspaceId: WS_ID,
      serverId: SERVER_ID,
      rabbitmqUsername: "alice",
    });
    expect(result.lastSet).toEqual({});
  });
});
