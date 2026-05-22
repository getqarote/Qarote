/**
 * Bootstrap-admin invariant tests (Task #14, rbac.md §8)
 *
 * Guarantees:
 *  - The bootstrap user is created with WorkspaceRole.OWNER (not MEMBER)
 *  - The bootstrap path is skipped when users already exist (idempotency)
 *  - Incomplete credentials are cleaned up without bootstrapping
 */

import fs from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module-level mocks ───────────────────────────────────────────────────────

vi.mock("node:fs");

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/core/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

const mockEnsureWorkspaceMember = vi.fn().mockResolvedValue(undefined);
vi.mock("@/core/workspace-access", () => ({
  ensureWorkspaceMember: (...a: unknown[]) => mockEnsureWorkspaceMember(...a),
}));

// Config mock — override in individual tests via vi.mocked
vi.mock("@/config", () => ({
  adminBootstrapConfig: { email: "admin@example.com", password: "secret" },
  emailConfig: { frontendUrl: "http://localhost:3000" },
}));

// Prisma mock — individual tests override per-call mocks below
const mockTx = {
  user: {
    findFirst: vi.fn().mockResolvedValue(null), // no existing users by default
    create: vi
      .fn()
      .mockResolvedValue({ id: "admin-user-1", email: "admin@example.com" }),
  },
  organization: {
    create: vi
      .fn()
      .mockResolvedValue({ id: "org-1", name: "Default Organization" }),
  },
  workspace: {
    create: vi
      .fn()
      .mockResolvedValue({ id: "ws-1", name: "Default Workspace" }),
    update: vi.fn().mockResolvedValue({}),
  },
  organizationMember: {
    create: vi.fn().mockResolvedValue({}),
  },
  account: {
    create: vi.fn().mockResolvedValue({}),
  },
};

vi.mock("@/core/prisma", () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(mockTx)),
  },
}));

// Dynamic import after all mocks
const { bootstrapAdmin } = await import("../bootstrap-admin");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetTxMocks() {
  mockTx.user.findFirst.mockResolvedValue(null);
  mockTx.user.create.mockResolvedValue({
    id: "admin-user-1",
    email: "admin@example.com",
  });
  mockTx.organization.create.mockResolvedValue({ id: "org-1" });
  mockTx.workspace.create.mockResolvedValue({ id: "ws-1" });
  mockTx.workspace.update.mockResolvedValue({});
  mockTx.organizationMember.create.mockResolvedValue({});
  mockTx.account.create.mockResolvedValue({});
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("bootstrapAdmin — OWNER invariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTxMocks();
    // fs.existsSync returns false so .env removal is a no-op
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enrolls the bootstrap user as WorkspaceRole.OWNER (not MEMBER)", async () => {
    await bootstrapAdmin();

    expect(mockEnsureWorkspaceMember).toHaveBeenCalledOnce();
    const [, , role] = mockEnsureWorkspaceMember.mock.calls[0];
    expect(role).toBe("OWNER");
  });

  it("sets workspace.ownerId to the bootstrap user", async () => {
    await bootstrapAdmin();

    expect(mockTx.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ws-1" },
        data: expect.objectContaining({ ownerId: "admin-user-1" }),
      })
    );
  });

  it("skips the entire bootstrap when users already exist (idempotency guard)", async () => {
    mockTx.user.findFirst.mockResolvedValue({ id: "existing-user" });

    await bootstrapAdmin();

    expect(mockTx.user.create).not.toHaveBeenCalled();
    expect(mockEnsureWorkspaceMember).not.toHaveBeenCalled();
  });

  it("does not enroll as MEMBER or ADMIN — only OWNER is valid at bootstrap", async () => {
    await bootstrapAdmin();

    const [[, , role]] = mockEnsureWorkspaceMember.mock.calls;
    expect(role).not.toBe("MEMBER");
    expect(role).not.toBe("ADMIN");
    expect(role).not.toBe("READONLY");
  });
});

describe("bootstrapAdmin — credential guard", () => {
  // Snapshot the original config so afterEach can always restore it,
  // even if a test throws between the override and the inline restore.
  const configSnapshot = { email: "", password: "" };

  beforeEach(async () => {
    vi.clearAllMocks();
    resetTxMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const { adminBootstrapConfig } = await import("@/config");
    configSnapshot.email = adminBootstrapConfig.email ?? "";
    configSnapshot.password = adminBootstrapConfig.password ?? "";
  });

  afterEach(async () => {
    const { adminBootstrapConfig } = await import("@/config");
    (adminBootstrapConfig as { email: string; password: string }).email =
      configSnapshot.email;
    (adminBootstrapConfig as { email: string; password: string }).password =
      configSnapshot.password;
  });

  it("skips bootstrap when both email and password are absent", async () => {
    const { adminBootstrapConfig } = await import("@/config");
    (adminBootstrapConfig as { email: string; password: string }).email = "";
    (adminBootstrapConfig as { email: string; password: string }).password = "";

    await bootstrapAdmin();

    expect(mockEnsureWorkspaceMember).not.toHaveBeenCalled();
    // Confirm zero partial-bootstrap writes occurred.
    expect(mockTx.user.create).not.toHaveBeenCalled();
    expect(mockTx.organization.create).not.toHaveBeenCalled();
    expect(mockTx.workspace.create).not.toHaveBeenCalled();
    expect(mockTx.account.create).not.toHaveBeenCalled();
  });

  it("skips bootstrap when only email is set (partial credentials)", async () => {
    const { adminBootstrapConfig } = await import("@/config");
    (adminBootstrapConfig as { email: string; password: string }).password = "";

    await bootstrapAdmin();

    expect(mockEnsureWorkspaceMember).not.toHaveBeenCalled();
    expect(mockTx.user.create).not.toHaveBeenCalled();
    expect(mockTx.organization.create).not.toHaveBeenCalled();
    expect(mockTx.workspace.create).not.toHaveBeenCalled();
    expect(mockTx.account.create).not.toHaveBeenCalled();
  });
});
