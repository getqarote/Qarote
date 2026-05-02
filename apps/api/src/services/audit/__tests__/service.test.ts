/**
 * Audit service tests — verifies the contract that:
 *   1. A successful write inserts the right shape (kind / actorUserId /
 *      serverId / payload).
 *   2. A failing write does NOT throw — failures are logged + swallowed
 *      so the audited action stays unaffected by audit-layer issues.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CapabilityRecheckPayload } from "@/services/audit";

const mockCreate = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: { auditLog: { create: mockCreate } },
}));

vi.mock("@/core/logger", () => ({
  logger: {
    error: mockLoggerError,
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const { recordCapabilityRecheck } = await import("@/services/audit");

const SAMPLE_PAYLOAD: CapabilityRecheckPayload = {
  success: true,
  changed: true,
  hadFirehoseBefore: false,
  hasFirehoseAfter: true,
};

beforeEach(() => {
  mockCreate.mockReset();
  mockLoggerError.mockReset();
});

describe("recordCapabilityRecheck", () => {
  it("inserts a CAPABILITY_RECHECK row with the actor + server + payload", async () => {
    mockCreate.mockResolvedValue({});
    await recordCapabilityRecheck("srv_1", "user_1", SAMPLE_PAYLOAD);

    expect(mockCreate).toHaveBeenCalledOnce();
    const arg = mockCreate.mock.calls[0]?.[0] as {
      data: {
        kind: string;
        actorUserId: string | null;
        serverId: string | null;
        payload: unknown;
      };
    };
    expect(arg.data.kind).toBe("CAPABILITY_RECHECK");
    expect(arg.data.actorUserId).toBe("user_1");
    expect(arg.data.serverId).toBe("srv_1");
    expect(arg.data.payload).toEqual(SAMPLE_PAYLOAD);
  });

  it("does NOT throw when the prisma insert fails — audit is best-effort", async () => {
    mockCreate.mockRejectedValue(new Error("connection lost"));
    await expect(
      recordCapabilityRecheck("srv_1", "user_1", SAMPLE_PAYLOAD)
    ).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledOnce();
  });
});
