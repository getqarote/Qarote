/**
 * audit-log.service tests — pin the plan-gate contract:
 *   - DB write happens on Enterprise
 *   - DB write is suppressed on Developer / Free
 *   - DB write is suppressed when no workspaceId
 *   - Pino mirror runs in all three cases
 *   - Errors are swallowed (best-effort)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();
const mockGetWorkspacePlan = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: { auditLog: { create: mockCreate } },
}));

vi.mock("@/core/logger", () => ({
  logger: {
    error: mockLoggerError,
    info: mockLoggerInfo,
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/services/plan/plan.service", () => ({
  getWorkspacePlan: mockGetWorkspacePlan,
}));

const { recordAuditLog } = await import("../audit-log.service");

beforeEach(() => {
  mockCreate.mockReset();
  mockLoggerInfo.mockReset();
  mockLoggerError.mockReset();
  mockGetWorkspacePlan.mockReset();
});

const baseEntry = {
  actorId: "user_1",
  action: "rabbitmq.queue.purge",
  category: "rabbitmq",
  entityType: "queue",
  entityId: "queue_a",
  workspaceId: "ws_1",
};

describe("recordAuditLog plan gate", () => {
  it("writes to the DB on ENTERPRISE workspaces", async () => {
    mockGetWorkspacePlan.mockResolvedValue("ENTERPRISE");
    mockCreate.mockResolvedValue({});

    await recordAuditLog(baseEntry);

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockLoggerInfo).toHaveBeenCalledOnce();
  });

  it("no-ops the DB write on DEVELOPER plan", async () => {
    mockGetWorkspacePlan.mockResolvedValue("DEVELOPER");

    await recordAuditLog(baseEntry);

    expect(mockCreate).not.toHaveBeenCalled();
    // Pino mirror still runs.
    expect(mockLoggerInfo).toHaveBeenCalledOnce();
  });

  it("no-ops the DB write on FREE plan", async () => {
    mockGetWorkspacePlan.mockResolvedValue("FREE");

    await recordAuditLog(baseEntry);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledOnce();
  });

  it("no-ops the DB write when workspaceId is null (no tenant to bill)", async () => {
    await recordAuditLog({ ...baseEntry, workspaceId: null });

    expect(mockGetWorkspacePlan).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledOnce();
  });
});

describe("recordAuditLog best-effort", () => {
  it("does NOT throw when the prisma insert fails", async () => {
    mockGetWorkspacePlan.mockResolvedValue("ENTERPRISE");
    mockCreate.mockRejectedValue(new Error("connection lost"));

    await expect(recordAuditLog(baseEntry)).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledOnce();
  });
});
