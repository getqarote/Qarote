/**
 * Audit service tests — verifies the contract that:
 *   1. A successful capability-recheck insert produces the right new-shape
 *      row (action='system.capability.recheck', category='system',
 *      entityType='server', metadata=payload).
 *   2. A failing write does NOT throw — failures are logged + swallowed
 *      so the audited action stays unaffected by audit-layer issues.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CapabilityRecheckPayload } from "@/services/audit/types";

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

// Plan-gate: pretend the workspace is on Enterprise so the writer
// proceeds to the DB call. (Free / Developer is exercised in the
// audit-log.service.test.ts plan-gate test.)
vi.mock("@/services/plan/plan.service", () => ({
  getWorkspacePlan: vi.fn().mockResolvedValue("ENTERPRISE"),
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
  it("inserts the broader-shape row (action / category / entityType / metadata)", async () => {
    mockCreate.mockResolvedValue({});
    await recordCapabilityRecheck(
      "srv_1",
      { actorUserId: "user_1", workspaceId: "ws_1" },
      SAMPLE_PAYLOAD
    );

    expect(mockCreate).toHaveBeenCalledOnce();
    const arg = mockCreate.mock.calls[0]?.[0] as {
      data: {
        action: string;
        category: string;
        entityType: string;
        actorId: string | null;
        serverId: string | null;
        workspaceId: string | null;
        metadata: unknown;
      };
    };
    expect(arg.data.action).toBe("system.capability.recheck");
    expect(arg.data.category).toBe("system");
    expect(arg.data.entityType).toBe("server");
    expect(arg.data.actorId).toBe("user_1");
    expect(arg.data.serverId).toBe("srv_1");
    expect(arg.data.workspaceId).toBe("ws_1");
    expect(arg.data.metadata).toEqual(SAMPLE_PAYLOAD);
  });

  it("does NOT throw when the prisma insert fails — audit is best-effort", async () => {
    mockCreate.mockRejectedValue(new Error("connection lost"));
    await expect(
      recordCapabilityRecheck(
        "srv_1",
        { actorUserId: "user_1", workspaceId: "ws_1" },
        SAMPLE_PAYLOAD
      )
    ).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledOnce();
  });
});
