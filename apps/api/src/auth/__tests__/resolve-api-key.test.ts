/**
 * Truth-table for the MCP route's API-key resolver. The route is a raw Hono
 * endpoint (not tRPC), so this is the one gate between an x-api-key and a
 * workspace-scoped tool session — it must fail closed in every degraded case
 * and only surface a real backend error as a throw (never a silent null).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockVerifyApiKey, mockUserFindUnique, mockMemberFindFirst } =
  vi.hoisted(() => ({
    mockVerifyApiKey: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockMemberFindFirst: vi.fn(),
  }));

vi.mock("@/core/better-auth", () => ({
  auth: { api: { verifyApiKey: mockVerifyApiKey } },
}));

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    workspaceMember: { findFirst: mockMemberFindFirst },
  },
}));

import { resolveApiKeyAuth } from "@/auth/resolve-api-key";

const SCOPE = { workspaceId: "ws_1", mode: "read", v: 1 };
const VALID_KEY = {
  valid: true,
  key: { id: "k_1", referenceId: "u_1", metadata: SCOPE },
};

interface Arrange {
  verify: unknown;
  user: { id: string; isActive: boolean } | null;
  member: { id: string } | null;
}

function arrange({ verify, user, member }: Arrange): void {
  mockVerifyApiKey.mockResolvedValue(verify);
  mockUserFindUnique.mockResolvedValue(user);
  mockMemberFindFirst.mockResolvedValue(member);
}

describe("resolveApiKeyAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves userId + scope for a valid key with an active, member user", async () => {
    arrange({
      verify: VALID_KEY,
      user: { id: "u_1", isActive: true },
      member: { id: "m_1" },
    });
    await expect(resolveApiKeyAuth("k")).resolves.toEqual({
      userId: "u_1",
      scope: SCOPE,
      apiKeyId: "k_1",
    });
  });

  it("returns null for an invalid key", async () => {
    arrange({ verify: { valid: false, key: null }, user: null, member: null });
    await expect(resolveApiKeyAuth("k")).resolves.toBeNull();
  });

  it("returns null when the key metadata has no valid scope", async () => {
    arrange({
      verify: {
        valid: true,
        key: { referenceId: "u_1", metadata: { mode: "read" } },
      },
      user: { id: "u_1", isActive: true },
      member: { id: "m_1" },
    });
    await expect(resolveApiKeyAuth("k")).resolves.toBeNull();
  });

  it("returns null when the creating user no longer exists", async () => {
    arrange({ verify: VALID_KEY, user: null, member: null });
    await expect(resolveApiKeyAuth("k")).resolves.toBeNull();
  });

  it("returns null when the creating user is deactivated", async () => {
    arrange({
      verify: VALID_KEY,
      user: { id: "u_1", isActive: false },
      member: null,
    });
    await expect(resolveApiKeyAuth("k")).resolves.toBeNull();
  });

  it("returns null when the user is no longer a member of the scoped workspace", async () => {
    arrange({
      verify: VALID_KEY,
      user: { id: "u_1", isActive: true },
      member: null,
    });
    await expect(resolveApiKeyAuth("k")).resolves.toBeNull();
  });

  it("propagates a backend failure instead of swallowing it to null", async () => {
    mockVerifyApiKey.mockRejectedValue(new Error("db down"));
    await expect(resolveApiKeyAuth("k")).rejects.toThrow("db down");
  });
});
