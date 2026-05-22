/**
 * Auto-seed of `WorkspaceLlmConfig` on workspace creation.
 *
 * The create mutation provisions a `WorkspaceLlmConfig` row with
 * provider=MANAGED when *both* the platform offers managed LLM
 * (`managedLlmConfig.enabled`, derived from MANAGED_LLM_ENABLED +
 * MANAGED_LLM_API_KEY env vars) and the AI Explain feature is part of
 * the licensed/cloud surface (`isFeatureEnabled(AI_EXPLAIN_INLINE)`).
 *
 * These tests pin down the gate: false on either side ⇒ no row.
 */

import DataLoader from "dataloader";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { permissionsForRole } from "@/auth/permissions";
import type { WorkspaceRole } from "@/generated/prisma/client";

// --- Mutable mock state ---------------------------------------------------
// Object identity is preserved so a `import { managedLlmConfig } from "@/config"`
// in the module under test sees subsequent mutations.
const managedLlmConfigMock = { enabled: false, apiKey: null as string | null };

// --- Mocks ----------------------------------------------------------------

const mockTransaction = vi.fn();
const mockOrgFindFirst = vi.fn();
const mockWorkspaceFindFirst = vi.fn();
const mockWorkspaceLlmConfigCreate = vi.fn().mockResolvedValue({});
const mockTrackEvent = vi.fn();
const mockIsFeatureEnabled = vi.fn().mockResolvedValue(true);
const mockRecordFromContext = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    organization: { findFirst: (...a: unknown[]) => mockOrgFindFirst(...a) },
    workspace: { findFirst: (...a: unknown[]) => mockWorkspaceFindFirst(...a) },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

vi.mock("@/config", () => ({
  managedLlmConfig: managedLlmConfigMock,
}));

vi.mock("@/config/features", () => ({
  FEATURES: { AI_EXPLAIN_INLINE: "ai_explain_inline" } as const,
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/config/deployment", () => ({
  isSelfHostedMode: () => false,
  isCloudMode: () => true,
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/trpc/middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/services/plan/plan.service", () => ({
  getOrgPlan: vi.fn().mockResolvedValue("DEVELOPER"),
  getOrgResourceCounts: vi
    .fn()
    .mockResolvedValue({ workspaces: 0, servers: 0 }),
  getPlanFeatures: vi.fn().mockReturnValue({ maxWorkspaces: 3 }),
  validateWorkspaceCreation: vi.fn(),
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/services/feature-gate/license", () => ({
  isFeatureEnabled: (...a: unknown[]) => mockIsFeatureEnabled(...a),
  getLicensePayload: vi.fn(),
  invalidateLicenseCache: vi.fn(),
}));

vi.mock("@/services/posthog", () => ({
  trackEvent: (...a: unknown[]) => mockTrackEvent(...a),
}));

vi.mock("@/services/audit", () => ({
  recordFromContext: (...a: unknown[]) => mockRecordFromContext(...a),
}));

vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: vi.fn().mockResolvedValue(undefined),
  getUserWorkspaceRole: vi.fn().mockResolvedValue("ADMIN"),
}));

// Import after mocks
const { managementRouter } = await import("../management");

// --- Helpers --------------------------------------------------------------

function makeFakePermissionsLoader(role: WorkspaceRole) {
  return new DataLoader<string, unknown>(async (ids) =>
    ids.map(() => ({
      kind: "builtin" as const,
      role,
      permissions: new Set(permissionsForRole(role)),
    }))
  );
}

function makeCtx() {
  return {
    prisma: {
      organization: { findFirst: mockOrgFindFirst },
      workspace: { findFirst: mockWorkspaceFindFirst },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "ADMIN",
      isActive: true,
      email: "user-1@test.com",
      firstName: "Test",
      // Pre-existing workspaceId so the create flow takes the "additional
      // workspace" branch (skips user.update); keeps the test minimal.
      workspaceId: "ws-existing",
    },
    locale: "en",
    resolveOrg: vi
      .fn()
      .mockResolvedValue({ organizationId: "org-1", role: "OWNER" }),
    req: {},
    effectivePermissionsLoader: makeFakePermissionsLoader(
      "ADMIN" as WorkspaceRole
    ),
  };
}

interface TxMocks {
  workspaceCreate: ReturnType<typeof vi.fn>;
  workspaceLlmConfigCreate: ReturnType<typeof vi.fn>;
  userUpdate: ReturnType<typeof vi.fn>;
}

function setupTransaction(): TxMocks {
  const workspaceCreate = vi.fn().mockResolvedValue({
    id: "ws-new",
    name: "Fresh Workspace",
    contactEmail: "user-1@test.com",
    ownerId: "user-1",
    organizationId: "org-1",
    tags: [],
    createdAt: new Date("2026-05-13T09:00:00Z"),
    updatedAt: new Date("2026-05-13T09:00:00Z"),
    _count: { members: 1, servers: 0 },
  });
  const userUpdate = vi.fn().mockResolvedValue({});

  // Re-bind the module-level mock to delegate to the per-test mock — this
  // lets us assert on `mockWorkspaceLlmConfigCreate` across tests without
  // re-wiring the vi.mock.
  mockTransaction.mockImplementation(
    async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        workspace: { create: workspaceCreate },
        workspaceLlmConfig: { create: mockWorkspaceLlmConfigCreate },
        user: { update: userUpdate },
      });
    }
  );

  return {
    workspaceCreate,
    workspaceLlmConfigCreate: mockWorkspaceLlmConfigCreate,
    userUpdate,
  };
}

// --- Tests ----------------------------------------------------------------

describe("managementRouter.create — WorkspaceLlmConfig auto-seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    managedLlmConfigMock.enabled = false;
    managedLlmConfigMock.apiKey = null;
    mockOrgFindFirst.mockResolvedValue({ id: "org-1" });
    mockWorkspaceFindFirst.mockResolvedValue(null);
  });

  it("does NOT seed a row when managedLlmConfig.enabled is false", async () => {
    managedLlmConfigMock.enabled = false;
    mockIsFeatureEnabled.mockResolvedValue(true);
    const tx = setupTransaction();

    const caller = managementRouter.createCaller(makeCtx() as never);
    await caller.create({ name: "Fresh Workspace" });

    expect(tx.workspaceCreate).toHaveBeenCalledTimes(1);
    expect(tx.workspaceLlmConfigCreate).not.toHaveBeenCalled();
  });

  it("does NOT seed a row when isFeatureEnabled(AI_EXPLAIN_INLINE) returns false", async () => {
    managedLlmConfigMock.enabled = true;
    managedLlmConfigMock.apiKey = "test-anthropic-key";
    mockIsFeatureEnabled.mockResolvedValue(false);
    const tx = setupTransaction();

    const caller = managementRouter.createCaller(makeCtx() as never);
    await caller.create({ name: "Fresh Workspace" });

    expect(tx.workspaceCreate).toHaveBeenCalledTimes(1);
    expect(tx.workspaceLlmConfigCreate).not.toHaveBeenCalled();
  });

  it("seeds provider=MANAGED, enabled=true (system-created, no updatedById) when both gates pass", async () => {
    managedLlmConfigMock.enabled = true;
    managedLlmConfigMock.apiKey = "test-anthropic-key";
    mockIsFeatureEnabled.mockResolvedValue(true);
    const tx = setupTransaction();

    const caller = managementRouter.createCaller(makeCtx() as never);
    await caller.create({ name: "Fresh Workspace" });

    expect(tx.workspaceCreate).toHaveBeenCalledTimes(1);
    expect(tx.workspaceLlmConfigCreate).toHaveBeenCalledTimes(1);

    const seedCall = tx.workspaceLlmConfigCreate.mock.calls[0][0];
    expect(seedCall).toEqual({
      data: {
        workspaceId: "ws-new",
        provider: "MANAGED",
        enabled: true,
      },
    });
    // System-created row: updatedById intentionally absent so the column
    // stays null until a real user overwrites it via Settings → LLM.
    expect(seedCall.data).not.toHaveProperty("updatedById");
  });

  it("tracks the seed decision on the workspace_created PostHog event", async () => {
    managedLlmConfigMock.enabled = true;
    managedLlmConfigMock.apiKey = "test-anthropic-key";
    mockIsFeatureEnabled.mockResolvedValue(true);
    setupTransaction();

    const caller = managementRouter.createCaller(makeCtx() as never);
    await caller.create({ name: "Fresh Workspace" });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.anything(),
      "workspace_created",
      expect.objectContaining({ llm_auto_seeded: true })
    );
  });

  it("tracks llm_auto_seeded: false when both gates fail", async () => {
    managedLlmConfigMock.enabled = false;
    mockIsFeatureEnabled.mockResolvedValue(false);
    const tx = setupTransaction();

    const caller = managementRouter.createCaller(makeCtx() as never);
    await caller.create({ name: "Fresh Workspace" });

    expect(tx.workspaceCreate).toHaveBeenCalledTimes(1);
    expect(tx.workspaceLlmConfigCreate).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.anything(),
      "workspace_created",
      expect.objectContaining({ llm_auto_seeded: false })
    );
  });
});
