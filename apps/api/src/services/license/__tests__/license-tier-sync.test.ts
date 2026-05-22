/**
 * Unit tests for `syncWorkspaceLicenseTier` / `syncAllWorkspaceLicenseTiers`.
 *
 * Verifies:
 *   - First sync (previousTier=null) updates the column without audit
 *   - Same-tier sync is a no-op (no UPDATE, no audit)
 *   - Tier transition WITHIN paid plans (Developer↔Enterprise) writes an audit row
 *   - Free↔Developer transitions update silently (no rbac_advanced flip)
 *   - syncAll iterates all workspaces and counts changes
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockWorkspaceFindUnique,
  mockWorkspaceUpdate,
  mockWorkspaceFindMany,
  mockSubscriptionFindUnique,
} = vi.hoisted(() => ({
  mockWorkspaceFindUnique: vi.fn(),
  mockWorkspaceUpdate: vi.fn(),
  mockWorkspaceFindMany: vi.fn(),
  mockSubscriptionFindUnique: vi.fn(),
}));

const mockRecordAuditLog = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: mockWorkspaceFindUnique,
      update: mockWorkspaceUpdate,
      findMany: mockWorkspaceFindMany,
    },
    subscription: { findUnique: mockSubscriptionFindUnique },
  },
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/audit", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

import {
  syncAllWorkspaceLicenseTiers,
  syncWorkspaceLicenseTier,
} from "@/services/license/license-tier-sync.service";

import { UserPlan } from "@/generated/prisma/client";

const WS = "ws-1";
const ORG = "org-1";

beforeEach(() => {
  mockWorkspaceFindUnique.mockReset();
  mockWorkspaceUpdate.mockReset();
  mockWorkspaceFindMany.mockReset();
  mockSubscriptionFindUnique.mockReset();
  mockRecordAuditLog.mockReset();
  mockRecordAuditLog.mockResolvedValue(undefined);
});

describe("syncWorkspaceLicenseTier", () => {
  it("no-ops when canonical tier matches denormalized column", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: WS,
      organizationId: ORG,
      licenseTier: UserPlan.ENTERPRISE,
    });
    mockSubscriptionFindUnique.mockResolvedValue({ plan: UserPlan.ENTERPRISE });

    const result = await syncWorkspaceLicenseTier(WS);

    expect(result?.changed).toBe(false);
    expect(mockWorkspaceUpdate).not.toHaveBeenCalled();
    expect(mockRecordAuditLog).not.toHaveBeenCalled();
  });

  it("first sync (licenseTier=null) writes column but does NOT emit audit", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: WS,
      organizationId: ORG,
      licenseTier: null,
    });
    mockSubscriptionFindUnique.mockResolvedValue({ plan: UserPlan.ENTERPRISE });

    const result = await syncWorkspaceLicenseTier(WS);

    expect(result?.changed).toBe(true);
    expect(result?.previousTier).toBeNull();
    expect(result?.newTier).toBe(UserPlan.ENTERPRISE);
    expect(mockWorkspaceUpdate).toHaveBeenCalledOnce();
    // No audit for backfill-by-cron — only user-initiated flips emit.
    expect(mockRecordAuditLog).not.toHaveBeenCalled();
  });

  it("Enterprise→Developer downgrade emits rbac_advanced.deactivated", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: WS,
      organizationId: ORG,
      licenseTier: UserPlan.ENTERPRISE,
    });
    mockSubscriptionFindUnique.mockResolvedValue({ plan: UserPlan.DEVELOPER });

    await syncWorkspaceLicenseTier(WS);

    expect(mockRecordAuditLog).toHaveBeenCalledOnce();
    const auditArg = mockRecordAuditLog.mock.calls[0]?.[0];
    expect(auditArg.action).toBe("license.rbac_advanced.deactivated");
    expect(auditArg.category).toBe("license");
    expect(auditArg.entityId).toBe(WS);
    expect(auditArg.organizationId).toBe(ORG);
  });

  it("Developer→Enterprise upgrade emits rbac_advanced.activated", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: WS,
      organizationId: ORG,
      licenseTier: UserPlan.DEVELOPER,
    });
    mockSubscriptionFindUnique.mockResolvedValue({ plan: UserPlan.ENTERPRISE });

    await syncWorkspaceLicenseTier(WS);

    expect(mockRecordAuditLog).toHaveBeenCalledOnce();
    const auditArg = mockRecordAuditLog.mock.calls[0]?.[0];
    expect(auditArg.action).toBe("license.rbac_advanced.activated");
  });

  it("Free→Developer transition updates silently (no Enterprise crossing)", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: WS,
      organizationId: ORG,
      licenseTier: UserPlan.FREE,
    });
    mockSubscriptionFindUnique.mockResolvedValue({ plan: UserPlan.DEVELOPER });

    await syncWorkspaceLicenseTier(WS);

    expect(mockWorkspaceUpdate).toHaveBeenCalledOnce();
    expect(mockRecordAuditLog).not.toHaveBeenCalled();
  });

  it("returns null when workspace not found", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(null);
    const result = await syncWorkspaceLicenseTier(WS);
    expect(result).toBeNull();
  });

  it("falls back to FREE when no subscription exists", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: WS,
      organizationId: ORG,
      licenseTier: null,
    });
    mockSubscriptionFindUnique.mockResolvedValue(null);

    const result = await syncWorkspaceLicenseTier(WS);
    expect(result?.newTier).toBe(UserPlan.FREE);
  });
});

describe("syncAllWorkspaceLicenseTiers", () => {
  it("iterates all workspaces and counts changes", async () => {
    mockWorkspaceFindMany.mockResolvedValue([
      { id: "ws-a" },
      { id: "ws-b" },
      { id: "ws-c" },
    ]);
    // ws-a stale, ws-b in-sync, ws-c stale
    mockWorkspaceFindUnique
      .mockResolvedValueOnce({
        id: "ws-a",
        organizationId: ORG,
        licenseTier: UserPlan.FREE,
      })
      .mockResolvedValueOnce({
        id: "ws-b",
        organizationId: ORG,
        licenseTier: UserPlan.ENTERPRISE,
      })
      .mockResolvedValueOnce({
        id: "ws-c",
        organizationId: ORG,
        licenseTier: null,
      });
    mockSubscriptionFindUnique
      .mockResolvedValueOnce({ plan: UserPlan.ENTERPRISE })
      .mockResolvedValueOnce({ plan: UserPlan.ENTERPRISE })
      .mockResolvedValueOnce({ plan: UserPlan.ENTERPRISE });

    const summary = await syncAllWorkspaceLicenseTiers();

    expect(summary.total).toBe(3);
    expect(summary.changed).toBe(2);
  });
});
