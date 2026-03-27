import { describe, expect, it, vi } from "vitest";

import { resolveCurrentOrganization } from "../resolve-org";

function makePrisma(
  overrides: {
    workspace?: unknown;
    membership?: unknown;
    firstMembership?: unknown;
  } = {}
) {
  return {
    workspace: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides.workspace !== undefined
            ? overrides.workspace
            : { organizationId: "org-1" }
        ),
    },
    organizationMember: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides.membership !== undefined
            ? overrides.membership
            : { organizationId: "org-1", role: "ADMIN" }
        ),
      findFirst: vi
        .fn()
        .mockResolvedValue(
          overrides.firstMembership !== undefined
            ? overrides.firstMembership
            : { organizationId: "org-1", role: "OWNER" }
        ),
    },
  };
}

describe("resolveCurrentOrganization", () => {
  describe("with workspaceId (normal flow)", () => {
    it("returns organizationId and role for valid membership", async () => {
      const prisma = makePrisma();
      const result = await resolveCurrentOrganization(prisma, "user-1", "ws-1");

      expect(result).toEqual({ organizationId: "org-1", role: "ADMIN" });
    });

    it("looks up workspace by the provided workspaceId", async () => {
      const prisma = makePrisma();
      await resolveCurrentOrganization(prisma, "user-1", "ws-42");

      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: "ws-42" },
        select: { organizationId: true },
      });
    });

    it("returns null when workspace is not found", async () => {
      const prisma = makePrisma({ workspace: null });
      const result = await resolveCurrentOrganization(prisma, "user-1", "ws-1");

      expect(result).toBeNull();
      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it("returns null when workspace has no organizationId", async () => {
      const prisma = makePrisma({ workspace: { organizationId: null } });
      const result = await resolveCurrentOrganization(prisma, "user-1", "ws-1");

      expect(result).toBeNull();
      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it("returns null when user is not a member of the workspace org", async () => {
      const prisma = makePrisma({ membership: null });
      const result = await resolveCurrentOrganization(prisma, "user-1", "ws-1");

      expect(result).toBeNull();
    });

    it("uses composite key for scoped membership lookup", async () => {
      const prisma = makePrisma({
        workspace: { organizationId: "org-99" },
        membership: { organizationId: "org-99", role: "MEMBER" },
      });
      const result = await resolveCurrentOrganization(prisma, "user-5", "ws-1");

      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: "user-5",
            organizationId: "org-99",
          },
        },
        select: { organizationId: true, role: true },
      });
      expect(result).toEqual({ organizationId: "org-99", role: "MEMBER" });
    });

    it("resolves correct org for multi-org user based on workspace", async () => {
      const prisma = makePrisma({
        workspace: { organizationId: "org-B" },
        membership: { organizationId: "org-B", role: "OWNER" },
      });

      const result = await resolveCurrentOrganization(
        prisma,
        "user-1",
        "ws-in-org-B"
      );

      expect(result).toEqual({ organizationId: "org-B", role: "OWNER" });
      expect(prisma.organizationMember.findFirst).not.toHaveBeenCalled();
    });

    it("does not use findFirst fallback when workspaceId is provided", async () => {
      const prisma = makePrisma();
      await resolveCurrentOrganization(prisma, "user-1", "ws-1");

      expect(prisma.organizationMember.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("without workspaceId (onboarding fallback)", () => {
    it("falls back to findFirst when workspaceId is null", async () => {
      const prisma = makePrisma({
        firstMembership: { organizationId: "org-1", role: "OWNER" },
      });
      const result = await resolveCurrentOrganization(prisma, "user-1", null);

      expect(result).toEqual({ organizationId: "org-1", role: "OWNER" });
      expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: { organizationId: true, role: true },
      });
    });

    it("returns null when user has no org membership and no workspace", async () => {
      const prisma = makePrisma({ firstMembership: null });
      const result = await resolveCurrentOrganization(prisma, "user-1", null);

      expect(result).toBeNull();
    });

    it("does not look up workspace when workspaceId is null", async () => {
      const prisma = makePrisma();
      await resolveCurrentOrganization(prisma, "user-1", null);

      expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
    });
  });
});
