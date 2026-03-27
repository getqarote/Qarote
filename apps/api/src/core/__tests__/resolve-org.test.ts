import { describe, expect, it, vi } from "vitest";

import { resolveCurrentOrganization } from "../resolve-org";

function makePrisma(
  overrides: {
    workspace?: unknown;
    membership?: unknown;
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
    },
  };
}

describe("resolveCurrentOrganization", () => {
  it("returns null when workspaceId is null", async () => {
    const prisma = makePrisma();
    const result = await resolveCurrentOrganization(prisma, "user-1", null);

    expect(result).toBeNull();
    expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
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

  it("returns null when user is not a member of the org", async () => {
    const prisma = makePrisma({ membership: null });
    const result = await resolveCurrentOrganization(prisma, "user-1", "ws-1");

    expect(result).toBeNull();
  });

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

  it("looks up membership with correct composite key", async () => {
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
    // User is in org-A and org-B. Workspace belongs to org-B.
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
    expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_organizationId: {
            userId: "user-1",
            organizationId: "org-B",
          },
        },
      })
    );
  });
});
