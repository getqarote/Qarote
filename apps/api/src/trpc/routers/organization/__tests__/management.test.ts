import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Context } from "@/trpc/context";

vi.mock("@/trpc/middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/services/plan/plan.service", () => ({
  getOrgPlan: vi.fn().mockResolvedValue("ENTERPRISE"),
  UserPlan: { FREE: "FREE", DEVELOPER: "DEVELOPER", ENTERPRISE: "ENTERPRISE" },
  PlanValidationError: class extends Error {},
  PlanLimitExceededError: class extends Error {},
}));

vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

const mockDeleteOrgCascade = vi.fn();
class MockSubscriptionCancelFailedError extends Error {}
vi.mock("@/services/organization/org-deletion.service", () => ({
  deleteOrganizationCascade: (...a: unknown[]) => mockDeleteOrgCascade(...a),
  SubscriptionCancelFailedError: MockSubscriptionCancelFailedError,
}));

const { managementRouter } = await import("../management");

const mockOrgFindUnique = vi.fn();
const mockOrgUpdate = vi.fn();
const mockOrgMemberFindMany = vi.fn();

function makeCtx(overrides: Partial<Context> = {}): Context {
  return {
    prisma: {
      organization: {
        findUnique: mockOrgFindUnique,
        update: mockOrgUpdate,
      },
      organizationMember: {
        findMany: mockOrgMemberFindMany,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "test@test.com",
      role: "ADMIN",
      isActive: true,
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    organizationId: "org-1",
    orgRole: "ADMIN",
    resolveOrg: vi.fn().mockResolvedValue({
      organizationId: "org-1",
      role: "ADMIN",
    }),
    locale: "en",
    ...overrides,
  } as Context;
}

const mockOrg = {
  id: "org-1",
  name: "Acme Corp",
  slug: "acme-corp",
  contactEmail: "contact@acme.com",
  logoUrl: null,
  createdAt: new Date("2024-01-01"),
  _count: { members: 5, workspaces: 2 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("managementRouter", () => {
  describe("getCurrent", () => {
    it("throws BAD_REQUEST when resolveOrg returns null", async () => {
      const caller = managementRouter.createCaller(
        makeCtx({
          resolveOrg: vi.fn().mockResolvedValue(null),
        })
      );

      await expect(caller.getCurrent()).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(mockOrgFindUnique).not.toHaveBeenCalled();
    });

    it("returns org data using ctx.organizationId", async () => {
      mockOrgFindUnique.mockResolvedValue(mockOrg);

      const caller = managementRouter.createCaller(makeCtx());
      const result = await caller.getCurrent();

      expect(mockOrgFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "org-1" },
        })
      );
      expect(result?.organization.name).toBe("Acme Corp");
      expect(result?.role).toBe("ADMIN");
    });

    it("uses correct org for multi-org user based on ctx", async () => {
      mockOrgFindUnique.mockResolvedValue({
        ...mockOrg,
        id: "org-B",
        name: "Startup XYZ",
      });

      const caller = managementRouter.createCaller(
        makeCtx({
          organizationId: "org-B",
          orgRole: "MEMBER",
          resolveOrg: vi.fn().mockResolvedValue({
            organizationId: "org-B",
            role: "MEMBER",
          }),
        })
      );
      const result = await caller.getCurrent();

      expect(mockOrgFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "org-B" },
        })
      );
      expect(result?.organization.name).toBe("Startup XYZ");
      expect(result?.role).toBe("MEMBER");
    });
  });

  describe("update", () => {
    it("throws BAD_REQUEST when resolveOrg returns null", async () => {
      const caller = managementRouter.createCaller(
        makeCtx({
          resolveOrg: vi.fn().mockResolvedValue(null),
        })
      );

      await expect(caller.update({ name: "New Name" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("throws FORBIDDEN when orgRole is MEMBER", async () => {
      const caller = managementRouter.createCaller(
        makeCtx({
          orgRole: "MEMBER",
          resolveOrg: vi.fn().mockResolvedValue({
            organizationId: "org-1",
            role: "MEMBER",
          }),
        })
      );

      await expect(caller.update({ name: "New Name" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("updates the correct org using ctx.organizationId", async () => {
      mockOrgUpdate.mockResolvedValue(mockOrg);

      const caller = managementRouter.createCaller(makeCtx());
      await caller.update({ name: "New Acme" });

      expect(mockOrgUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "org-1" },
          data: expect.objectContaining({ name: "New Acme" }),
        })
      );
    });

    it("allows OWNER to update", async () => {
      mockOrgUpdate.mockResolvedValue(mockOrg);

      const caller = managementRouter.createCaller(
        makeCtx({
          orgRole: "OWNER",
          resolveOrg: vi.fn().mockResolvedValue({
            organizationId: "org-1",
            role: "OWNER",
          }),
        })
      );
      const result = await caller.update({ name: "Owner Update" });

      expect(result.organization.name).toBe("Acme Corp");
    });

    it("passes the slug through to the update", async () => {
      mockOrgUpdate.mockResolvedValue(mockOrg);

      const caller = managementRouter.createCaller(makeCtx());
      await caller.update({ slug: "new-slug" });

      expect(mockOrgUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "new-slug" }),
        })
      );
    });

    it("maps a unique-slug collision (P2002) to CONFLICT", async () => {
      mockOrgUpdate.mockRejectedValue(
        Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
      );

      const caller = managementRouter.createCaller(makeCtx());
      await expect(caller.update({ slug: "taken-slug" })).rejects.toMatchObject(
        { code: "CONFLICT" }
      );
    });
  });

  describe("getBillingInfo", () => {
    it("throws BAD_REQUEST when resolveOrg returns null", async () => {
      const caller = managementRouter.createCaller(
        makeCtx({
          resolveOrg: vi.fn().mockResolvedValue(null),
        })
      );

      await expect(caller.getBillingInfo()).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("throws FORBIDDEN when orgRole is MEMBER", async () => {
      const caller = managementRouter.createCaller(
        makeCtx({
          orgRole: "MEMBER",
          resolveOrg: vi.fn().mockResolvedValue({
            organizationId: "org-1",
            role: "MEMBER",
          }),
        })
      );

      await expect(caller.getBillingInfo()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("queries correct org for billing info", async () => {
      mockOrgFindUnique.mockResolvedValue({
        ...mockOrg,
        stripeCustomerId: "cus_123",
        subscription: null,
      });

      const caller = managementRouter.createCaller(makeCtx());
      const result = await caller.getBillingInfo();

      expect(mockOrgFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "org-1" },
        })
      );
      expect(result?.organizationId).toBe("org-1");
    });
  });

  describe("delete", () => {
    const ownerCtx = () =>
      makeCtx({
        orgRole: "OWNER",
        resolveOrg: vi
          .fn()
          .mockResolvedValue({ organizationId: "org-1", role: "OWNER" }),
      });

    it("throws FORBIDDEN when the caller is ADMIN, not OWNER", async () => {
      const caller = managementRouter.createCaller(
        makeCtx({ orgRole: "ADMIN" })
      );
      await expect(
        caller.delete({ confirmation: "acme-corp" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mockDeleteOrgCascade).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND when the org does not exist", async () => {
      mockOrgFindUnique.mockResolvedValue(null);
      const caller = managementRouter.createCaller(ownerCtx());
      await expect(
        caller.delete({ confirmation: "acme-corp" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(mockDeleteOrgCascade).not.toHaveBeenCalled();
    });

    it("throws BAD_REQUEST when the confirmation does not match the slug", async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: "org-1",
        name: "Acme Corp",
        slug: "acme-corp",
      });
      const caller = managementRouter.createCaller(ownerCtx());
      await expect(
        caller.delete({ confirmation: "wrong" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(mockDeleteOrgCascade).not.toHaveBeenCalled();
    });

    it("deletes when OWNER + confirmation matches the slug", async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: "org-1",
        name: "Acme Corp",
        slug: "acme-corp",
      });
      mockDeleteOrgCascade.mockResolvedValue(undefined);

      const caller = managementRouter.createCaller(ownerCtx());
      // Whitespace around the confirmation is trimmed.
      const res = await caller.delete({ confirmation: "  acme-corp  " });

      expect(res).toEqual({ success: true });
      expect(mockDeleteOrgCascade).toHaveBeenCalledWith("org-1");
    });

    it("maps a subscription-cancel failure to INTERNAL_SERVER_ERROR", async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: "org-1",
        name: "Acme Corp",
        slug: "acme-corp",
      });
      mockDeleteOrgCascade.mockRejectedValue(
        new MockSubscriptionCancelFailedError("org-1")
      );

      const caller = managementRouter.createCaller(ownerCtx());
      await expect(
        caller.delete({ confirmation: "acme-corp" })
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    });
  });

  describe("listMyOrganizations", () => {
    it("returns all orgs the user belongs to", async () => {
      mockOrgMemberFindMany.mockResolvedValue([
        {
          role: "OWNER",
          createdAt: new Date(),
          organization: {
            id: "org-1",
            name: "Acme Corp",
            slug: "acme-corp",
            _count: { workspaces: 2 },
          },
        },
        {
          role: "MEMBER",
          createdAt: new Date(),
          organization: {
            id: "org-2",
            name: "Startup XYZ",
            slug: "startup-xyz",
            _count: { workspaces: 1 },
          },
        },
      ]);

      const caller = managementRouter.createCaller(makeCtx());
      const result = await caller.listMyOrganizations();

      // Verify query is scoped to the authenticated user
      expect(mockOrgMemberFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1" }),
        })
      );

      expect(result.organizations).toHaveLength(2);
      expect(result.organizations[0]).toEqual({
        id: "org-1",
        name: "Acme Corp",
        slug: "acme-corp",
        role: "OWNER",
        workspaceCount: 2,
      });
      expect(result.organizations[1].role).toBe("MEMBER");
    });
  });
});
